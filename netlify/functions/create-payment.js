const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const { mesa, restauranteId } = JSON.parse(event.body);
    if (!mesa || !restauranteId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Faltan parámetros' }) };
    }
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const seisHorasAtras = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const { data: pedidos, error } = await sb.from('pedidos').select('*, pedido_items(*)')
      .eq('mesa_id', mesa)
      .eq('restaurante_id', restauranteId)
      .eq('estado', 'pendiente')
      .gte('created_at', seisHorasAtras);
    if (error) throw error;
    if (!pedidos || !pedidos.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No hay pedidos pendientes para esta mesa' }) };
    }
    let allItems = [];
    pedidos.forEach(p => (p.pedido_items || []).forEach(i => allItems.push(i)));
    const amount = allItems.reduce((s, i) => s + (i.precio_unidad || 0) * i.cantidad, 0);
    if (amount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'El importe debe ser mayor que 0' }) };
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'eur', product_data: { name: `Cuenta Mesa ${mesa}` }, unit_amount: Math.round(amount * 100) }, quantity: 1 }],
      mode: 'payment',
      success_url: `https://menu.tapi-fy.online?restaurante=${restauranteId}&mesa=${mesa}&pago=ok`,
      cancel_url: `https://menu.tapi-fy.online?restaurante=${restauranteId}&mesa=${mesa}`,
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: session.url }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
