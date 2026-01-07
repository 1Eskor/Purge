
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
    // 2EVJnSEVzvZAMvKKDXWwwVUFr4nJDMU9S9HBiVSyQHBt
    const inputMint = "2EVJnSEVzvZAMvKKDXWwwVUFr4nJDMU9S9HBiVSyQHBt";
    const outputMint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // USDC
    // 1000 tokens * 10^? (Assume 9 decimals? need to check decimals)
    // Actually let's fetch token info first to get decimals.

    let decimals = 9;
    try {
        // Try DexScreener for decimals since Jup might be blocked
        const dexData = await fetchUrl(`https://api.dexscreener.com/latest/dex/tokens/${inputMint}`);
        const pair = dexData.pairs?.find(p => p.chainId === 'solana');
        if (pair) {
            console.log("Token:", pair.baseToken.name, `(${pair.baseToken.symbol})`);
            console.log("Price USD:", pair.priceUsd);
        }
    } catch (e) {
        console.log("DexScreener check failed:", e.message);
    }

    const amount = "100000" + "000000000"; // 100,000 tokens with 9 decimals assumption
    const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;

    console.log("\nTesting Jupiter Quote API:");
    console.log(url);

    try {
        const quote = await fetchUrl(url);
        console.log("Success!");
        console.log("In Amount:", quote.inAmount);
        console.log("Out Amount (USDC units):", quote.outAmount);
        const usdc = parseFloat(quote.outAmount) / 1000000;
        console.log("Out Amount (USDC):", usdc);
    } catch (e) {
        console.log("Quote API Failed:", e.message.substring(0, 100));
    }
}

test();
