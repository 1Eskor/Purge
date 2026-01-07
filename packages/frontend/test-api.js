
const https = require('https');

const url = 'https://www.jupiterapi.com/v6/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000';

console.log(`Testing URL: ${url}`);

https.get(url, (res) => {
    console.log('StatusCode:', res.statusCode);
    console.log('Headers:', res.headers);

    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Body:', data.substring(0, 200)); // First 200 chars
    });

}).on('error', (e) => {
    console.error('Error:', e);
});
