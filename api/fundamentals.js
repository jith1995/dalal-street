export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  const nseSymbol = symbol.replace(".NS", "").replace(".BO", "").toUpperCase();

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com",
    "X-Requested-With": "XMLHttpRequest",
  };

  try {
    // NSE requires session cookie
    const sessionRes = await fetch("https://www.nseindia.com", { headers: HEADERS });
    const rawCookies = sessionRes.headers.get("set-cookie") || "";
    const cookieStr = rawCookies.split(",").map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");

    const headersWithCookie = { ...HEADERS, "Cookie": cookieStr };

    // Fetch quote-equity and financial details in parallel
    const [quoteRes, finRes] = await Promise.all([
      fetch(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(nseSymbol)}`, {
        headers: headersWithCookie, signal: AbortSignal.timeout(10000),
      }),
      fetch(`https://www.nseindia.com/api/quote-equity?symbol=${encodeURIComponent(nseSymbol)}&section=trade_info`, {
        headers: headersWithCookie, signal: AbortSignal.timeout(10000),
      }),
    ]);

    if (!quoteRes.ok) return res.status(quoteRes.status).json({ error: `NSE returned ${quoteRes.status}` });

    const quote = await quoteRes.json();
    const tradeInfo = finRes.ok ? await finRes.json() : {};

    const metadata  = quote.metadata  || {};
    const priceInfo = quote.priceInfo  || {};
    const secInfo   = quote.securityInfo || {};
    const info      = quote.info || {};

    const pe       = metadata.pdSymbolPe  ? parseFloat(metadata.pdSymbolPe)  : null;
    const sectorPe = metadata.pdSectorPe  ? parseFloat(metadata.pdSectorPe)  : null;
    const price    = priceInfo.lastPrice  || priceInfo.close || null;
    const eps      = (pe && price)        ? parseFloat((price / pe).toFixed(2)) : null;
    const faceVal  = secInfo.faceValue    || null;
    const issued   = secInfo.issuedSize   || null;

    // Market cap = issued shares × current price (in INR, convert to crores)
    const marketCapINR = (issued && price) ? issued * price : null;  // raw INR
    // Store in same units as Yahoo (raw rupees) for our formatter
    const marketCap = marketCapINR;

    // Dividend yield from trade info
    const mktDeptOrder = tradeInfo.marketDeptOrderBook || {};
    const tradeInfoData = tradeInfo.tradeInfo || {};
    const deliveryPct = tradeInfoData.deliveryToTradedQuantity ? parseFloat(tradeInfoData.deliveryToTradedQuantity) : null;

    // 52W high/low
    const weekHigh = priceInfo.weekHighLow?.max || null;
    const weekLow  = priceInfo.weekHighLow?.min || null;

    return res.status(200).json({
      fundamentals: {
        pe,
        forwardPe:      null,
        pb:             null,
        eps,
        marketCap,
        beta:           null,
        dividendYield:  null,
        roe:            null,
        revenueGrowth:  null,
        grossMargins:   null,
        debtToEquity:   null,
        currentRatio:   null,
        sectorPe,
        deliveryPct,
        faceValue:      faceVal,
        weekHigh,
        weekLow,
        industry:       info.industry || null,
        source:         "nse",
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
