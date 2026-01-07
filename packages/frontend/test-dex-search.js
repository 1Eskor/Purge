
const https = require('https');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try { resolve(JSON.parse(data)); } catch (e) { resolve(data); }
                } else {
                    reject(new Error(`Status ${res.statusCode}: ${data}`));
                }
            });
        });
        req.on('error', reject);
    });
}

async function test() {
    const query = "PONKE";
    console.log(`Testing DexScreener Search for '${query}'...`);

    try {
        const data = await fetchUrl(`https://api.dexscreener.com/latest/dex/search/?q=${query}`);
        if (data.pairs && data.pairs.length > 0) {
            console.log(`Found ${data.pairs.length} pairs.`);
            // Filter for Solana pairs
            const solPairs = data.pairs.filter(p => p.chainId === 'solana');
            console.log(`Found ${solPairs.length} Solana pairs.`);

            if (solPairs.length > 0) {
                const top = solPairs[0];
                console.log("Top Result:");
                console.log("  Symbol:", top.baseToken.symbol);
                console.log("  Name:", top.baseToken.name);
                console.log("  Address:", top.baseToken.address);
                console.log("  Liquidity:", top.liquidity?.usd);
            }
        } else {
            console.log("No pairs found.");
        }
    } catch (e) {
        console.error("DexScreener Search Failed:", e.message);
    }
}

test();
