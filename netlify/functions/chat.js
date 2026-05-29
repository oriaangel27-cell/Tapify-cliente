const https = require('https');
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { messages, menu, camareroNombre } = JSON.parse(event.body);
    const nombre = camareroNombre || 'Pepe';
    const payload = JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      system: `Eres ${nombre}, un camarero simpático de un restaurante español. Responde siempre en español. Solo recomienda platos de esta carta: ${JSON.stringify(menu)}. Respuestas cortas, máximo 3-4 líneas. Sugiere entrantes, principales y postres de forma natural. Si el cliente quiere pedir, confirma su pedido con los platos y el precio total.`,
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
          resolve(parsed.content?.[0]?.text || 'Perdona, ¿puedes repetirlo?');
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
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
