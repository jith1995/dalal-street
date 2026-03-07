export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") return res.status(200).end();

  const symbol = req.query.symbol || "TCS.NS";

  const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://finance.yahoo.com",
  };

  const log = [];

  try {
    // Step 1: cookie
    const cookieRes = await fetch("https://finance.yahoo.com", { headers: HEADERS });
    const rawCookies = cookieRes.headers.get("set-cookie") || "";
    const cookieStr = rawCookies.split(",").map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");
    log.push({ step: "cookie", status: cookieRes.status, cookieStr: cookieStr.slice(0, 100) });

    // Step 2: crumb
    const crumbRes = await fetch("https://query2.finance.yahoo.com/v1/test/getcrumb", {
      headers: { ...HEADERS, "Cookie": cookieStr },
    });
    const crumb = await crumbRes.text();
    log.push({ step: "crumb", status: crumbRes.status, crumb });

    // Step 3: v10 quoteSummary
    const url1 = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=summaryDetail,defaultKeyStatistics,financialData&crumb=${encodeURIComponent(crumb)}`;
    const r1 = await fetch(url1, { headers: { ...HEADERS, "Cookie": cookieStr } });
    const d1 = await r1.json();
    log.push({ step: "v10quoteSummary", status: r1.status, result: JSON.stringify(d1).slice(0, 500) });

    // Step 4: v7 quote
    const url2 = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const r2 = await fetch(url2, { headers: HEADERS });
    const d2 = await r2.json();
    const q = d2.quoteResponse?.result?.[0] || {};
    log.push({ step: "v7quote", status: r2.status, pe: q.trailingPE, eps: q.epsTrailingTwelveMonths, marketCap: q.marketCap, beta: q.beta });

    // Step 5: v8 chart (control - we know this works)
    const url3 = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const r3 = await fetch(url3, { headers: HEADERS });
    log.push({ step: "v8chart_control", status: r3.status });

    return res.status(200).json({ log });
  } catch (e) {
    return res.status(500).json({ error: e.message, log });
  }
}
