const { Resend } = require('resend');

// Use your verified domain now that DNS is configured
const FROM_EMAIL = 'noreply@ontimely.co.uk';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY not configured');
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }
  
  const resend = new Resend(apiKey);

  try {
    const { email, name, companyName, confirmationUrl } = req.body || {};
    console.log('Received request:', { email, name, companyName, confirmationUrl });
    
    if (!email || !name || !confirmationUrl) {
      return res.status(400).json({ error: 'Missing required fields: email, name, confirmationUrl' });
    }

    const emailPayload = {
      from: `OnTimely <${FROM_EMAIL}>`,
      to: [email],
      subject: `Confirm Your OnTimely Account - Welcome ${name}!`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px; }
            .content { padding: 20px; background: #f8f9fa; border-radius: 10px; margin: 20px 0; }
            .button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
            .footer { text-align: center; color: #666; font-size: 14px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to OnTimely!</h1>
            </div>
            
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Your OnTimely account has been created successfully!</p>
              <p><strong>Email:</strong> ${email}</p>
              ${companyName ? `<p><strong>Company:</strong> ${companyName}</p>` : ''}
              
              <p>To complete your account setup, please confirm your email address:</p>
              
              <a href="${confirmationUrl}" class="button">Confirm Email Address</a>
              
              <p style="margin-top: 20px; font-size: 14px; color: #666;">
                If the button doesn't work, copy this link: ${confirmationUrl}
              </p>
            </div>
            
            <div class="footer">
              <p>OnTimely - Professional Event Management Platform</p>
              <p>This link expires in 24 hours for security reasons.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    console.log('Sending email with payload:', emailPayload);

    const { data, error } = await resend.emails.send(emailPayload);

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json(error);
    }

    console.log('Resend success:', data);
    return res.status(200).json(data);
  } catch (e) {
    console.error('Edge Function error:', e);
    return res.status(500).json({ error: 'Failed to send email', details: e.message });
  }
};
