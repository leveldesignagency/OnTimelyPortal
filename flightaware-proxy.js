export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-apikey');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { flightNumber, flightDate } = req.query;

  if (!flightNumber) {
    return res.status(400).json({ error: 'Flight number is required' });
  }

  try {
    const FLIGHTAWARE_API_KEY = 'tc87hHhGcuEA3fitkPGgvO0eGqaltNJ4';
    const baseUrl = 'https://aeroapi.flightaware.com/aeroapi';
    
    // Search for flights by flight number
    const searchUrl = `${baseUrl}/flights/search?query=${flightNumber}&type=ident&howMany=10&offset=0`;
    
    console.log('🔍 FlightAware search URL:', searchUrl);
    
    const response = await fetch(searchUrl, {
      headers: {
        'x-apikey': FLIGHTAWARE_API_KEY,
        'Accept': 'application/json'
      }
    });
    
    console.log('📡 FlightAware response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ FlightAware error response:', errorText);
      return res.status(response.status).json({ 
        error: `FlightAware API error: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }
    
    const data = await response.json();
    console.log('📊 FlightAware raw response received');
    
    if (data.flights && data.flights.length > 0) {
      // If flightDate is provided, filter by date
      let targetFlight = data.flights[0]; // Default to first flight
      
      if (flightDate) {
        targetFlight = data.flights.find((flight) => {
          if (flight.filed_departure_time) {
            const flightDateStr = new Date(flight.filed_departure_time).toISOString().split('T')[0];
            return flightDateStr === flightDate;
          }
          return false;
        });
        
        if (!targetFlight) {
          targetFlight = data.flights[0]; // Fallback to first flight if date not found
        }
      }
      
      const flightData = {
        flight_number: flightNumber,
        flight_date: flightDate || 'Current',
        flight_status: targetFlight.status || 'scheduled',
        departure_airport: targetFlight.origin?.city || targetFlight.origin?.code,
        arrival_airport: targetFlight.destination?.city || targetFlight.destination?.code,
        departure_time: targetFlight.filed_departure_time,
        arrival_time: targetFlight.filed_arrival_time,
        departure_iata: targetFlight.origin?.code,
        arrival_iata: targetFlight.destination?.code,
        departure_terminal: targetFlight.origin?.terminal,
        arrival_terminal: targetFlight.destination?.terminal,
        departure_gate: targetFlight.origin?.gate,
        arrival_gate: targetFlight.destination?.gate,
        api_source: 'FlightAware AeroAPI',
        raw_data: targetFlight
      };
      
      return res.status(200).json({
        success: true,
        flight: flightData
      });
    } else {
      return res.status(404).json({ 
        error: 'No flights found in FlightAware response',
        data: data
      });
    }
  } catch (error) {
    console.error('❌ FlightAware proxy error:', error);
    return res.status(500).json({ 
      error: `FlightAware proxy error: ${error.message}`,
      stack: error.stack
    });
  }
} 