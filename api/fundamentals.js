export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Max-Age", "86400");

  if (req.method === "OPTIONS") return res.status(200).end();

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    const modules = "summaryDetail,defaultKeyStatistics,financialData";
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=${modules}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://finance.yahoo.com",
      },
    });

    if (!response.ok) return res.status(response.status).json({ error: `Yahoo returned ${response.status}` });

    const data = await response.json();
    const result = data.quoteSummary?.result?.[0];
    if (!result) return res.status(404).json({ error: "No data" });

    const sd = result.summaryDetail || {};
    const ks = result.defaultKeyStatistics || {};
    const fd = result.financialData || {};

    // Extract and normalise the fields we care about
    const fundamentals = {
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
    };

    return res.status(200).json({ fundamentals });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
