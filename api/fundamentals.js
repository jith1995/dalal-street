// NSE India API - no auth required, real fundamental data for Indian stocks
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  // Strip .NS suffix → NSE symbol
  const nseSymbol = symbol.replace(".NS", "").replace(".BO", "");

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com",
    "X-Requested-With": "XMLHttpRequest",
  };

  try {
    // NSE requires a session cookie - hit the homepage first
    const sessionRes = await fetch("https://www.nseindia.com", { headers: HEADERS });
    const rawCookies = sessionRes.headers.get("set-cookie") || "";
    const cookieStr = rawCookies.split(",").map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");

    // NSE quote API
    const url = `https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(nseSymbol)}`;
    const r = await fetch(url, {
      headers: { ...HEADERS, "Cookie": cookieStr },
      signal: AbortSignal.timeout(10000),
    });

    if (!r.ok) return res.status(r.status).json({ error: `NSE returned ${r.status}`, symbol: nseSymbol });

    const data = await r.json();
    const info = data.info || {};
    const metadata = data.metadata || {};
    const priceInfo = data.priceInfo || {};
    const securityInfo = data.securityInfo || {};
    const industryInfo = data.industryInfo || {};

    // PE from NSE
    const pe = metadata.pdSymbolPe ? parseFloat(metadata.pdSymbolPe) : null;
    const sectorPe = metadata.pdSectorPe ? parseFloat(metadata.pdSectorPe) : null;
    const pb = metadata.pdSymbolPb ? parseFloat(metadata.pdSymbolPb) : null;
    const marketCap = metadata.totalTradedValue ? null : null; // NSE doesn't give mcap here
    const eps = pe && priceInfo.lastPrice ? priceInfo.lastPrice / pe : null;
    const dividendYield = metadata.pdSectorPe ? null : null;

    return res.status(200).json({
      fundamentals: {
        pe,
        forwardPe:     null,
        pb,
        eps,
        marketCap:     null,
        beta:          null,
        dividendYield: null,
        roe:           null,
        revenueGrowth: null,
        grossMargins:  null,
        debtToEquity:  null,
        currentRatio:  null,
        sectorPe,
        source: "nse",
        _raw: { info, metadata, priceInfo, securityInfo },
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message, symbol: nseSymbol });
  }
}
