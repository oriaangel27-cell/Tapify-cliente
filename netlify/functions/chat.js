const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { messages, menu } = JSON.parse(event.body);
    const payload = JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      system: Eres un camarero simpático y cercano. Hablas en español de España, tono natural y con gracia. SOLO puedes recomendar platos que estén en este menú: ${JSON.stringify(menu)}. No inventes nada que no esté en el menú. Recomienda con entusiasmo pero siendo breve. Informa de alérgenos si preguntan. Haz upselling natural sugiriendo entrante + principal + postre. Respuestas cortas, máximo 3-4 líneas.
      messages
    });
    const reply = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
          'Content-Length': Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const parsed = JSON.parse(data);
          resolve(parsed.content?.[0]?.text || JSON.stringify(parsed));
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
