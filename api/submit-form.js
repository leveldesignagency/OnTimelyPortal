const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token, responses } = req.body;

    if (!token || !responses) {
      return res.status(400).json({ error: 'Token and responses are required' });
    }

    // Get email from responses or use a default
    const email = responses.email || 'guest@example.com';

    // Submit form response to Supabase
    const { data, error } = await supabase.rpc('submit_form_response', {
      p_token: token,
      p_email: email,
      p_responses: responses
    });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to submit form' });
    }

    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('Submit form error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 