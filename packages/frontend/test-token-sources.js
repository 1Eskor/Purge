
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
    // The token user explicitly mentioned in text
    // 5uTwG3y3F5cx4YkodgTjWEHDrX5HDKZ5bZZ72x8eQ6zE appears to be "PURGE" token or similar? Or unrelated?
    // Let's test both.
    const tokens = [
        "5uTwG3y3F5cx4YkodgTjWEHDrX5HDKZ5bZZ72x8eQ6zE",
        "5z3EqYQo9HiCEs3R84RCDMu2n7anpDMxRhdK8PSWmrRC"
    ];

    for (const mint of tokens) {
        console.log(`\nTesting Mint: ${mint}`);

        // 1. Jupiter (Known to fail, but let's confirm behavior)
        try {
            console.log("- Jupiter API:");
            await fetchUrl(`https://tokens.jup.ag/token/${mint}`);
            console.log("  Success (Unexpected)");
        } catch (e) {
            console.log("  Failed (Expected):", e.message.substring(0, 50));
        }

        // 2. CoinGecko (Current Fallback)
        try {
            console.log("- CoinGecko:");
            const data = await fetchUrl(`https://api.coingecko.com/api/v3/coins/solana/contract/${mint}`);
            console.log("  Success:", data.name, data.symbol);
        } catch (e) {
            console.log("  Failed:", e.message.substring(0, 50));
        }

        // 3. DexScreener (Proposed New Source)
        try {
            console.log("- DexScreener:");
            const data = await fetchUrl(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
            if (data.pairs && data.pairs.length > 0) {
                const p = data.pairs[0];
                console.log("  Success:", p.baseToken.name, p.baseToken.symbol);
            } else {
                console.log("  Success but no pairs found");
            }
        } catch (e) {
            console.log("  Failed:", e.message.substring(0, 50));
        }
    }
}

test();
