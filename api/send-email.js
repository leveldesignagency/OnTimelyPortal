// This is a serverless function that sends emails using Resend.
// In a real-world, professional setup, this logic would be part of a larger, more robust backend service.
// This function is designed to be deployed on a platform like Vercel or Netlify.

const { Resend } = require('resend');

// --- IMPORTANT ---
// To make this work, you need a Resend account and an API key.
// 1. Go to https://resend.com/ and sign up for a free account.
// 2. Create an API key.
// 3. Set this key as an environment variable named RESEND_API_KEY in your .env file.
//
// You also need to add and verify a domain in Resend to be able to send emails.
// You can use the 'onboarding@resend.dev' address for testing, but for production,
// you must use an email from your verified domain (e.g., 'noreply@yourdomain.com').
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@ontimely.co.uk';

module.exports = async (req, res) => {
  // We only allow POST requests to this endpoint.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  // Add a check for the API key to provide a clearer error.
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    console.error('ERROR: Resend API Key not configured.');
    return res.status(500).json({ error: 'The email sending service is not configured. The Resend API key is missing.' });
  }

  const resend = new Resend(apiKey);

  try {
    const { emails, link, eventName } = req.body;

    // Basic validation
    if (!emails || !Array.isArray(emails) || emails.length === 0 || !link || !eventName) {
      return res.status(400).json({ error: 'Missing required fields: emails (array), link, and eventName are required.' });
    }

    const { data, error } = await resend.emails.send({
      from: `Timely <${FROM_EMAIL}>`,
      to: emails,
      subject: `You're invited to: ${eventName}!`,
      html: `
        <div style="font-family: sans-serif; text-align: center; padding: 40px;">
          <h1 style="color: #333;">You're invited!</h1>
          <p style="font-size: 18px; color: #555;">You have been invited to the event: <strong>${eventName}</strong>.</p>
          <p style="font-size: 16px; color: #555;">Please click the button below to fill out the guest information form.</p>
          <a href="${link}" target="_blank" style="background-color: #000; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-size: 18px; display: inline-block; margin-top: 20px;">
            Fill Out Form
          </a>
          <p style="margin-top: 30px; font-size: 12px; color: #999;">If you cannot click the button, copy and paste this link into your browser: ${link}</p>
        </div>
      `,
    });

    if (error) {
      console.error('Error from Resend:', error);
      return res.status(400).json(error);
    }
    
    return res.status(200).json(data);

  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send emails.' });
  }
}; 