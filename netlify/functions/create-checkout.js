const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { plan } = JSON.parse(event.body);
    const prices = {
      basico: 'price_1TYjLzAGF7dMInEmHBRdmi71',
      pro: 'price_1TYjNLAGF7dMInEmuhAg7OnC',
      premium: 'price_1TYjOlAGF7dMInEmbzueHAGm'
    };
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: prices[plan], quantity: 1 }],
      mode: 'subscription',
      success_url: 'https://tapify-app.netlify.app?success=true',
      cancel_url: 'https://tapify-app.netlify.app'
    });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url })
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e.message })
    };
  }
};
