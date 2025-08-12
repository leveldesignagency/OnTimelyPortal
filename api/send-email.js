import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, formData } = req.body;

    const { data, error } = await resend.emails.send({
      from: process.env.FROM_EMAIL || 'noreply@ontimely.co.uk',
      to: to,
      subject: subject || 'Timely Event Form',
      html: html || `
        <h2>Event Form Submission</h2>
        <p>You have received a form submission from your Timely event.</p>
        <h3>Form Data:</h3>
        <pre>${JSON.stringify(formData, null, 2)}</pre>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Send email error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 