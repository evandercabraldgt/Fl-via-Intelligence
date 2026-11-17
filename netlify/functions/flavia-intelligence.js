const SYSTEM_PROMPT = `Você é FLÁVIA INTELLIGENCE, estrategista de conteúdo, roteirista, copywriter e parceira de planejamento de Flávia Bezerra, da marca A Taróloga Fora da Caixa. Responda em português brasileiro natural. Posicionamento: Prosperidade Emocional, autonomia, identidade, liberdade, propósito e expansão. Assinatura: Nem todo mistério pede uma previsão. Alguns pedem coragem para olhar. Tese: Ninguém Vai Te Salvar, como convite à autonomia, nunca culpabilização. Tarot protagonista em dimensões tradicionais, preditivas, simbólicas, sistêmicas, ancestrais e terapêuticas. Público: mulheres adultas em reconstrução e também mulheres que desejam crescer, prosperar, empreender e expandir. Voz: provocadora, inteligente, ousada, direta, emocional, popular e humana. Sem clichês, jargão corporativo, emojis desnecessários ou travessões. Não humilhe nem culpe. Não transforme conceitos espirituais em fatos científicos. Identidade visual: vinho #672638, bege #F4E6D1, estética editorial e mística sofisticada. Pilares: O Tarô que revela; Os véus da própria história; Raízes e ancestralidade; As quatro prosperidades; A mulher que constrói a própria realidade; Por trás da consulta. Para carrosséis, respeite exatamente a quantidade solicitada entre 6 e 20 telas. Entregue conteúdo específico, original, claro e útil. Não invente dados, estudos, depoimentos, preços ou condições comerciais.`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors(), body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Método não permitido.' });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return json(500, { error: 'A variável GEMINI_API_KEY não está disponível para esta função. Confira as variáveis de ambiente do Netlify e publique novamente.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return json(400, { error: 'A mensagem recebida não está em formato válido.' }); }

  const message = String(body.message || '').trim();
  if (!message) return json(400, { error: 'Escreva uma mensagem.' });

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const transcript = history
    .filter(item => item && ['user', 'assistant'].includes(item.role) && item.content)
    .map(item => `${item.role === 'assistant' ? 'FLÁVIA INTELLIGENCE' : 'USUÁRIA'}: ${String(item.content).slice(0, 5000)}`)
    .join('\n\n');
  const input = `${transcript ? `CONTEXTO DA CONVERSA:\n${transcript}\n\n` : ''}NOVA MENSAGEM DA USUÁRIA:\n${message.slice(0, 8000)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 24000);
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        model: 'gemini-3.8-flash-lite',
        input,
        system_instruction: SYSTEM_PROMPT,
        store: false
      }),
      signal: controller.signal
    });

    const raw = await response.text();
    let data;
    try { data = JSON.parse(raw); }
    catch { return json(502, { error: `O Gemini devolveu uma resposta que não veio em JSON (HTTP ${response.status}).` }); }

    if (!response.ok) {
      const detail = data.error?.message || data.message || `Erro HTTP ${response.status}`;
      return json(502, { error: `A API Gemini respondeu com erro (${response.status}): ${detail}` });
    }

    const reply = String(data.output_text || (data.outputs || [])
      .filter(item => item.type === 'text' || item.type === 'message')
      .map(item => item.text || item.content || '')
      .join('\n') || '').trim();

    if (!reply) return json(502, { error: 'O Gemini recebeu a mensagem, mas não retornou texto. Tente novamente.' });
    return json(200, { reply });
  } catch (error) {
    if (error.name === 'AbortError') {
      return json(504, { error: 'O Gemini demorou mais de 24 segundos para responder. Tente novamente em instantes.' });
    }
    return json(502, { error: `Não foi possível alcançar a API Gemini: ${error.message || 'falha de rede'}` });
  } finally {
    clearTimeout(timer);
  }
};

function json(statusCode, payload) {
  return { statusCode, headers: cors(), body: JSON.stringify(payload) };
}
function cors() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS'
  };
}
