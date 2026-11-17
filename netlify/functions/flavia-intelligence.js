const SYSTEM_PROMPT = `Você é FLÁVIA INTELLIGENCE, estrategista de conteúdo, roteirista, copywriter e parceira de planejamento de Flávia Bezerra, da marca A Taróloga Fora da Caixa.
Responda sempre em português brasileiro natural, com clareza, personalidade e profundidade.
Posicionamento: Prosperidade Emocional, autonomia, identidade, liberdade, propósito e expansão.
Assinatura: Nem todo mistério pede uma previsão. Alguns pedem coragem para olhar.
Tese: Ninguém Vai Te Salvar, como convite à autonomia, nunca como culpabilização.
O Tarot deve ser protagonista quando o assunto pedir, integrando leituras tradicionais, preditivas, simbólicas, sistêmicas, ancestrais e terapêuticas. Não force Tarot em temas nos quais ele não faça sentido.
Público: mulheres adultas em reconstrução, mulheres que desejam crescer, prosperar, empreender e expandir.
Voz: provocadora, inteligente, ousada, direta, emocional, popular e humana. Evite clichês, jargão corporativo, emojis desnecessários e travessões.
Não humilhe nem culpe. Não apresente conceitos espirituais como fatos científicos. Não invente dados, estudos, depoimentos, preços ou condições comerciais.
Identidade visual: vinho #672638, bege #F4E6D1, estética editorial e mística sofisticada.
Pilares: O Tarô que revela; Os véus da própria história; Raízes e ancestralidade; As quatro prosperidades; A mulher que constrói a própria realidade; Por trás da consulta.
Para carrosséis, respeite exatamente a quantidade solicitada. Se a usuária pedir seis telas, entregue seis telas. Produza conteúdo específico, original, claro e útil.`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Método não permitido. Envie a mensagem pelo botão do Studio.' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonResponse(500, { error: 'A chave GEMINI_API_KEY não foi encontrada nas variáveis de ambiente do Netlify.' });
    }

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '{}');
    const body = JSON.parse(rawBody);
    const message = String(body.message || '').trim();

    if (!message) {
      return jsonResponse(400, { error: 'Escreva uma mensagem antes de enviar.' });
    }

    const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
    const contents = history
      .filter(item => item && ['user', 'assistant'].includes(item.role) && item.content)
      .map(item => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(item.content).slice(0, 5000) }]
      }));

    contents.push({ role: 'user', parts: [{ text: message.slice(0, 8000) }] });

    const requestBody = {
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096
      }
    };

    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent';
    let lastError = 'O Gemini não conseguiu concluir a resposta.';

    for (let attempt = 1; attempt <= 3; attempt++) {
      let response;
      let rawResponse = '';

      try {
        response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(8000)
        });
        rawResponse = await response.text();
        console.error('RESPOSTA DO GEMINI:', response.status, rawResponse.slice(0, 1500));
      } catch (error) {
        lastError = error.name === 'TimeoutError'
          ? 'O Gemini demorou mais que o limite de espera. Tente novamente.'
          : `Não foi possível conectar ao Gemini: ${error.message}`;

        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, attempt * 700));
          continue;
        }
        return jsonResponse(504, { error: lastError });
      }

      let data;
      try {
        data = JSON.parse(rawResponse);
      } catch {
        lastError = `O Gemini devolveu uma resposta inesperada (HTTP ${response.status}).`;
        if (attempt < 3 && response.status >= 500) {
          await new Promise(resolve => setTimeout(resolve, attempt * 700));
          continue;
        }
        return jsonResponse(502, { error: lastError, detail: rawResponse.slice(0, 300) });
      }

      if (!response.ok) {
        lastError = data.error?.message || `Erro HTTP ${response.status} ao consultar o Gemini.`;
        if (attempt < 3 && [429, 500, 502, 503, 504].includes(response.status)) {
          await new Promise(resolve => setTimeout(resolve, attempt * 700));
          continue;
        }
        return jsonResponse(response.status === 429 ? 429 : 502, {
          error: `O Gemini retornou erro ${response.status}.`,
          detail: lastError
        });
      }

      const parts = data.candidates?.[0]?.content?.parts || [];
      const reply = parts
        .filter(part => typeof part.text === 'string')
        .map(part => part.text.trim())
        .filter(Boolean)
        .join('\n')
        .trim();

      if (reply) {
        return jsonResponse(200, { reply });
      }

      const finishReason = data.candidates?.[0]?.finishReason || 'não informado';
      const blockReason = data.promptFeedback?.blockReason;
      return jsonResponse(502, {
        error: 'O Gemini recebeu a mensagem, mas não entregou texto.',
        detail: blockReason
          ? `A solicitação foi bloqueada pelo filtro de segurança: ${blockReason}.`
          : `Motivo informado pelo Gemini: ${finishReason}.`
      });
    }

    return jsonResponse(502, { error: 'Não foi possível obter resposta do Gemini.', detail: lastError });
  } catch (error) {
    return jsonResponse(500, {
      error: 'A função FLÁVIA INTELLIGENCE encontrou um erro interno.',
      detail: error.message || 'Erro sem detalhes.'
    });
  }
};

function jsonResponse(statusCode, payload) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(payload)
  };
}

function corsHeaders() {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}
