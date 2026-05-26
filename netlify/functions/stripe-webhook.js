const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.log('Webhook Error:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const email = session.customer_details?.email;

    console.log('Payment received for:', email);
    if (!email) return { statusCode: 400, body: 'No email found' };

    const sb = createClient(
      'https://kuntstakrkvqzncjxpjp.supabase.co',
      process.env.SUPABASE_SERVICE_KEY
    );

    // Crear usuario
    const { data: userData } = await sb.auth.admin.createUser({
      email,
      email_confirm: true
    });

    const userId = userData?.user?.id;

    // Crear restaurante para este usuario
    if (userId) {
      await sb.from('restaurantes').insert({
        user_id: userId,
        nombre: 'Mi Restaurante',
        eslogan: 'Bienvenidos',
        plan: 'pro'
      });
    }

    // Generar magic link
    const { data, error } = await sb.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: 'https://admin.tapi-fy.online'
      }
    });

    if (error) {
      console.log('Magic link error:', error.message);
      return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    const magicLink = data?.properties?.action_link;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Tapify <onboarding@resend.dev>',
        to: email,
        subject: '¡Bienvenido a Tapify! Accede a tu panel',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:2rem;">
            <h2 style="color:#0f0f14;">¡Bienvenido a Tapify!</h2>
            <p style="color:#555;">Tu pago ha sido procesado correctamente. Pulsa el botón para acceder a tu panel de administración.</p>
            <a href="${magicLink}" style="background:#c9973a;color:#0f0f14;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;margin:20px 0;">Entrar a mi panel →</a>
            <p style="color:#555;margin-top:20px;">Para acceder en el futuro ve directamente a:</p>
            <a href="https://admin.tapi-fy.online" style="color:#c9973a;font-weight:600;font-size:16px;">admin.tapi-fy.online</a>
            <p style="color:#aaa;font-size:12px;margin-top:8px;">Guarda este enlace en tus favoritos.</p>
            <p style="color:#aaa;font-size:12px;">Este enlace de acceso es válido durante 24 horas.</p>
            <p style="color:#555;margin-top:16px;">El equipo de Tapify</p>
          </div>
        `
      })
    });
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
