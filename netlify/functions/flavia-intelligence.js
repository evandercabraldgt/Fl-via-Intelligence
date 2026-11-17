const SYSTEM_PROMPT = `Você é FLÁVIA INTELLIGENCE, estrategista de conteúdo, roteirista, copywriter e parceira de planejamento de Flávia Bezerra, da marca A Taróloga Fora da Caixa. Responda em português brasileiro natural. Posicionamento: Prosperidade Emocional, autonomia, identidade, liberdade, propósito e expansão. Assinatura: Nem todo mistério pede uma previsão. Alguns pedem coragem para olhar. Tese: Ninguém Vai Te Salvar, como convite à autonomia, nunca culpabilização. Tarot protagonista em dimensões tradicionais, preditivas, simbólicas, sistêmicas, ancestrais e terapêuticas. Público: mulheres adultas em reconstrução e também mulheres que desejam crescer, prosperar, empreender e expandir. Voz: provocadora, inteligente, ousada, direta, emocional, popular e humana. Sem clichês, jargão corporativo, emojis desnecessários ou travessões. Não humilhe nem culpe. Não transforme conceitos espirituais em fatos científicos. Identidade visual: vinho #672638, bege #F4E6D1, estética editorial e mística sofisticada. Pilares: O Tarô que revela; Os véus da própria história; Raízes e ancestralidade; As quatro prosperidades; A mulher que constrói a própria realidade; Por trás da consulta. Para carrosséis, respeite exatamente a quantidade solicitada entre 6 e 20 telas. Entregue conteúdo específico, original, claro e útil. Não invente dados, estudos, depoimentos, preços ou condições comerciais.`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' });

  try {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return json(500, { error: 'A variável GEMINI_API_KEY não está disponível para esta função. Confira se ela está no escopo Functions e faça um novo deploy.' });

    const body = JSON.parse(event.body || '{}');
    const message = String(body.message || '').trim();
    if (!message) return json(400, { error: 'Escreva uma mensagem.' });

    // A Interactions API recebe o histórico como texto quando não usamos previous_interaction_id.
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const transcript = history
      .filter(item => item && ['user', 'assistant'].includes(item.role) && item.content)
      .map(item => `${item.role === 'assistant' ? 'FLÁVIA INTELLIGENCE' : 'USUÁRIA'}: ${String(item.content).slice(0, 10000)}`)
      .join('\n\n');
    const input = `${transcript ? `CONTEXTO DA CONVERSA:\n${transcript}\n\n` : ''}NOVA MENSAGEM DA USUÁRIA:\n${message.slice(0, 12000)}`;

    const requestBody = JSON.stringify({
      model: 'gemini-3.8-flash',
      input,
      system_instruction: SYSTEM_PROMPT,
      store: false
    });

    // Repete automaticamente apenas falhas transitórias de limite/sobrecarga/servidor.
    // São 4 tentativas no total, com espera progressiva e respeito a Retry-After.
    let response;
    let data = {};
    let lastError = null;
    const maxAttempts = 4;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': key
          },
          body: requestBody
        });

        data = await response.json().catch(() => ({}));
        if (response.ok) break;

        const retryable = [429, 500, 502, 503, 504].includes(response.status);
        if (!retryable || attempt === maxAttempts - 1) {
          const detail = data.error?.message || data.message || `Erro HTTP ${response.status}`;
          return json(502, {
            error: `Falha na API Gemini (${response.status}): ${detail}`,
            retryable,
            attempts: attempt + 1
          });
        }

        const retryAfter = Number(response.headers.get('retry-after'));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? Math.min(retryAfter * 1000, 10000)
          : Math.min(1000 * (2 ** attempt), 8000) + Math.floor(Math.random() * 300);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      } catch (err) {
        lastError = err;
        if (attempt === maxAttempts - 1) {
          return json(502, {
            error: `Não foi possível alcançar o Gemini após ${maxAttempts} tentativas: ${err.message || 'falha de rede'}`,
            retryable: true,
            attempts: attempt + 1
          });
        }
        const waitMs = Math.min(1000 * (2 ** attempt), 8000) + Math.floor(Math.random() * 300);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
    }

    if (!response || !response.ok) {
      const detail = data.error?.message || lastError?.message || 'Serviço temporariamente indisponível.';
      return json(502, { error: `Falha na API Gemini: ${detail}`, retryable: true });
    }

    const reply = String(data.output_text || (data.outputs || [])
      .filter(item => item.type === 'text' || item.type === 'message')
      .map(item => item.text || item.content || '')
      .join('\n') || '').trim();

    if (!reply) return json(502, { error: 'O Gemini recebeu a mensagem, mas não retornou texto. Tente novamente.' });
    return json(200, { reply });
  } catch (error) {
    return json(500, { error: error.message || 'Erro interno na função FLÁVIA INTELLIGENCE.' });
  }
};

function json(statusCode, payload) {
  return {
    statusCode,
    headers: cors(),
    body: JSON.stringify(payload)
  };
}

function cors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
}
