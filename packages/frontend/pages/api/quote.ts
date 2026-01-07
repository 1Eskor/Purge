import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { src, dst, amount, chainId } = req.query;

    if (!src || !dst || !amount || !chainId) {
        return res.status(400).json({ error: 'Missing required query params' });
    }

    const apiKey = process.env.NEXT_PUBLIC_1INCH_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '1inch API key not configured' });
    }

    const url = `https://api.1inch.dev/swap/v6.0/${chainId}/quote?src=${src}&dst=${dst}&amount=${amount}&includeTokensInfo=true&includeProtocols=true`;

    try {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                Accept: 'application/json',
            },
        });

        if (!response.ok) {
            const txt = await response.text();
            return res.status(response.status).json({ error: txt });
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (err: any) {
        console.error('Proxy error:', err);
        res.status(500).json({ error: err.message });
    }
}
