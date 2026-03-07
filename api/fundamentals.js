// Yahoo Finance v8/chart meta already contains PE, market cap, beta etc.
// No crumb needed — same endpoint as our price data.
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com",
  };

  try {
    // v8/chart works without auth and meta contains fundamental fields
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d&includePrePost=false`;
    const r = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    if (!r.ok) return res.status(r.status).json({ error: `Yahoo returned ${r.status}` });

    const data = await r.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (!meta) return res.status(404).json({ error: "No meta in chart response" });

    // These fields live directly on meta
    return res.status(200).json({
      fundamentals: {
        pe:            meta.trailingPE            ?? null,
        forwardPe:     null,                              // not in v8
        pb:            null,                              // not in v8
        eps:           null,                              // not in v8
        marketCap:     meta.marketCap             ?? null,
        beta:          null,                              // not in v8
        dividendYield: null,                              // not in v8
        roe:           null,
        revenueGrowth: null,
        grossMargins:  null,
        debtToEquity:  null,
        currentRatio:  null,
        source: "v8chart_meta",
        // Return raw meta so we can inspect what's actually available
        _raw: meta,
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
