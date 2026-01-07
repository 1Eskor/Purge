
const https = require('https');

const url = 'https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112'; // Wrapped SOL

console.log(`Testing Price API: ${url}`);

const req = https.get(url, (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => console.log('Body:', data));
});

req.on('error', (e) => console.log('Error:', e.message));
