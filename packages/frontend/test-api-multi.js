
const https = require('https');

const endpoints = [
    'https://quote-api.jup.ag/v6/quote', // Primary (known to fail DNS)
    'https://api.jup.ag/swap/v1/quote',  // Potential V1
    'https://api.jup.ag/v6/quote',       // Potential V6 on main api domain
    'https://price.jup.ag/v6/quote',     // Another guess
    'https://jup.ag/api/quote'           // Another guess
];

const params = '?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000';

endpoints.forEach(base => {
    const url = base + params;
    console.log(`Testing: ${base}`);
    const req = https.get(url, (res) => {
        console.log(`[${base}] Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => console.log(`[${base}] SUCCESS! Body: ${data.substring(0, 50)}...`));
        }
    });
    req.on('error', (e) => {
        console.log(`[${base}] Error: ${e.code || e.message}`);
    });
    req.setTimeout(3000, () => {
        req.destroy();
        console.log(`[${base}] Timeout`);
    });
});
