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
      system: `You are a friendly waiter at a restaurant. Always respond in Spanish. Only recommend dishes from this menu: ${JSON.stringify(menu)}. Keep responses short, max 3-4 lines. Suggest starters, mains and desserts naturally.`,
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
          resolve(parsed.content?.[0]?.text || 'Perdona, puedes repetirlo?');
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
