const express = require('express');
const { Resend } = require('resend');
const cors = require('cors');

// Use built-in fetch if available (Node 18+), otherwise fallback to node-fetch
let fetchFn = global.fetch;
if (typeof fetchFn === 'undefined') {
	try {
		fetchFn = require('node-fetch');
	} catch (e) {
		console.warn('node-fetch not installed; install it with: npm i node-fetch');
	}
}

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

// FlightAware proxy endpoint
app.get('/api/flightaware', async (req, res) => {
	try {
		const { flightNumber, flightDate } = req.query || {};
		if (!flightNumber) {
			return res.status(400).json({ error: 'Missing required parameter: flightNumber' });
		}

		const FLIGHTAWARE_API_KEY = 'tc87hHhGcuEA3fitkPGgvO0eGqaltNJ4';
		const baseUrl = 'https://aeroapi.flightaware.com/aeroapi';
		
		// Try multiple FlightAware endpoints based on their documentation
		let url, data;
		
		// Endpoint 1: Search flights by ident (flight number)
		url = `${baseUrl}/flights/search?query=${encodeURIComponent(String(flightNumber))}&type=ident&howMany=10&offset=0`;
		console.log('🔍 Trying FlightAware endpoint 1:', url);
		
		try {
			const response = await fetchFn(url, {
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
				const response = await fetchFn(url, {
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
				const response = await fetchFn(url, {
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
			targetFlight = data.flights.find((f) => {
				if (!f?.filed_departure_time) return false;
				const d = new Date(f.filed_departure_time).toISOString().split('T')[0];
				return d === flightDate;
			}) || targetFlight;
		}

		const flightData = {
			flight_number: String(flightNumber),
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

		return res.status(200).json({ success: true, flight: flightData });
	} catch (error) {
		console.error('FlightAware proxy error:', error);
		return res.status(500).json({ error: error?.message || 'Unknown error' });
	}
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
	console.log('Test endpoint:  http://localhost:3001/test');
	console.log('FlightAware:     http://localhost:3001/api/flightaware?flightNumber=BA999&flightDate=2025-08-20');
	console.log('Email endpoint:  http://localhost:3001/api/send-email');
}); 