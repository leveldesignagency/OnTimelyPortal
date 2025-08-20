export default async function handler(req, res) {
	// Enable CORS
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
	res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-apikey');

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

	try {
		const FLIGHTAWARE_API_KEY = 'tc87hHhGcuEA3fitkPGgvO0eGqaltNJ4';
		const baseUrl = 'https://aeroapi.flightaware.com/aeroapi';
		
		// Try multiple FlightAware endpoints based on their documentation
		let url, data;
		
		// Endpoint 1: Search flights by ident (flight number)
		url = `${baseUrl}/flights/search?query=${encodeURIComponent(String(flightNumber))}&type=ident&howMany=10&offset=0`;
		console.log('🔍 Trying FlightAware endpoint 1:', url);
		
		try {
			const response = await fetch(url, {
				headers: {
					'x-apikey': FLIGHTAWARE_API_KEY,
					'Accept': 'application/json'
				}
			});
			
			if (response.ok) {
				data = await response.json();
				console.log('✅ Endpoint 1 succeeded');
			} else {
				console.log('❌ Endpoint 1 failed:', response.status);
			}
		} catch (e) {
			console.log('❌ Endpoint 1 error:', e.message);
		}
		
		// Endpoint 2: Get specific flight by ident if endpoint 1 failed
		if (!data || !data.flights) {
			url = `${baseUrl}/flights/${encodeURIComponent(String(flightNumber))}`;
			console.log('🔍 Trying FlightAware endpoint 2:', url);
			
			try {
				const response = await fetch(url, {
					headers: {
						'x-apikey': FLIGHTAWARE_API_KEY,
						'Accept': 'application/json'
					}
				});
				
				if (response.ok) {
					data = await response.json();
					console.log('✅ Endpoint 2 succeeded');
				} else {
					console.log('❌ Endpoint 2 failed:', response.status);
				}
			} catch (e) {
				console.log('❌ Endpoint 2 error:', e.message);
			}
		}
		
		// Endpoint 3: Get all flights and filter by ident if others failed
		if (!data || !data.flights) {
			url = `${baseUrl}/flights/all`;
			console.log('🔍 Trying FlightAware endpoint 3:', url);
			
			try {
				const response = await fetch(url, {
					headers: {
						'x-apikey': FLIGHTAWARE_API_KEY,
						'Accept': 'application/json'
					}
				});
				
				if (response.ok) {
					data = await response.json();
					// Filter flights by ident
					if (data && data.flights) {
						data.flights = data.flights.filter(f => f.ident === String(flightNumber));
					}
					console.log('✅ Endpoint 3 succeeded');
				} else {
					console.log('❌ Endpoint 3 failed:', response.status);
				}
			} catch (e) {
				console.log('❌ Endpoint 3 error:', e.message);
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
		if (flightDate) {
			// Prefer scheduled/estimated OUT/OFF times, fallback to filed_departure_time
			targetFlight = data.flights.find((f) => {
				const depCandidate = f?.scheduled_out || f?.estimated_out || f?.scheduled_off || f?.estimated_off || f?.filed_departure_time;
				if (!depCandidate) return false;
				const d = new Date(depCandidate).toISOString().split('T')[0];
				return d === flightDate;
			}) || targetFlight;
		}

		// Debug: Log the raw FlightAware response
		console.log('🔍 Raw FlightAware response:', JSON.stringify(targetFlight, null, 2));
		
		const flightData = {
			flight_number: String(flightNumber),
			flight_date: flightDate || 'Current',
			flight_status: targetFlight.status || targetFlight.flight_status || 'scheduled',
			
			// DEPARTURE
			departure_airport: targetFlight.origin?.name || targetFlight.origin?.city || targetFlight.departure_airport || targetFlight.departure_city || targetFlight.origin?.code_iata || targetFlight.origin?.code,
			departure_time: targetFlight.scheduled_out || targetFlight.estimated_out || targetFlight.scheduled_off || targetFlight.estimated_off || targetFlight.filed_departure_time,
			departure_iata: targetFlight.origin?.code_iata || targetFlight.origin?.code || targetFlight.departure_iata,
			departure_terminal: targetFlight.terminal_origin || targetFlight.origin?.terminal || targetFlight.departure_terminal,
			departure_gate: targetFlight.gate_origin || targetFlight.origin?.gate || targetFlight.departure_gate,
			
			// ARRIVAL
			arrival_airport: targetFlight.destination?.name || targetFlight.destination?.city || targetFlight.arrival_airport || targetFlight.arrival_city || targetFlight.destination?.code_iata || targetFlight.destination?.code,
			arrival_time: targetFlight.scheduled_in || targetFlight.estimated_in || targetFlight.scheduled_on || targetFlight.estimated_on || targetFlight.filed_arrival_time,
			arrival_iata: targetFlight.destination?.code_iata || targetFlight.destination?.code || targetFlight.arrival_iata,
			arrival_terminal: targetFlight.terminal_destination || targetFlight.destination?.terminal || targetFlight.arrival_terminal,
			arrival_gate: targetFlight.gate_destination || targetFlight.destination?.gate || targetFlight.arrival_gate,
			
			api_source: 'FlightAware AeroAPI',
			raw_data: targetFlight
		};

		return res.status(200).json({ success: true, flight: flightData });
	} catch (error) {
		console.error('FlightAware proxy error:', error);
		return res.status(500).json({ error: error?.message || 'Unknown error' });
	}
} 