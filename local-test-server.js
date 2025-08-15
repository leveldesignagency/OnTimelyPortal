const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Resend
const resend = new Resend('re_XANE9rsS_MP6hfcX3yNmqsgnemzAYAtPK');

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Local API server is running!' });
});

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    console.log('Sending email to:', to);
    console.log('Subject:', subject);

    const { data, error } = await resend.emails.send({
      from: 'noreply@ontimely.co.uk',
      to: to,
      subject: subject,
      html: html
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email', details: error });
    }

    console.log('Email sent successfully:', data);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('Send email error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Local test server running on http://localhost:${port}`);
  console.log('Test endpoint: http://localhost:3001/test');
  console.log('Email endpoint: http://localhost:3001/api/send-email');
}); 