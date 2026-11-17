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
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, {
      error: 'Método não permitido. Envie a mensagem pelo botão do Studio.'
    });
  }

  try {
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return jsonResponse(500, {
        error: 'A chave GROQ_API_KEY não foi encontrada nas variáveis de ambiente do Netlify.'
      });
    }

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body || '', 'base64').toString('utf8')
      : (event.body || '{}');

    const body = JSON.parse(rawBody);
    const message = String(body.message || '').trim();

    if (!message) {
      return jsonResponse(400, {
        error: 'Escreva uma mensagem antes de enviar.'
      });
    }

    const history = Array.isArray(body.history)
      ? body.history.slice(-10)
      : [];

    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      ...history
        .filter(item =>
          item &&
          ['user', 'assistant'].includes(item.role) &&
          item.content
        )
        .map(item => ({
          role: item.role,
          content: String(item.content).slice(0, 5000)
        })),
      {
        role: 'user',
        content: message.slice(0, 8000)
      }
    ];

    let response;

    try {
      response = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            messages,
            temperature: 0.7,
            max_completion_tokens: 4096
          }),
          signal: AbortSignal.timeout(25000)
        }
      );
    } catch (error) {
      return jsonResponse(504, {
        error: 'Não foi possível conectar à Groq. Tente novamente.',
        detail: error.name === 'TimeoutError'
          ? 'A resposta demorou mais que o limite de espera.'
          : error.message
      });
    }

    const rawResponse = await response.text();

    let data;

    try {
      data = JSON.parse(rawResponse);
    } catch {
      return jsonResponse(502, {
        error: 'A Groq devolveu uma resposta inesperada.',
        detail: rawResponse.slice(0, 300)
      });
    }

    if (!response.ok) {
      const detail =
        data.error?.message ||
        `Erro HTTP ${response.status} ao consultar a Groq.`;

      return jsonResponse(response.status, {
        error: `A Groq retornou erro ${response.status}.`,
        detail
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return jsonResponse(502, {
        error: 'A Groq recebeu a mensagem, mas não entregou uma resposta em texto.'
      });
    }

    return jsonResponse(200, { reply });

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
