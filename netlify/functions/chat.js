exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { messages, menu } = JSON.parse(event.body);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 400,
        system: `Eres Pepe, camarero simpático de un restaurante español. Tono natural, español de España. Menú: ${JSON.stringify(menu)}. Recomienda con entusiasmo, informa alérgenos, haz upselling. Respuestas cortas.`,
        messages
      })
    });
    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Perdona, ¿puedes repetirlo?';
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
