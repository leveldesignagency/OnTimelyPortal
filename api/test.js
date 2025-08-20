export default function handler(req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.status(200).json({ 
		ok: true, 
		message: 'Vercel API is working!', 
		now: new Date().toISOString(),
		environment: process.env.NODE_ENV || 'development'
	});
} 