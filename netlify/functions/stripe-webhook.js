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

    if (!email) {
      return { statusCode: 400, body: 'No email found' };
    }

    const sb = createClient(
      'https://kuntstakrkvqzncjxpjp.supabase.co',
      process.env.SUPABASE_SERVICE_KEY
    );

    const tempPassword = Math.random().toString(36).slice(-6) + 'Aa1!';

    const { error: userError } = await sb.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true
    });

    if (userError && !userError.message.includes('already registered')) {
      console.log('User creation error:', userError.message);
    }

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Tapify <onboarding@resend.dev>',
        to: email,
        subject: '¡Bienvenido a Tapify! Tus credenciales de acceso',
        html: `
          <h2>¡Bienvenido a Tapify!</h2>
          <p>Tu cuenta ha sido creada. Aquí tienes tus credenciales:</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Contraseña temporal:</strong> ${tempPassword}</p>
          <p><a href="https://tapify-admin.netlify.app" style="background:#c9973a;color:#0f0f14;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;margin:16px 0;">Entrar al panel</a></p>
          <p>Cambia tu contraseña una vez dentro.</p>
          <p>El equipo de Tapify</p>
        `
      })
    });
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
