
const https = require('https');
const url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';
console.log(`Testing CoinGecko: ${url}`);
https.get(url, (res) => {
    console.log('Status:', res.statusCode);
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => console.log('Body:', data));
}).on('error', e => console.log('Error:', e.message));
