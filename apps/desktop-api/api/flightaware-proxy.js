export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { flightNumber, flightDate } = req.query || {};
  if (!flightNumber) {
    return res.status(400).json({ error: 'Missing required parameter: flightNumber' });
  }

  const FLIGHTAWARE_API_KEY = process.env.FLIGHTAWARE_API_KEY;
  if (!FLIGHTAWARE_API_KEY) {
    return res.status(500).json({ error: 'Missing FLIGHTAWARE_API_KEY in environment' });
  }

  try {
    const baseUrl = 'https://aeroapi.flightaware.com/aeroapi';
    let url, data;

    // Endpoint 1: Search by ident
    url = `${baseUrl}/flights/search?query=${encodeURIComponent(String(flightNumber))}&type=ident&howMany=10&offset=0`;
    try {
      const response = await fetch(url, { headers: { 'x-apikey': FLIGHTAWARE_API_KEY, 'Accept': 'application/json' } });
      if (response.ok) data = await response.json();
    } catch {}

    // Endpoint 2: Specific ident
    if (!data || !data.flights) {
      url = `${baseUrl}/flights/${encodeURIComponent(String(flightNumber))}`;
      try {
        const response = await fetch(url, { headers: { 'x-apikey': FLIGHTAWARE_API_KEY, 'Accept': 'application/json' } });
        if (response.ok) data = await response.json();
      } catch {}
    }

    if (!data || !data.flights || !data.flights.length) {
      return res.status(404).json({ error: 'No flights found in FlightAware response', flightNumber });
    }

    let targetFlight = data.flights[0];
    if (flightDate) {
      const match = data.flights.find((f) => {
        const depCandidate = f?.scheduled_out || f?.estimated_out || f?.scheduled_off || f?.estimated_off || f?.filed_departure_time;
        if (!depCandidate) return false;
        const d = new Date(depCandidate).toISOString().split('T')[0];
        return d === flightDate;
      });
      if (match) targetFlight = match;
    }

    const flight = {
      flight_number: String(flightNumber),
      flight_date: flightDate || 'Current',
      flight_status: targetFlight.status || targetFlight.flight_status || 'scheduled',
      // Departure
      departure_airport: targetFlight.origin?.name || targetFlight.origin?.city || targetFlight.departure_airport || targetFlight.departure_city || targetFlight.origin?.code_iata || targetFlight.origin?.code,
      departure_time: targetFlight.scheduled_out || targetFlight.estimated_out || targetFlight.scheduled_off || targetFlight.estimated_off || targetFlight.filed_departure_time,
      departure_iata: targetFlight.origin?.code_iata || targetFlight.origin?.code,
      departure_terminal: targetFlight.terminal_origin || targetFlight.origin?.terminal || targetFlight.departure_terminal,
      departure_gate: targetFlight.gate_origin || targetFlight.origin?.gate || targetFlight.departure_gate,
      // Arrival
      arrival_airport: targetFlight.destination?.name || targetFlight.destination?.city || targetFlight.arrival_airport || targetFlight.arrival_city || targetFlight.destination?.code_iata || targetFlight.destination?.code,
      arrival_time: targetFlight.scheduled_in || targetFlight.estimated_in || targetFlight.scheduled_on || targetFlight.estimated_on || targetFlight.filed_arrival_time,
      arrival_iata: targetFlight.destination?.code_iata || targetFlight.destination?.code,
      arrival_terminal: targetFlight.terminal_destination || targetFlight.destination?.terminal || targetFlight.arrival_terminal,
      arrival_gate: targetFlight.gate_destination || targetFlight.destination?.gate || targetFlight.arrival_gate,
      api_source: 'FlightAware AeroAPI',
      raw_data: targetFlight
    };

    return res.status(200).json({ success: true, flight });
  } catch (error) {
    console.error('FlightAware proxy error:', error);
    return res.status(500).json({ error: error?.message || 'Unknown error' });
  }
}
