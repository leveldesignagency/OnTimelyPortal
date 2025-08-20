import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Local backend server is running!', 
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// FlightAware proxy endpoint
app.get('/api/flightaware', async (req, res) => {
  const { flightNumber, flightDate } = req.query;
  
  if (!flightNumber) {
    return res.status(400).json({ 
      error: 'Missing required parameter: flightNumber' 
    });
  }

  try {
    const FLIGHTAWARE_API_KEY = 'tc87hHhGcuEA3fitkPGgvO0eGqaltNJ4';
    const baseUrl = 'https://aeroapi.flightaware.com/aeroapi';
    
    let url, data;
    
    // Endpoint 1: Search flights by ident
    url = `${baseUrl}/flights/search?query=${encodeURIComponent(String(flightNumber))}&type=ident&howMany=10&offset=0`;
    try {
      const response = await fetch(url, {
        headers: {
          'x-apikey': FLIGHTAWARE_API_KEY,
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        data = await response.json();
      }
    } catch (e) {
      console.log('Endpoint 1 failed:', e.message);
    }
    
    // Endpoint 2: Get specific flight by ident
    if (!data || !data.flights) {
      url = `${baseUrl}/flights/${encodeURIComponent(String(flightNumber))}`;
      try {
        const response = await fetch(url, {
          headers: {
            'x-apikey': FLIGHTAWARE_API_KEY,
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          data = await response.json();
        }
      } catch (e) {
        console.log('Endpoint 2 failed:', e.message);
      }
    }
    
    // Endpoint 3: Get all flights and filter
    if (!data || !data.flights) {
      url = `${baseUrl}/flights/all`;
      try {
        const response = await fetch(url, {
          headers: {
            'x-apikey': FLIGHTAWARE_API_KEY,
            'Accept': 'application/json'
          }
        });
        if (response.ok) {
          data = await response.json();
          if (data && data.flights) {
            data.flights = data.flights.filter(f => f.ident === String(flightNumber));
          }
        }
      } catch (e) {
        console.log('Endpoint 3 failed:', e.message);
      }
    }
    
    if (!data || !data.flights || !data.flights.length) {
      return res.status(404).json({ 
        error: 'No flights found in FlightAware response after trying all endpoints',
        data,
        flightNumber,
        date: new Date().toISOString()
      });
    }
    
    let targetFlight = data.flights[0];
    
    // If flightDate is provided, try to find a matching flight
    if (flightDate) {
      targetFlight = data.flights.find((f) => {
        if (!f?.filed_departure_time) return false;
        const d = new Date(f.filed_departure_time).toISOString().split('T')[0];
        return d === flightDate;
      }) || targetFlight;
    }
    
    const flightData = {
      ident: targetFlight.ident,
      origin: targetFlight.origin?.code || targetFlight.origin,
      destination: targetFlight.destination?.code || targetFlight.destination,
      departure_time: targetFlight.filed_departure_time,
      arrival_time: targetFlight.filed_arrival_time,
      status: targetFlight.status || 'Unknown',
      aircraft_type: targetFlight.aircraft_type,
      operator: targetFlight.operator?.name || targetFlight.operator,
      flight_number: targetFlight.ident,
      airline: targetFlight.operator?.name || targetFlight.operator,
      departure_airport: targetFlight.origin?.code || targetFlight.origin,
      arrival_airport: targetFlight.destination?.code || targetFlight.destination,
      departure_time_utc: targetFlight.filed_departure_time,
      arrival_time_utc: targetFlight.filed_arrival_time,
      flight_status: targetFlight.status || 'Unknown'
    };
    
    res.json({ 
      success: true, 
      flight: flightData,
      source: 'local-proxy',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('FlightAware proxy error:', error);
    res.status(500).json({ 
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  const { to, subject, text, html } = req.body;
  
  if (!to || !subject || (!text && !html)) {
    return res.status(400).json({ 
      error: 'Missing required parameters' 
    });
  }
  
  try {
    // For now, just log the email request
    console.log('Email request received:', { to, subject, text, html });
    
    // In a real implementation, you would integrate with an email service
    // like SendGrid, AWS SES, or similar
    
    res.json({ 
      success: true, 
      message: 'Email request logged successfully',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({ 
      error: error?.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local backend server running on port ${PORT}`);
  console.log(`📡 FlightAware proxy: http://localhost:${PORT}/api/flightaware`);
  console.log(`📧 Email endpoint: http://localhost:${PORT}/api/send-email`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

export default app; 