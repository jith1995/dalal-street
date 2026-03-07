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
    // Step 1: get cookies + crumb
    const cookieRes = await fetch("https://finance.yahoo.com", { headers: HEADERS });
    const rawCookies = cookieRes.headers.get("set-cookie") || "";
    const cookieStr = rawCookies.split(",").map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");

    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...HEADERS, "Cookie": cookieStr },
    });
    const crumb = await crumbRes.text();

    if (!crumb || crumb.includes("{")) {
      return fallbackQuote(symbol, res, HEADERS);
    }

    // Step 2: fetch quoteSummary with crumb
    const modules = "summaryDetail,defaultKeyStatistics,financialData";
    const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}&crumb=${encodeURIComponent(crumb)}`;
    const dataRes = await fetch(url, {
      headers: { ...HEADERS, "Cookie": cookieStr },
    });

    if (!dataRes.ok) return fallbackQuote(symbol, res, HEADERS);

    const data = await dataRes.json();
    const result = data.quoteSummary?.result?.[0];
    if (!result) return fallbackQuote(symbol, res, HEADERS);

    const sd = result.summaryDetail || {};
    const ks = result.defaultKeyStatistics || {};
    const fd = result.financialData || {};

    return res.status(200).json({
      fundamentals: {
        pe:            sd.trailingPE?.raw        ?? null,
        forwardPe:     sd.forwardPE?.raw         ?? null,
        pb:            ks.priceToBook?.raw        ?? null,
        eps:           ks.trailingEps?.raw        ?? null,
        marketCap:     sd.marketCap?.raw          ?? null,
        beta:          sd.beta?.raw               ?? null,
        dividendYield: sd.dividendYield?.raw      ?? null,
        roe:           fd.returnOnEquity?.raw     ?? null,
        revenueGrowth: fd.revenueGrowth?.raw      ?? null,
        grossMargins:  fd.grossMargins?.raw       ?? null,
        debtToEquity:  fd.debtToEquity?.raw       ?? null,
        currentRatio:  fd.currentRatio?.raw       ?? null,
        source: "quoteSummary",
      }
    });

  } catch (e) {
    return fallbackQuote(symbol, res, HEADERS);
  }
}

async function fallbackQuote(symbol, res, HEADERS) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const r = await fetch(url, { headers: HEADERS });
    if (!r.ok) return res.status(r.status).json({ error: `Yahoo v7 returned ${r.status}` });
    const data = await r.json();
    const q = data.quoteResponse?.result?.[0];
    if (!q) return res.status(404).json({ error: "No data from fallback" });

    return res.status(200).json({
      fundamentals: {
        pe:            q.trailingPE                  ?? null,
        forwardPe:     q.forwardPE                   ?? null,
        pb:            q.priceToBook                 ?? null,
        eps:           q.epsTrailingTwelveMonths      ?? null,
        marketCap:     q.marketCap                   ?? null,
        beta:          q.beta                        ?? null,
        dividendYield: q.trailingAnnualDividendYield  ?? null,
        roe:           null,
        revenueGrowth: null,
        grossMargins:  null,
        debtToEquity:  null,
        currentRatio:  null,
        source: "v7quote",
      }
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
