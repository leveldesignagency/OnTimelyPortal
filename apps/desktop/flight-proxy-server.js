const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// OpenSky API proxy endpoint
app.get('/api/opensky/flights', async (req, res) => {
  try {
    const { begin, end, username, password } = req.query;
    
    console.log('🔄 OpenSky API call via proxy:', { begin, end, username });
    
    // Create Basic Auth header
    const credentials = Buffer.from(`${username}:${password}`).toString('base64');
    
    const url = `https://opensky-network.org/api/flights/all?begin=${begin}&end=${end}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`OpenSky API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ OpenSky API call successful, data length:', Array.isArray(data) ? data.length : 'N/A');
    
    res.json(data);
    
  } catch (error) {
    console.error('❌ OpenSky API call failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Flight proxy server is running!', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 Flight proxy server running on http://localhost:${PORT}`);
  console.log(`📡 OpenSky endpoint: http://localhost:${PORT}/api/opensky/flights`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
}); 