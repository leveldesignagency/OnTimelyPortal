const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Get form data from Supabase
    const { data, error } = await supabase.rpc('get_form_by_token', {
      p_token: token
    });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to load form' });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const form = data[0];
    
    return res.status(200).json({
      title: form.title,
      description: form.description,
      fields: form.fields || []
    });

  } catch (error) {
    console.error('Get form error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}; 