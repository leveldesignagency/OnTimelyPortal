const { Resend } = require('resend');

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@ontimely.co.uk';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  }
  const resend = new Resend(apiKey);

  try {
    const { emails, link, eventName } = req.body || {};
    if (!Array.isArray(emails) || emails.length === 0 || !link || !eventName) {
      return res.status(400).json({ error: 'Missing required fields: emails[], link, eventName' });
    }

    const { data, error } = await resend.emails.send({
      from: `Timely <${FROM_EMAIL}>`,
      to: emails,
      subject: `${eventName} • Please complete your form`,
      html: `
        <div style="font-family: Arial, sans-serif; padding:24px;">
          <h2 style="margin:0 0 8px;">${eventName}</h2>
          <p style="margin:0 0 14px;">Please complete your form using the link below:</p>
          <p style="margin:0 0 18px;"><a href="${link}" target="_blank">${link}</a></p>
          <p style="font-size:12px;color:#666;margin:0;">If you cannot click the link, copy and paste it into your browser.</p>
        </div>
      `,
    });

    if (error) return res.status(400).json(error);
    return res.status(200).json(data);
  } catch (e) {
    return res.status(500).json({ error: 'Failed to send email' });
  }
};