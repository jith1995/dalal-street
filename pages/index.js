export const dynamic = "force-dynamic";
import { useState, useEffect, useRef } from "react";

// ── THEME ─────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0f1629", bgCard: "#1a2340", bgHover: "#1e2a4a",
  border: "#2a3a5c", borderLight: "#334466",
  text: "#e2e8f0", textMuted: "#94a3b8", textFaint: "#4a6080",
  green: "#22c55e", greenBg: "rgba(34,197,94,0.1)", greenBorder: "rgba(34,197,94,0.25)",
  red: "#ef4444", redBg: "rgba(239,68,68,0.1)", redBorder: "rgba(239,68,68,0.25)",
  yellow: "#eab308", yellowBg: "rgba(234,179,8,0.1)", yellowBorder: "rgba(234,179,8,0.25)",
  blue: "#3b82f6", blueBg: "rgba(59,130,246,0.1)", blueBorder: "rgba(59,130,246,0.25)",
  accent: "#6366f1",
};

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const SECTORS = [
  { id: "it",      name: "Information Technology", color: "#3b82f6", stocks: ["TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS","TECHM.NS"] },
  { id: "banking", name: "Banking & Finance",       color: "#10b981", stocks: ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","AXISBANK.NS","BAJFINANCE.NS"] },
  { id: "energy",  name: "Energy & Oil",            color: "#f59e0b", stocks: ["RELIANCE.NS","ONGC.NS","NTPC.NS"] },
  { id: "auto",    name: "Automobiles",             color: "#f97316", stocks: ["MARUTI.NS","TATAMOTORS.NS","BAJAJAUT.NS"] },
  { id: "pharma",  name: "Pharma & Health",         color: "#a855f7", stocks: ["SUNPHARMA.NS","DRREDDY.NS"] },
  { id: "fmcg",    name: "FMCG",                    color: "#ec4899", stocks: ["HINDUNILVR.NS","ITC.NS"] },
];

const ALL_STOCKS = [
  { symbol: "RELIANCE.NS",  name: "Reliance Industries",          short: "RELIANCE",     sector: "Energy & Oil" },
  { symbol: "TCS.NS",       name: "Tata Consultancy Services",    short: "TCS",          sector: "Information Technology" },
  { symbol: "HDFCBANK.NS",  name: "HDFC Bank",                   short: "HDFC BANK",    sector: "Banking & Finance" },
  { symbol: "INFY.NS",      name: "Infosys",                      short: "INFOSYS",      sector: "Information Technology" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank",                   short: "ICICI BANK",   sector: "Banking & Finance" },
  { symbol: "WIPRO.NS",     name: "Wipro",                        short: "WIPRO",        sector: "Information Technology" },
  { symbol: "SBIN.NS",      name: "State Bank of India",          short: "SBI",          sector: "Banking & Finance" },
  { symbol: "BAJFINANCE.NS",name: "Bajaj Finance",                short: "BAJAJ FIN",    sector: "Banking & Finance" },
  { symbol: "MARUTI.NS",    name: "Maruti Suzuki",                short: "MARUTI",       sector: "Automobiles" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical",           short: "SUN PHARMA",   sector: "Pharma & Health" },
  { symbol: "HCLTECH.NS",   name: "HCL Technologies",             short: "HCL TECH",     sector: "Information Technology" },
  { symbol: "TATAMOTORS.NS",name: "Tata Motors",                  short: "TATA MOTORS",  sector: "Automobiles" },
  { symbol: "AXISBANK.NS",  name: "Axis Bank",                    short: "AXIS BANK",    sector: "Banking & Finance" },
  { symbol: "ONGC.NS",      name: "Oil & Natural Gas Corp",       short: "ONGC",         sector: "Energy & Oil" },
  { symbol: "NTPC.NS",      name: "NTPC Limited",                 short: "NTPC",         sector: "Energy & Oil" },
  { symbol: "ITC.NS",       name: "ITC Limited",                  short: "ITC",          sector: "FMCG" },
  { symbol: "HINDUNILVR.NS",name: "Hindustan Unilever",           short: "HUL",          sector: "FMCG" },
  { symbol: "DRREDDY.NS",   name: "Dr Reddy's Laboratories",      short: "DR REDDY",     sector: "Pharma & Health" },
  { symbol: "TECHM.NS",     name: "Tech Mahindra",                short: "TECH MAHINDRA",sector: "Information Technology" },
  { symbol: "BAJAJAUT.NS",  name: "Bajaj Auto",                   short: "BAJAJ AUTO",   sector: "Automobiles" },
];

const PROXY_BASE = "/api/stock";

// ── 7-PILLAR SCORING ENGINE (Technical 60% + Fundamental 40%) ────────────────
function scoreStock(d, f) {
  if (!d) return null;

  // ── TECHNICAL PILLARS (60%) ─────────────────────────────────────────────────

  // PILLAR 1: MOMENTUM (20%) — price returns + RSI
  let momentum = 50;
  if (d.returns.d10 != null) momentum += Math.min(20, Math.max(-20, d.returns.d10 * 2));
  if (d.returns.d30 != null) momentum += Math.min(15, Math.max(-15, d.returns.d30 * 0.8));
  if (d.returns.d100 != null) momentum += Math.min(15, Math.max(-15, d.returns.d100 * 0.3));
  if (d.rsi != null) {
    if (d.rsi < 30) momentum += 15;
    else if (d.rsi < 45) momentum += 8;
    else if (d.rsi > 75) momentum -= 15;
    else if (d.rsi > 65) momentum -= 8;
  }
  momentum = Math.min(100, Math.max(0, momentum));

  // PILLAR 2: TREND STRENGTH (15%) — price vs MAs
  let trend = 50;
  if (d.sma20 != null) trend += d.current > d.sma20 ? 15 : -15;
  if (d.sma50 != null) trend += d.current > d.sma50 ? 15 : -15;
  if (d.sma200 != null) trend += d.current > d.sma200 ? 20 : -20;
  if (d.crossSignal === "GOLDEN") trend += 15;
  if (d.crossSignal === "DEATH") trend -= 15;
  trend = Math.min(100, Math.max(0, trend));

  // PILLAR 3: VOLUME CONFIRMATION (10%) — volume anomalies
  let volume = 50;
  if (d.volRatio != null) {
    if (d.volRatio > 2 && d.changePct > 0) volume += 30;
    else if (d.volRatio > 2 && d.changePct < 0) volume -= 20;
    else if (d.volRatio > 1.3) volume += 10;
    else if (d.volRatio < 0.5) volume -= 10;
  }
  volume = Math.min(100, Math.max(0, volume));

  // PILLAR 4: VALUE POSITION (15%) — 52W positioning
  let value = 50;
  if (d.posIn52W != null) {
    if (d.posIn52W < 20) value += 35;
    else if (d.posIn52W < 35) value += 20;
    else if (d.posIn52W < 50) value += 10;
    else if (d.posIn52W > 85) value -= 25;
    else if (d.posIn52W > 70) value -= 10;
  }
  value = Math.min(100, Math.max(0, value));

  // ── FUNDAMENTAL PILLARS (40%) ───────────────────────────────────────────────
  // If no fundamental data → default to neutral 50 (no penalty, no bonus)

  // PILLAR 5: VALUATION — P/E + P/B (20%)
  let valuation = 50;
  if (f?.pe != null) {
    if (f.pe < 0)          valuation = 20;        // negative earnings = concern
    else if (f.pe < 15)    valuation = 95;         // deep value
    else if (f.pe < 25)    valuation = 75;         // fair value
    else if (f.pe < 40)    valuation = 50;         // expensive but growing
    else                   valuation = 25;          // very expensive
  }
  if (f?.pb != null) {
    if (f.pb < 1)  valuation = Math.min(100, valuation + 10);  // below book = bonus
    else if (f.pb > 5) valuation = Math.max(0, valuation - 10); // premium = penalty
  }
  valuation = Math.min(100, Math.max(0, valuation));

  // PILLAR 6: EARNINGS QUALITY — EPS (10%)
  let earnings = 50;
  if (f?.eps != null) {
    if (f.eps > 0) earnings = 70;      // profitable
    else earnings = 25;                 // loss-making
  }
  earnings = Math.min(100, Math.max(0, earnings));

  // PILLAR 7: RISK / BETA (10%)
  let betaScore = 50;
  if (f?.beta != null) {
    if (f.beta < 0.5)      betaScore = 80;  // very defensive
    else if (f.beta < 0.8) betaScore = 90;  // defensive
    else if (f.beta < 1.2) betaScore = 70;  // market-like
    else if (f.beta < 1.5) betaScore = 50;  // moderately volatile
    else                   betaScore = 30;   // high volatility
  }
  betaScore = Math.min(100, Math.max(0, betaScore));

  const hasFundamentals = f?.pe != null || f?.pb != null || f?.eps != null;

  // WEIGHTED COMPOSITE
  const composite = Math.round(
    momentum   * 0.20 +
    trend      * 0.15 +
    volume     * 0.10 +
    value      * 0.15 +
    valuation  * 0.20 +
    earnings   * 0.10 +
    betaScore  * 0.10
  );

  // SIGNAL — tighter thresholds now that fundamentals are included
  let signal, signalColor, signalBg, signalBorder;
  if (composite >= 75)      { signal = "STRONG BUY";  signalColor = "#16a34a"; signalBg = "rgba(22,163,74,0.15)";   signalBorder = "rgba(22,163,74,0.4)"; }
  else if (composite >= 60) { signal = "BUY";          signalColor = "#22c55e"; signalBg = "rgba(34,197,94,0.1)";   signalBorder = "rgba(34,197,94,0.3)"; }
  else if (composite >= 45) { signal = "HOLD";         signalColor = "#eab308"; signalBg = "rgba(234,179,8,0.1)";   signalBorder = "rgba(234,179,8,0.3)"; }
  else if (composite >= 30) { signal = "SELL";         signalColor = "#f97316"; signalBg = "rgba(249,115,22,0.1)";  signalBorder = "rgba(249,115,22,0.3)"; }
  else                      { signal = "STRONG SELL";  signalColor = "#ef4444"; signalBg = "rgba(239,68,68,0.1)";   signalBorder = "rgba(239,68,68,0.3)"; }

  return {
    composite,
    pillars: { momentum, trend, volume, value, valuation, earnings, betaScore },
    hasFundamentals,
    signal, signalColor, signalBg, signalBorder,
  };
}

// ── DATA FETCHING ─────────────────────────────────────────────────────────────
async function fetchStockData(symbol) {
  try {
    const res = await fetch(`${PROXY_BASE}?symbol=${symbol}&range=6mo&interval=1d`, { signal: AbortSignal.timeout(12000) });
    const data = await res.json();
    const result = data.chart.result[0];
    const meta = result.meta;
    const closes  = result.indicators.quote[0].close.map(v => v != null ? v : null);
    const opens   = result.indicators.quote[0].open.map(v => v != null ? v : null);
    const highs   = result.indicators.quote[0].high.map(v => v != null ? v : null);
    const lows    = result.indicators.quote[0].low.map(v => v != null ? v : null);
    const volumes = result.indicators.quote[0].volume.map(v => v || 0);
    const timestamps = result.timestamp;
    const validCloses = closes.filter(Boolean);
    const current = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose;

    const getReturn = (days) => {
      const idx = Math.max(0, validCloses.length - days - 1);
      const past = validCloses[idx];
      return past ? ((current - past) / past) * 100 : null;
    };
    const sma = (days) => {
      const slice = validCloses.slice(-days);
      if (slice.length < Math.min(days, 5)) return null;
      return slice.reduce((a, b) => a + b, 0) / slice.length;
    };
    const ema = (days) => {
      const k = 2 / (days + 1);
      let val = validCloses[0];
      for (let i = 1; i < validCloses.length; i++) val = validCloses[i] * k + val * (1 - k);
      return val;
    };
    const rsiVal = () => {
      const period = 14;
      const slice = validCloses.slice(-period - 1);
      if (slice.length < period + 1) return null;
      let gains = 0, losses = 0;
      for (let i = 1; i < slice.length; i++) {
        const diff = slice[i] - slice[i - 1];
        if (diff > 0) gains += diff; else losses -= diff;
      }
      const avgG = gains / period, avgL = losses / period;
      if (avgL === 0) return 100;
      return 100 - 100 / (1 + avgG / avgL);
    };
    const year = validCloses.slice(-252);
    const high52 = Math.max(...year);
    const low52  = Math.min(...year);
    const posIn52W = ((current - low52) / (high52 - low52)) * 100;
    const avgVol30 = volumes.slice(-30).reduce((a, b) => a + b, 0) / 30;
    const todayVol = volumes[volumes.length - 1] || 0;
    const volRatio = avgVol30 > 0 ? todayVol / avgVol30 : 1;
    const sma20val = sma(20), sma50val = sma(50), sma200val = sma(200);
    const prevSma20 = validCloses.length > 21 ? validCloses.slice(-21,-1).reduce((a,b)=>a+b,0)/20 : null;
    const prevSma50 = validCloses.length > 51 ? validCloses.slice(-51,-1).reduce((a,b)=>a+b,0)/50 : null;
    let crossSignal = "NONE";
    if (prevSma20 && prevSma50 && sma20val && sma50val) {
      if (prevSma20 < prevSma50 && sma20val > sma50val) crossSignal = "GOLDEN";
      if (prevSma20 > prevSma50 && sma20val < sma50val) crossSignal = "DEATH";
    }
    const rsi = rsiVal();
    const history = timestamps.map((t, i) => ({
      date: new Date(t * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      close: closes[i], open: opens[i], high: highs[i], low: lows[i], volume: volumes[i],
    })).filter(d => d.close != null);

    const stockData = {
      symbol, current, prevClose,
      change: current - prevClose,
      changePct: ((current - prevClose) / prevClose) * 100,
      returns: { d10: getReturn(10), d20: getReturn(20), d30: getReturn(30), d100: getReturn(100) },
      sma20: sma20val, sma50: sma50val, sma200: sma200val, ema20: ema(20),
      rsi, high52, low52, posIn52W,
      volRatio, avgVol30, todayVol, crossSignal, history,
    };
    stockData.score = scoreStock(stockData, null); // fundamentals loaded separately
    return stockData;
  } catch (e) { return null; }
}

async function fetchFundamentals(symbol) {
  try {
    const res = await fetch(`/api/fundamentals?symbol=${symbol}`, { signal: AbortSignal.timeout(10000) });
    const data = await res.json();
    return data.fundamentals || null;
  } catch (e) { return null; }
}

async function getClaudeVerdict(d, stockName, score, f) {
  const fundamentalContext = f ? `
Fundamental data:
- P/E: ${f.pe?.toFixed(1) ?? "N/A"} | Forward P/E: ${f.forwardPe?.toFixed(1) ?? "N/A"} | P/B: ${f.pb?.toFixed(2) ?? "N/A"}
- EPS: ${f.eps?.toFixed(2) ?? "N/A"} | Beta: ${f.beta?.toFixed(2) ?? "N/A"} | Div Yield: ${f.dividendYield != null ? (f.dividendYield*100).toFixed(2)+"%" : "N/A"}
- ROE: ${f.roe != null ? (f.roe*100).toFixed(1)+"%" : "N/A"} | Gross Margin: ${f.grossMargins != null ? (f.grossMargins*100).toFixed(1)+"%" : "N/A"}` : "Fundamental data: Not available";

  const prompt = `You are a sharp equity analyst. Based on these indicators for ${stockName}, give a verdict. Return ONLY JSON, no markdown.

Rule-based signal: ${score.signal} (Score: ${score.composite}/100)
Pillar scores: Momentum ${score.pillars.momentum}/100, Trend ${score.pillars.trend}/100, Volume ${score.pillars.volume}/100, Value ${score.pillars.value}/100, Valuation ${score.pillars.valuation}/100, Earnings ${score.pillars.earnings}/100

Technical:
- Price: ${d.current?.toFixed(2)} | Day: ${d.changePct?.toFixed(2)}%
- RSI: ${d.rsi?.toFixed(1)} | D10: ${d.returns?.d10?.toFixed(2)}% | D30: ${d.returns?.d30?.toFixed(2)}% | D100: ${d.returns?.d100?.toFixed(2)}%
- vs SMA20: ${d.current > d.sma20 ? "ABOVE" : "BELOW"} | vs SMA50: ${d.current > d.sma50 ? "ABOVE" : "BELOW"} | vs SMA200: ${d.current > d.sma200 ? "ABOVE" : "BELOW"}
- 52W Position: ${d.posIn52W?.toFixed(1)}% | Volume: ${d.volRatio?.toFixed(2)}x | Cross: ${d.crossSignal}
${fundamentalContext}

Return JSON:
{"rsi_signal":"one sentence","trend_signal":"one sentence","fundamental_take":"one sentence on valuation and fundamentals","key_risk":"one sentence","summary":"2 sentence combined technical and fundamental analyst take"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 700, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  const text = data.content.map(c => c.text || "").join("");
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

// ── MINI COMPONENTS ───────────────────────────────────────────────────────────
function Card({ children, style = {} }) {
  return <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, ...style }}>{children}</div>;
}
function SectionLabel({ children }) {
  return <div style={{ color: T.textFaint, fontSize: 10, letterSpacing: "1.2px", marginBottom: 10, textTransform: "uppercase", fontFamily: "JetBrains Mono" }}>{children}</div>;
}

function SignalBadge({ signal, signalColor, signalBg, signalBorder, size = "sm" }) {
  if (!signal) return null;
  return (
    <div style={{
      background: signalBg, color: signalColor, border: `1px solid ${signalBorder}`,
      borderRadius: 6, padding: size === "lg" ? "7px 18px" : "3px 9px",
      fontSize: size === "lg" ? 14 : 11, fontWeight: 700,
      display: "inline-block", letterSpacing: "0.5px", fontFamily: "JetBrains Mono",
    }}>{signal}</div>
  );
}

function PillarBar({ label, score, description }) {
  const color = score >= 65 ? T.green : score >= 40 ? T.yellow : T.red;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
        <span style={{ color: T.textMuted, fontSize: 12, fontWeight: 500 }}>{label}</span>
        <span style={{ color, fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{score}/100</span>
      </div>
      <div style={{ height: 6, background: T.border, borderRadius: 3, overflow: "hidden", marginBottom: 3 }}>
        <div style={{
          height: "100%", width: `${score}%`, borderRadius: 3,
          background: `linear-gradient(90deg, ${color}88, ${color})`,
          transition: "width 0.8s ease",
        }} />
      </div>
      {description && <div style={{ color: T.textFaint, fontSize: 10, lineHeight: 1.4 }}>{description}</div>}
    </div>
  );
}

function ScoreRing({ score, signal, signalColor }) {
  const r = 40, circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = signal === "STRONG BUY" ? "#16a34a" : signal === "BUY" ? T.green : signal === "HOLD" ? T.yellow : signal === "SELL" ? "#f97316" : T.red;
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="100" height="100" viewBox="0 0 100 100" style={{ display: "block", margin: "0 auto" }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={T.border} strokeWidth="8" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
          transform="rotate(-90 50 50)" style={{ transition: "stroke-dasharray 1s ease" }} />
        <text x="50" y="45" textAnchor="middle" fill={color} fontSize="20" fontWeight="800" fontFamily="JetBrains Mono">{score}</text>
        <text x="50" y="60" textAnchor="middle" fill={T.textFaint} fontSize="9" fontFamily="JetBrains Mono">/ 100</text>
      </svg>
      <div style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: "0.5px", marginTop: 4, fontFamily: "JetBrains Mono" }}>{signal}</div>
    </div>
  );
}

function SparkLine({ history, change, width = 100, height = 36 }) {
  if (!history || history.length < 2) return null;
  const prices = history.map(h => h.close).filter(Boolean);
  if (prices.length < 2) return null;
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 1;
  const color = change >= 0 ? T.green : T.red;
  const pts = prices.map((p, i) => `${(i / (prices.length - 1)) * width},${height - ((p - min) / range) * height}`).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`g${change >= 0 ? "u" : "d"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#g${change >= 0 ? "u" : "d"})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function CandlestickChart({ history, sma20, sma50 }) {
  if (!history || history.length < 5) return <div style={{ color: T.textFaint, fontSize: 12, padding: 20 }}>Loading chart...</div>;
  const W = 680, H = 200, PAD = { top: 10, right: 10, bottom: 24, left: 55 };
  const chartW = W - PAD.left - PAD.right, chartH = H - PAD.top - PAD.bottom;
  const candles = history.slice(-60);
  const allP = candles.flatMap(c => [c.high, c.low]).filter(Boolean);
  const minP = Math.min(...allP) * 0.998, maxP = Math.max(...allP) * 1.002, range = maxP - minP || 1;
  const xS = i => PAD.left + (i / (candles.length - 1)) * chartW;
  const yS = p => PAD.top + chartH - ((p - minP) / range) * chartH;
  const cw = Math.max(2, Math.floor(chartW / candles.length) - 2);
  const sma20pts = candles.map((_, i) => { const sl = candles.slice(Math.max(0,i-19),i+1).map(c=>c.close).filter(Boolean); return `${xS(i)},${yS(sl.reduce((a,b)=>a+b,0)/sl.length)}`; }).join(" ");
  const sma50pts = candles.map((_, i) => { const sl = candles.slice(Math.max(0,i-49),i+1).map(c=>c.close).filter(Boolean); return `${xS(i)},${yS(sl.reduce((a,b)=>a+b,0)/sl.length)}`; }).join(" ");
  const yLabels = [0,0.25,0.5,0.75,1].map(f => ({ y: PAD.top + chartH*(1-f), val: (minP+f*range).toFixed(0) }));
  const xLabels = candles.map((c,i) => ({i,label:c.date})).filter((_,i) => i % Math.ceil(candles.length/6) === 0 || i === candles.length-1);
  return (
    <div style={{ overflowX: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {yLabels.map((l,i) => (
          <g key={i}>
            <line x1={PAD.left} y1={l.y} x2={W-PAD.right} y2={l.y} stroke={T.border} strokeWidth="1" strokeDasharray="3,4" />
            <text x={PAD.left-6} y={l.y+4} textAnchor="end" fill={T.textFaint} fontSize="9" fontFamily="monospace">{Number(l.val).toLocaleString("en-IN")}</text>
          </g>
        ))}
        {candles.map((c,i) => {
          if (!c.open||!c.close||!c.high||!c.low) return null;
          const isG = c.close >= c.open;
          const col = isG ? T.green : T.red;
          const bTop = yS(Math.max(c.open,c.close)), bBot = yS(Math.min(c.open,c.close));
          return (
            <g key={i}>
              <line x1={xS(i)} y1={yS(c.high)} x2={xS(i)} y2={yS(c.low)} stroke={col} strokeWidth="1" opacity="0.7" />
              <rect x={xS(i)-cw/2} y={bTop} width={cw} height={Math.max(1,bBot-bTop)} fill={col} fillOpacity={isG?0.8:0.9} stroke={col} strokeWidth="0.5" />
            </g>
          );
        })}
        <polyline points={sma20pts} fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4,3" opacity="0.85" />
        <polyline points={sma50pts} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="4,3" opacity="0.85" />
        {xLabels.map((l,i) => <text key={i} x={xS(l.i)} y={H-6} textAnchor="middle" fill={T.textFaint} fontSize="9" fontFamily="monospace">{l.label}</text>)}
      </svg>
      <div style={{ display: "flex", gap: 16, marginTop: 6 }}>
        {[{color:T.green,label:"Bullish"},{color:T.red,label:"Bearish"},{color:"#f59e0b",label:"SMA 20",dash:true},{color:"#3b82f6",label:"SMA 50",dash:true}].map((item,i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 16, height: 2, background: item.dash ? "none" : item.color, borderTop: item.dash ? `2px dashed ${item.color}` : "none" }} />
            <span style={{ color: T.textFaint, fontSize: 10 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RSIGauge({ value }) {
  if (!value) return null;
  const color = value > 70 ? T.red : value < 30 ? T.green : T.yellow;
  const label = value > 70 ? "OVERBOUGHT" : value < 30 ? "OVERSOLD" : "NEUTRAL";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="90" height="50" viewBox="0 0 90 50" style={{ display: "block", margin: "0 auto" }}>
        <path d="M10,45 A35,35 0 0,1 80,45" fill="none" stroke={T.border} strokeWidth="7" strokeLinecap="round" />
        <path d="M10,45 A35,35 0 0,1 80,45" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${(value/100)*109.9} 109.9`} />
        <text x="45" y="42" textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="monospace">{value.toFixed(0)}</text>
      </svg>
      <div style={{ color, fontSize: 10, letterSpacing: "1px", marginTop: 2, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function ReturnPill({ label, value }) {
  const isPos = value != null && value >= 0;
  const color = value == null ? T.textFaint : isPos ? T.green : T.red;
  const bg = value == null ? T.bgCard : isPos ? T.greenBg : T.redBg;
  const border = value == null ? T.border : isPos ? T.greenBorder : T.redBorder;
  return (
    <div style={{ textAlign: "center", padding: "10px 8px", background: bg, border: `1px solid ${border}`, borderRadius: 8 }}>
      <div style={{ color: T.textMuted, fontSize: 10, marginBottom: 5 }}>{label}</div>
      <div style={{ color, fontSize: 15, fontWeight: 700, fontFamily: "JetBrains Mono" }}>
        {value != null ? `${isPos ? "+" : ""}${value.toFixed(2)}%` : "—"}
      </div>
    </div>
  );
}

function PositionBar({ value, low, high }) {
  const pct = Math.min(100, Math.max(0, value || 0));
  const color = pct > 75 ? T.red : pct > 40 ? T.yellow : T.green;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ color: T.textMuted, fontSize: 11 }}>52W Low ₹{low?.toFixed(0)}</span>
        <span style={{ color: T.textMuted, fontSize: 11 }}>52W High ₹{high?.toFixed(0)}</span>
      </div>
      <div style={{ height: 8, background: T.border, borderRadius: 4, position: "relative" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${T.green}, ${color})`, borderRadius: 4, transition: "width 1s ease" }} />
        <div style={{ position: "absolute", top: -4, left: `${pct}%`, transform: "translateX(-50%)", width: 16, height: 16, borderRadius: "50%", background: color, border: `2px solid ${T.bg}`, boxShadow: `0 0 8px ${color}66` }} />
      </div>
      <div style={{ textAlign: "center", marginTop: 10, color, fontSize: 13, fontWeight: 700 }}>{pct.toFixed(1)}% of 52-week range</div>
    </div>
  );
}

// ── GUIDE DATA ────────────────────────────────────────────────────────────────
const GUIDE_SECTIONS = [
  {
    title: "Signal Guide",
    emoji: "🎯",
    items: [
      { term: "STRONG BUY", color: "#16a34a", desc: "Score 75+. Strong technical setup AND healthy fundamentals — momentum, trend, valuation, and earnings all aligned. High conviction entry." },
      { term: "BUY", color: T.green, desc: "Score 60–74. More positives than negatives across technical and fundamental pillars. Good setup — consider entering on dips." },
      { term: "HOLD", color: T.yellow, desc: "Score 45–59. Mixed signals across pillars. Neither compelling to buy nor urgent to sell. Wait for clearer direction." },
      { term: "SELL", color: "#f97316", desc: "Score 30–44. Technical and/or fundamental deterioration. Trend weakening, valuation stretched or earnings declining. Consider reducing position." },
      { term: "STRONG SELL", color: T.red, desc: "Score below 30. Multiple red flags across technical and fundamental pillars. High risk of further downside." },
    ]
  },
  {
    title: "The 7 Pillars Explained",
    emoji: "🏛️",
    items: [
      { term: "Momentum (20%) — Technical", color: T.blue, desc: "Measures price velocity using D10, D30, D100 returns and RSI. High momentum = stock is accelerating. RSI below 30 = oversold bounce opportunity. RSI above 70 = overbought, caution." },
      { term: "Trend Strength (15%) — Technical", color: T.blue, desc: "Checks if price is above or below SMA20, SMA50, SMA200. Price above all 3 = strong uptrend. Golden Cross (SMA20 crosses above SMA50) is a powerful bullish signal." },
      { term: "Volume Confirmation (10%) — Technical", color: T.blue, desc: "A price move on high volume is more significant than the same move on low volume. Big up day with 2x+ normal volume = conviction buying. Big down day on high volume = distribution." },
      { term: "Value Position (15%) — Technical", color: T.blue, desc: "Where is the stock in its 52-week range? Near the 52W low = potential value zone. Near 52W high = limited upside, higher pullback risk." },
      { term: "Valuation (20%) — Fundamental", color: T.accent, desc: "Combines P/E and P/B ratios. P/E below 15 scores 90-100 (deep value). P/E above 40 scores 10-35 (very expensive). P/B below 1 = trading below book value (bonus). This is the highest fundamental weight." },
      { term: "Earnings Quality (10%) — Fundamental", color: T.accent, desc: "Checks EPS (Earnings Per Share). Positive EPS = company is profitable = 70/100. Negative EPS = loss-making = 25/100. A simple but critical filter — losses compound downside risk." },
      { term: "Beta / Risk (10%) — Fundamental", color: T.accent, desc: "Beta measures how much the stock moves vs the market. Below 0.8 = defensive (scores 90). 0.8–1.2 = market-like (scores 70). Above 1.5 = high volatility (scores 30). Lower beta = more predictable returns." },
    ]
  },
  {
    title: "KPI Glossary",
    emoji: "📖",
    items: [
      { term: "RSI (Relative Strength Index)", color: T.accent, desc: "A momentum indicator (0-100). Above 70 = overbought (stock may be due for a pullback). Below 30 = oversold (may be due for a bounce). 40-60 = neutral." },
      { term: "SMA (Simple Moving Average)", color: T.accent, desc: "Average closing price over N days. SMA20 = short-term trend. SMA50 = medium-term. SMA200 = long-term. Price above its SMA = bullish, below = bearish." },
      { term: "EMA (Exponential Moving Average)", color: T.accent, desc: "Like SMA but gives more weight to recent prices. Reacts faster to price changes than SMA. Useful for spotting trend changes earlier." },
      { term: "Golden Cross", color: T.accent, desc: "When SMA20 crosses above SMA50 from below. Historically one of the most reliable bullish signals in technical analysis. Institutions often buy on this signal." },
      { term: "Death Cross", color: T.accent, desc: "Opposite of Golden Cross — SMA20 crosses below SMA50. A bearish signal suggesting the short-term trend has turned negative vs medium-term." },
      { term: "52W Position", color: T.accent, desc: "Where current price sits in the 52-week High-Low range. 0% = at the yearly low. 100% = at the yearly high. 20-30% zone often represents good value entry points." },
      { term: "Volume Ratio", color: T.accent, desc: "Today's trading volume divided by 30-day average. 1.0x = normal day. 2x+ = unusually high activity — something is happening. Direction of the price move tells you whether it's accumulation or distribution." },
      { term: "D10 / D20 / D30 / D100", color: T.accent, desc: "Price return over the last 10, 20, 30, and 100 trading days respectively. Helps identify short, medium, and long-term momentum. A stock positive on all 4 is in a strong uptrend." },
      { term: "Momentum Score", color: T.accent, desc: "A composite 0-100 score derived from the 5 pillars. Above 70 = strong technical setup. Below 35 = weak setup. This is the core output of our screening engine." },
    ]
  },
  {
    title: "How to Use This Dashboard",
    emoji: "🗺️",
    items: [
      { term: "Step 1 — Market Overview", color: T.green, desc: "Start here every day. Check sector heatmap — which sectors are advancing? This tells you where the money is flowing today." },
      { term: "Step 2 — Top Picks", color: T.green, desc: "Check the auto-ranked list. Strong Buy stocks at the top are the ones worth investigating further today." },
      { term: "Step 3 — Screener", color: T.green, desc: "Filter by sector, sort by Momentum or 100D Return. Look for stocks with high momentum score + low 52W position (value zone). That combination is interesting." },
      { term: "Step 4 — Deep Dive", color: T.green, desc: "Pick a stock from your shortlist. Check the candlestick chart, pillar breakdown, and Claude's analysis. Form your own view." },
      { term: "Step 5 — Compare", color: T.green, desc: "Torn between two stocks in the same sector? Compare page shows all KPIs side by side. Let the numbers guide you." },
      { term: "Step 6 — Do Your Own Research", color: T.green, desc: "This dashboard surfaces technical signals only. Before acting, go read the news (ET, Mint), check the latest quarterly results, understand the business. Numbers are the starting point, not the end." },
    ]
  },
  {
    title: "Important Disclaimers",
    emoji: "⚠️",
    items: [
      { term: "15-Minute Delay", color: T.red, desc: "All price data is delayed by approximately 15 minutes. This dashboard is for research and analysis, not real-time trading decisions." },
      { term: "Not Financial Advice", color: T.red, desc: "This tool provides technical analysis signals only. It does not consider your personal financial situation, risk tolerance, or investment goals. Always consult a qualified financial advisor before investing." },
      { term: "Technical Analysis Limitations", color: T.red, desc: "Technical signals are based on historical price and volume data. Past performance does not guarantee future results. Fundamental factors (earnings, management, sector tailwinds) are equally important." },
      { term: "Data Source", color: T.red, desc: "All financial data sourced from Yahoo Finance via a personal proxy. While generally accurate, occasional data gaps or errors may occur. Always verify on official BSE/NSE sources before acting." },
    ]
  }
];

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function DalalStreet() {
  const [page, setPage] = useState(1);
  const [stockData, setStockData] = useState({});
  const [fundData, setFundData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState(ALL_STOCKS[0]);
  const [claudeAnalysis, setClaudeAnalysis] = useState(null);
  const [claudeLoading, setClaudeLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [compareList, setCompareList] = useState([ALL_STOCKS[0], ALL_STOCKS[1]]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    async function loadAll() {
      setLoading(true);
      // Load price data first (fast)
      await Promise.all(ALL_STOCKS.map(async (s) => {
        const d = await fetchStockData(s.symbol);
        if (d) setStockData(prev => ({ ...prev, [s.symbol]: d }));
      }));
      setLoading(false);
      // Then load fundamentals in background (slower, non-blocking)
      ALL_STOCKS.forEach(async (s) => {
        const f = await fetchFundamentals(s.symbol);
        if (f) {
          setFundData(prev => ({ ...prev, [s.symbol]: f }));
          // Re-score with fundamentals once available
          setStockData(prev => {
            const d = prev[s.symbol];
            if (!d) return prev;
            return { ...prev, [s.symbol]: { ...d, score: scoreStock(d, f) } };
          });
        }
      });
    }
    loadAll();
  }, []);

  useEffect(() => {
    if (page !== 3) return;
    const d = stockData[selectedStock.symbol];
    if (!d || !d.score) return;
    const f = fundData[selectedStock.symbol] || null;
    setClaudeAnalysis(null);
    setClaudeLoading(true);
    getClaudeVerdict(d, selectedStock.name, d.score, f)
      .then(v => { setClaudeAnalysis(v); setClaudeLoading(false); })
      .catch(() => setClaudeLoading(false));
  }, [selectedStock, page, stockData]);

  const loadedCount = Object.keys(stockData).length;
  const pct = v => v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "—";
  const rupee = v => v != null ? `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })}` : "—";

  const filteredStocks = ALL_STOCKS.filter(s => {
    if (sectorFilter !== "all" && s.sector !== sectorFilter) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.short.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const da = stockData[a.symbol], db = stockData[b.symbol];
    if (!da && !db) return 0; if (!da) return 1; if (!db) return -1;
    if (sortBy === "score")     return (db.score?.composite || 0) - (da.score?.composite || 0);
    if (sortBy === "changePct") return db.changePct - da.changePct;
    if (sortBy === "rsi")       return (db.rsi || 0) - (da.rsi || 0);
    if (sortBy === "vol")       return db.volRatio - da.volRatio;
    if (sortBy === "r100")      return (db.returns?.d100 || 0) - (da.returns?.d100 || 0);
    if (sortBy === "posIn52W")  return da.posIn52W - db.posIn52W;
    return 0;
  });

  const sectorStats = SECTORS.map(sector => {
    const stocks = sector.stocks.map(sym => stockData[sym]).filter(Boolean);
    if (!stocks.length) return { ...sector, avgChange: null, bullish: 0, total: 0, loadedStocks: [] };
    const avgChange = stocks.reduce((a, b) => a + b.changePct, 0) / stocks.length;
    const bullish = stocks.filter(s => s.changePct > 0).length;
    return { ...sector, avgChange, bullish, total: stocks.length, loadedStocks: stocks };
  });

  // Top picks — sorted by composite score
  const allScored = ALL_STOCKS.map(s => ({ ...s, data: stockData[s.symbol] }))
    .filter(s => s.data?.score)
    .sort((a, b) => b.data.score.composite - a.data.score.composite);
  const topBuys = allScored.filter(s => ["STRONG BUY","BUY"].includes(s.data.score.signal)).slice(0, 5);
  const topSells = allScored.filter(s => ["STRONG SELL","SELL"].includes(s.data.score.signal)).reverse().slice(0, 5);

  const d = stockData[selectedStock.symbol];

  const navItems = [
    { n: 1, label: "Market" },
    { n: 2, label: "Screener" },
    { n: 3, label: "Deep Dive" },
    { n: 4, label: "Compare" },
    { n: 5, label: "Top Picks" },
    { n: 6, label: "Guide" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: T.bg, color: T.text, fontFamily: "'Inter', -apple-system, sans-serif", fontSize: 13 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: ${T.bg}; }
        ::-webkit-scrollbar-thumb { background: ${T.border}; border-radius: 2px; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to{transform:rotate(360deg)} }
        .nav-btn:hover { background: ${T.bgHover} !important; color: ${T.text} !important; }
        .row-hover:hover { background: ${T.bgHover} !important; cursor: pointer; }
        .sector-card:hover { border-color: ${T.borderLight} !important; transform: translateY(-2px); cursor: pointer; }
        input:focus, select:focus { outline: 2px solid ${T.blue}; outline-offset: 1px; }
      `}</style>

      {/* NAV */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: T.bgCard, borderBottom: `1px solid ${T.border}`, padding: "0 24px", height: 52, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "linear-gradient(135deg, #6366f1, #3b82f6)", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "JetBrains Mono" }}>D</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.text, letterSpacing: "-0.3px" }}>DALAL<span style={{ color: T.accent }}>·</span>STREET</div>
            <div style={{ color: T.textFaint, fontSize: 9, letterSpacing: "1px" }}>BSE QUANTITATIVE SCREENER</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {navItems.map(({ n, label }) => (
            <button key={n} className="nav-btn" onClick={() => setPage(n)} style={{
              background: page === n ? T.accent : "transparent",
              color: page === n ? "#fff" : T.textMuted,
              border: `1px solid ${page === n ? T.accent : T.border}`,
              borderRadius: 6, padding: "5px 14px", fontSize: 12, fontWeight: 500,
              fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, border: `2px solid ${T.border}`, borderTopColor: T.blue, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span style={{ color: T.textMuted, fontSize: 11 }}>{loadedCount}/{ALL_STOCKS.length}</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />
            <span style={{ color: T.textMuted, fontSize: 11 }}>15 MIN DELAY</span>
          </div>
        </div>
      </div>

      {/* ── PAGE 1: MARKET ── */}
      {page === 1 && (
        <div style={{ padding: 24, animation: "fadeUp 0.3s ease" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Market Overview</h1>
          <p style={{ color: T.textMuted, marginBottom: 24 }}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Stocks Tracked", value: ALL_STOCKS.length, color: T.text },
              { label: "Advancing ▲", value: Object.values(stockData).filter(d => d.changePct > 0).length, color: T.green },
              { label: "Declining ▼", value: Object.values(stockData).filter(d => d.changePct < 0).length, color: T.red },
              { label: "Strong Buy Signals", value: Object.values(stockData).filter(d => d.score?.signal === "STRONG BUY").length, color: "#16a34a" },
            ].map((item, i) => (
              <Card key={i} style={{ textAlign: "center" }}>
                <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 8 }}>{item.label}</div>
                <div style={{ color: item.color, fontSize: 32, fontWeight: 800, fontFamily: "JetBrains Mono" }}>{item.value}</div>
              </Card>
            ))}
          </div>

          <SectionLabel>Sector Heatmap — click to filter screener</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
            {sectorStats.map(sector => {
              const isPos = sector.avgChange >= 0;
              const intensity = Math.min(1, Math.abs(sector.avgChange || 0) / 4);
              return (
                <div key={sector.id} className="sector-card" onClick={() => { setSectorFilter(sector.name); setPage(2); }} style={{
                  background: sector.avgChange == null ? T.bgCard : isPos ? `rgba(34,197,94,${0.04 + intensity*0.12})` : `rgba(239,68,68,${0.04 + intensity*0.12})`,
                  border: `1px solid ${sector.avgChange == null ? T.border : isPos ? `rgba(34,197,94,${0.2 + intensity*0.4})` : `rgba(239,68,68,${0.2 + intensity*0.4})`}`,
                  borderLeft: `3px solid ${sector.color}`, borderRadius: 12, padding: 16, transition: "all 0.2s",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>{sector.name}</div>
                      <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>{sector.total || "—"} stocks</div>
                    </div>
                    {sector.avgChange != null ? (
                      <div style={{ color: isPos ? T.green : T.red, fontSize: 20, fontWeight: 800, fontFamily: "JetBrains Mono" }}>
                        {isPos ? "+" : ""}{sector.avgChange.toFixed(2)}%
                      </div>
                    ) : <div style={{ color: T.textFaint, fontSize: 11, animation: "pulse 1.5s infinite" }}>loading</div>}
                  </div>
                  {sector.total > 0 && (
                    <>
                      <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
                        <div style={{ height: "100%", width: `${(sector.bullish/sector.total)*100}%`, background: T.green, borderRadius: 2, transition: "width 0.8s" }} />
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {sector.loadedStocks.map((s, i) => {
                          const stock = ALL_STOCKS.find(a => a.symbol === s.symbol);
                          return (
                            <span key={i} style={{ background: s.changePct > 0 ? T.greenBg : T.redBg, color: s.changePct > 0 ? T.green : T.red, border: `1px solid ${s.changePct > 0 ? T.greenBorder : T.redBorder}`, borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 500 }}>
                              {stock?.short || s.symbol.replace(".NS","") || ""}
                            </span>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { title: "Top Gainers Today", stocks: [...ALL_STOCKS].sort((a,b) => (stockData[b.symbol]?.changePct||-99)-(stockData[a.symbol]?.changePct||-99)).slice(0,6), pos: true },
              { title: "Top Losers Today", stocks: [...ALL_STOCKS].sort((a,b) => (stockData[a.symbol]?.changePct||99)-(stockData[b.symbol]?.changePct||99)).slice(0,6), pos: false },
            ].map(group => (
              <Card key={group.title}>
                <SectionLabel>{group.title}</SectionLabel>
                {group.stocks.map(stock => {
                  const d = stockData[stock.symbol];
                  return (
                    <div key={stock.symbol} className="row-hover" onClick={() => { setSelectedStock(stock); setPage(3); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", borderRadius: 8, marginBottom: 3, transition: "background 0.15s" }}>
                      <div>
                        <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{stock.short}</div>
                        <div style={{ color: T.textFaint, fontSize: 10, marginTop: 1 }}>{stock.sector}</div>
                      </div>
                      {d ? (
                        <div style={{ textAlign: "right", display: "flex", alignItems: "center", gap: 10 }}>
                          {d.score && <SignalBadge {...d.score} />}
                          <div>
                            <div style={{ color: T.textMuted, fontSize: 12, fontFamily: "JetBrains Mono" }}>{rupee(d.current)}</div>
                            <div style={{ color: group.pos ? T.green : T.red, fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{pct(d.changePct)}</div>
                          </div>
                        </div>
                      ) : <div style={{ color: T.textFaint, animation: "pulse 1.5s infinite" }}>—</div>}
                    </div>
                  );
                })}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── PAGE 2: SCREENER ── */}
      {page === 2 && (
        <div style={{ padding: 24, animation: "fadeUp 0.3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>Stock Screener</h1>
              <p style={{ color: T.textMuted, marginTop: 4 }}>{filteredStocks.length} stocks · Click any row for deep dive</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 12px", color: T.text, fontSize: 12, fontFamily: "inherit", width: 140 }} />
              <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", color: T.textMuted, fontSize: 12, fontFamily: "inherit" }}>
                <option value="all">All Sectors</option>
                {SECTORS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, padding: "7px 10px", color: T.textMuted, fontSize: 12, fontFamily: "inherit" }}>
                <option value="score">Sort: Score</option>
                <option value="changePct">Sort: Day %</option>
                <option value="r100">Sort: 100D Return</option>
                <option value="rsi">Sort: RSI</option>
                <option value="vol">Sort: Volume</option>
                <option value="posIn52W">Sort: 52W Position</option>
              </select>
            </div>
          </div>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "150px 75px 105px 70px 65px 65px 65px 55px 60px 55px 55px 70px", padding: "10px 16px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
              {["Stock","Price","Signal","Score","Day %","D30","D100","RSI","Vol×","52W","P/E","Mkt Cap"].map(h => (
                <div key={h} style={{ color: T.textFaint, fontSize: 10, letterSpacing: "0.8px", textTransform: "uppercase", fontFamily: "JetBrains Mono" }}>{h}</div>
              ))}
            </div>
            {filteredStocks.map((stock, idx) => {
              const d = stockData[stock.symbol];
              const f = fundData[stock.symbol];
              const peColor = !f?.pe ? T.textFaint : f.pe < 15 ? T.green : f.pe < 25 ? T.yellow : f.pe < 40 ? "#f97316" : T.red;
              const mcap = f?.marketCap;
              const mcapStr = !mcap ? "—" : mcap >= 1e12 ? `₹${(mcap/1e12).toFixed(1)}T` : mcap >= 1e9 ? `₹${(mcap/1e9).toFixed(0)}B` : `₹${(mcap/1e6).toFixed(0)}M`;
              return (
                <div key={stock.symbol} className="row-hover" onClick={() => { setSelectedStock(stock); setPage(3); }} style={{ display: "grid", gridTemplateColumns: "150px 75px 105px 70px 65px 65px 65px 55px 60px 55px 55px 70px", padding: "9px 16px", borderBottom: idx < filteredStocks.length-1 ? `1px solid ${T.border}` : "none", transition: "background 0.12s", alignItems: "center" }}>
                  <div>
                    <div style={{ color: T.text, fontWeight: 600, fontSize: 12 }}>{stock.short}</div>
                    <div style={{ color: T.textFaint, fontSize: 10, marginTop: 1 }}>{stock.sector}</div>
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 12, fontFamily: "JetBrains Mono" }}>{d ? rupee(d.current) : <span style={{ animation: "pulse 1.5s infinite", color: T.textFaint }}>—</span>}</div>
                  <div>{d?.score && <SignalBadge {...d.score} />}</div>
                  <div>
                    {d?.score && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 32, height: 32 }}>
                          <svg width="32" height="32" viewBox="0 0 32 32">
                            <circle cx="16" cy="16" r="12" fill="none" stroke={T.border} strokeWidth="3" />
                            <circle cx="16" cy="16" r="12" fill="none" stroke={d.score.signalColor} strokeWidth="3"
                              strokeDasharray={`${(d.score.composite/100)*75.4} 75.4`} strokeLinecap="round" transform="rotate(-90 16 16)" />
                            <text x="16" y="20" textAnchor="middle" fill={d.score.signalColor} fontSize="9" fontWeight="700" fontFamily="monospace">{d.score.composite}</text>
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ color: d ? (d.changePct >= 0 ? T.green : T.red) : T.textFaint, fontWeight: 700, fontSize: 12, fontFamily: "JetBrains Mono" }}>{d ? pct(d.changePct) : "—"}</div>
                  <div style={{ color: d?.returns?.d30 == null ? T.textFaint : d.returns.d30 >= 0 ? T.green : T.red, fontSize: 11, fontFamily: "JetBrains Mono" }}>{d?.returns?.d30 != null ? pct(d.returns.d30) : "—"}</div>
                  <div style={{ color: d?.returns?.d100 == null ? T.textFaint : d.returns.d100 >= 0 ? T.green : T.red, fontSize: 11, fontFamily: "JetBrains Mono" }}>{d?.returns?.d100 != null ? pct(d.returns.d100) : "—"}</div>
                  <div style={{ color: d ? (d.rsi > 70 ? T.red : d.rsi < 30 ? T.green : T.yellow) : T.textFaint, fontSize: 11, fontFamily: "JetBrains Mono" }}>{d ? d.rsi.toFixed(0) : "—"}</div>
                  <div style={{ color: d ? (d.volRatio > 1.5 ? T.yellow : T.textMuted) : T.textFaint, fontSize: 11, fontFamily: "JetBrains Mono" }}>{d ? `${d.volRatio.toFixed(1)}×` : "—"}</div>
                  <div>
                    {d && (
                      <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <div style={{ width: 36, height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${d.posIn52W}%`, background: d.posIn52W > 75 ? T.red : d.posIn52W < 30 ? T.green : T.yellow, borderRadius: 2 }} />
                        </div>
                        <span style={{ color: T.textFaint, fontSize: 9 }}>{d.posIn52W.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  <div style={{ color: peColor, fontSize: 11, fontFamily: "JetBrains Mono" }}>{f ? (f.pe != null ? f.pe.toFixed(1) : "—") : <span style={{ animation: "pulse 1.5s infinite", color: T.textFaint }}>…</span>}</div>
                  <div style={{ color: T.textMuted, fontSize: 10, fontFamily: "JetBrains Mono" }}>{f ? mcapStr : <span style={{ animation: "pulse 1.5s infinite", color: T.textFaint }}>…</span>}</div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* ── PAGE 3: DEEP DIVE ── */}
      {page === 3 && (
        <div style={{ padding: 24, animation: "fadeUp 0.3s ease" }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {ALL_STOCKS.map(s => (
              <button key={s.symbol} onClick={() => setSelectedStock(s)} style={{ background: selectedStock.symbol === s.symbol ? T.accent : T.bgCard, color: selectedStock.symbol === s.symbol ? "#fff" : T.textMuted, border: `1px solid ${selectedStock.symbol === s.symbol ? T.accent : T.border}`, borderRadius: 6, padding: "4px 12px", fontSize: 11, fontFamily: "JetBrains Mono", cursor: "pointer", fontWeight: selectedStock.symbol === s.symbol ? 700 : 400, transition: "all 0.15s" }}>{s.short}</button>
            ))}
          </div>

          {!d && <div style={{ textAlign: "center", padding: 60, color: T.textFaint, animation: "pulse 1.5s infinite" }}>Loading data...</div>}

          {d && (
            <>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>{selectedStock.name}</h1>
                  <div style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>{selectedStock.sector} · {selectedStock.symbol}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 10 }}>
                    <span style={{ color: T.text, fontSize: 32, fontWeight: 800, fontFamily: "JetBrains Mono" }}>₹{d.current.toLocaleString("en-IN", { maximumFractionDigits: 2 })}</span>
                    <span style={{ color: d.change >= 0 ? T.green : T.red, fontSize: 16, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{d.change >= 0 ? "▲" : "▼"} ₹{Math.abs(d.change).toFixed(2)} ({Math.abs(d.changePct).toFixed(2)}%)</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                    {d.crossSignal !== "NONE" && <span style={{ background: d.crossSignal === "GOLDEN" ? T.greenBg : T.redBg, color: d.crossSignal === "GOLDEN" ? T.green : T.red, border: `1px solid ${d.crossSignal === "GOLDEN" ? T.greenBorder : T.redBorder}`, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{d.crossSignal === "GOLDEN" ? "⭐ Golden Cross" : "☠️ Death Cross"}</span>}
                    <span style={{ background: T.yellowBg, color: T.yellow, border: `1px solid ${T.yellowBorder}`, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>RSI {d.rsi?.toFixed(0)}</span>
                    <span style={{ background: T.blueBg, color: T.blue, border: `1px solid ${T.blueBorder}`, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>Vol {d.volRatio.toFixed(1)}×</span>
                  </div>
                </div>
                {d.score && (
                  <div style={{ textAlign: "center" }}>
                    <ScoreRing score={d.score.composite} signal={d.score.signal} signalColor={d.score.signalColor} />
                  </div>
                )}
              </div>

              {/* Chart */}
              <Card style={{ marginBottom: 16 }}>
                <SectionLabel>6-Month Candlestick Chart · SMA20 & SMA50</SectionLabel>
                <CandlestickChart history={d.history} sma20={d.sma20} sma50={d.sma50} />
              </Card>

              {/* Returns */}
              <Card style={{ marginBottom: 16 }}>
                <SectionLabel>Price Returns</SectionLabel>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  <ReturnPill label="10 Day" value={d.returns.d10} />
                  <ReturnPill label="20 Day" value={d.returns.d20} />
                  <ReturnPill label="30 Day" value={d.returns.d30} />
                  <ReturnPill label="100 Day" value={d.returns.d100} />
                </div>
              </Card>

              {/* 5-Pillar Score Breakdown */}
              {d.score && (
                <Card style={{ marginBottom: 16, border: `1px solid ${d.score.signalBorder}`, background: d.score.signalBg }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                    <div>
                      <SectionLabel>7-Pillar Scoring Breakdown</SectionLabel>
                      <div style={{ color: T.textMuted, fontSize: 12 }}>Composite score: <span style={{ color: d.score.signalColor, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{d.score.composite}/100</span></div>
                    </div>
                    <SignalBadge {...d.score} size="lg" />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 32px" }}>
                    <PillarBar label="Momentum (20%)" score={d.score.pillars.momentum} description={`RSI: ${d.rsi?.toFixed(0)} · D10: ${d.returns.d10?.toFixed(1)}% · D30: ${d.returns.d30?.toFixed(1)}%`} />
                    <PillarBar label="Trend Strength (20%)" score={d.score.pillars.trend} description={`vs SMA20: ${d.current > d.sma20 ? "Above ▲" : "Below ▼"} · vs SMA200: ${d.current > d.sma200 ? "Above ▲" : "Below ▼"} · ${d.crossSignal !== "NONE" ? d.crossSignal : "No cross"}`} />
                    <PillarBar label="Volume Confirmation (15%)" score={d.score.pillars.volume} description={`Volume ${d.volRatio.toFixed(2)}× normal · ${d.volRatio > 2 && d.changePct > 0 ? "Strong conviction buying" : d.volRatio > 2 && d.changePct < 0 ? "Distribution detected" : "Normal activity"}`} />
                    <PillarBar label="Value Position (25%)" score={d.score.pillars.value} description={`${d.posIn52W.toFixed(1)}% of 52W range · ${d.posIn52W < 30 ? "Value zone ✓" : d.posIn52W > 75 ? "Near highs, limited upside" : "Mid range"}`} />
                    <PillarBar label="Risk Assessment (20%)" score={d.score.pillars.risk} description={`Drawdown from 52W high: ${(((d.current - d.high52) / d.high52) * 100).toFixed(1)}% · ${d.volRatio > 3 ? "Extreme volume — uncertain" : "Normal risk level"}`} />
                  </div>
                </Card>
              )}

              {/* Moving Averages + RSI + Volume */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                <Card>
                  <SectionLabel>Moving Averages</SectionLabel>
                  {[{label:"SMA 20",val:d.sma20},{label:"SMA 50",val:d.sma50},{label:"SMA 200",val:d.sma200},{label:"EMA 20",val:d.ema20}].map(item => {
                    const above = d.current > item.val;
                    return (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ color: T.textMuted, fontSize: 12 }}>{item.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: T.text, fontSize: 12, fontFamily: "JetBrains Mono" }}>₹{item.val?.toFixed(0) || "—"}</span>
                          <span style={{ background: above ? T.greenBg : T.redBg, color: above ? T.green : T.red, border: `1px solid ${above ? T.greenBorder : T.redBorder}`, borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600 }}>{above ? "▲" : "▼"}</span>
                        </div>
                      </div>
                    );
                  })}
                </Card>
                <Card style={{ textAlign: "center" }}>
                  <SectionLabel>RSI (14-Day)</SectionLabel>
                  <RSIGauge value={d.rsi} />
                  <div style={{ marginTop: 14, textAlign: "left" }}>
                    {[{label:"Value",value:d.rsi?.toFixed(2)},{label:"Signal",value:d.rsi>70?"Overbought":d.rsi<30?"Oversold":"Neutral"}].map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ color: T.textMuted, fontSize: 12 }}>{item.label}</span>
                        <span style={{ color: T.text, fontSize: 12, fontFamily: "JetBrains Mono" }}>{item.value}</span>
                      </div>
                    ))}
                    {claudeAnalysis?.rsi_signal && <div style={{ color: T.textMuted, fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>{claudeAnalysis.rsi_signal}</div>}
                  </div>
                </Card>
                <Card>
                  <SectionLabel>Volume Analysis</SectionLabel>
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <div style={{ color: d.volRatio > 1.5 ? T.yellow : T.text, fontSize: 30, fontWeight: 800, fontFamily: "JetBrains Mono" }}>{d.volRatio.toFixed(2)}×</div>
                    <div style={{ color: T.textMuted, fontSize: 11 }}>vs 30-day average</div>
                  </div>
                  {[{label:"Today",value:`${(d.todayVol/1e6).toFixed(2)}M`},{label:"30D Avg",value:`${(d.avgVol30/1e6).toFixed(2)}M`},{label:"Signal",value:d.volRatio>2?"Unusual spike ⚠️":d.volRatio>1.3?"Above average":"Normal"}].map(item => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ color: T.textMuted, fontSize: 12 }}>{item.label}</span>
                      <span style={{ color: T.text, fontSize: 12, fontFamily: "JetBrains Mono" }}>{item.value}</span>
                    </div>
                  ))}
                </Card>
              </div>

              {/* 52W Bar */}
              <Card style={{ marginBottom: 16 }}>
                <SectionLabel>52-Week Range Position</SectionLabel>
                <PositionBar value={d.posIn52W} low={d.low52} high={d.high52} />
              </Card>

              {/* Fundamentals Card */}
              {(() => {
                const f = fundData[selectedStock.symbol];
                const peColor = !f?.pe ? T.textMuted : f.pe < 15 ? T.green : f.pe < 25 ? T.yellow : f.pe < 40 ? "#f97316" : T.red;
                const mcap = f?.marketCap;
                const mcapStr = !mcap ? "—" : mcap >= 1e12 ? `₹${(mcap/1e12).toFixed(2)}T` : mcap >= 1e9 ? `₹${(mcap/1e9).toFixed(1)}B` : `₹${(mcap/1e6).toFixed(0)}M`;
                const peLabel = !f?.pe ? "—" : f.pe < 0 ? "Loss-making" : f.pe < 15 ? "Value" : f.pe < 25 ? "Fair" : f.pe < 40 ? "Expensive" : "Very Expensive";
                const healthColor = !f ? T.textFaint : (f.pe != null && f.pe > 0 && f.pe < 25 && f.eps > 0) ? T.green : (f.pe != null && f.pe < 40 && f.eps > 0) ? T.yellow : T.red;
                const healthLabel = !f ? "Loading..." : (f.pe != null && f.pe > 0 && f.pe < 25 && f.eps > 0) ? "🟢 Fundamentally Healthy" : (f.pe != null && f.pe < 40 && f.eps > 0) ? "🟡 Mixed Fundamentals" : "🔴 Fundamental Concerns";
                return (
                  <Card style={{ marginBottom: 16, border: `1px solid ${healthColor}44`, background: `${healthColor}08` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                      <SectionLabel>Fundamental Health Check</SectionLabel>
                      <div style={{ color: healthColor, fontSize: 12, fontWeight: 700 }}>{healthLabel}</div>
                    </div>
                    {!f ? (
                      <div style={{ color: T.textFaint, fontSize: 12, animation: "pulse 1.5s infinite" }}>Loading fundamental data...</div>
                    ) : (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                          {[
                            { label: "P/E Ratio", value: f.pe?.toFixed(1) ?? "—", sub: peLabel, color: peColor },
                            { label: "P/B Ratio", value: f.pb?.toFixed(2) ?? "—", sub: f.pb != null ? (f.pb < 1 ? "Below Book" : f.pb < 3 ? "Moderate" : "Premium") : "", color: f.pb != null ? (f.pb < 1 ? T.green : f.pb < 3 ? T.yellow : T.red) : T.textMuted },
                            { label: "EPS (TTM)", value: f.eps != null ? `₹${f.eps.toFixed(2)}` : "—", sub: f.eps != null ? (f.eps > 0 ? "Profitable" : "Loss") : "", color: f.eps != null ? (f.eps > 0 ? T.green : T.red) : T.textMuted },
                            { label: "Beta", value: f.beta?.toFixed(2) ?? "—", sub: f.beta != null ? (f.beta < 0.8 ? "Defensive" : f.beta < 1.2 ? "Market" : "Volatile") : "", color: f.beta != null ? (f.beta < 1 ? T.green : f.beta < 1.5 ? T.yellow : T.red) : T.textMuted },
                          ].map(item => (
                            <div key={item.label} style={{ textAlign: "center", padding: "10px 8px", background: T.bgCard, borderRadius: 8, border: `1px solid ${T.border}` }}>
                              <div style={{ color: T.textFaint, fontSize: 10, marginBottom: 4 }}>{item.label}</div>
                              <div style={{ color: item.color, fontSize: 17, fontWeight: 800, fontFamily: "JetBrains Mono" }}>{item.value}</div>
                              {item.sub && <div style={{ color: item.color, fontSize: 9, marginTop: 3, opacity: 0.8 }}>{item.sub}</div>}
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                          {[
                            { label: "Market Cap", value: mcapStr, color: T.textMuted },
                            { label: "Div Yield", value: f.dividendYield != null ? `${(f.dividendYield*100).toFixed(2)}%` : "—", color: f.dividendYield > 0 ? T.green : T.textMuted },
                            { label: "ROE", value: f.roe != null ? `${(f.roe*100).toFixed(1)}%` : "—", color: f.roe != null ? (f.roe > 0.15 ? T.green : f.roe > 0 ? T.yellow : T.red) : T.textMuted },
                            { label: "Gross Margin", value: f.grossMargins != null ? `${(f.grossMargins*100).toFixed(1)}%` : "—", color: f.grossMargins != null ? (f.grossMargins > 0.3 ? T.green : f.grossMargins > 0.1 ? T.yellow : T.red) : T.textMuted },
                          ].map(item => (
                            <div key={item.label} style={{ textAlign: "center", padding: "8px 6px", background: T.bgCard, borderRadius: 8, border: `1px solid ${T.border}` }}>
                              <div style={{ color: T.textFaint, fontSize: 10, marginBottom: 4 }}>{item.label}</div>
                              <div style={{ color: item.color, fontSize: 14, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </Card>
                );
              })()}

              {/* Claude Analysis */}
              <Card style={{ border: `1px solid ${T.blueBorder}`, background: T.blueBg }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <SectionLabel>Claude AI Narrative Analysis</SectionLabel>
                  {claudeLoading && <div style={{ color: T.yellow, fontSize: 11, animation: "pulse 1s infinite" }}>Analyzing...</div>}
                </div>
                {claudeAnalysis ? (
                  <>
                    <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>{claudeAnalysis.summary}</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      {[{label:"Trend",text:claudeAnalysis.trend_signal,warn:false},{label:"Fundamentals",text:claudeAnalysis.fundamental_take,warn:false},{label:"Momentum",text:claudeAnalysis.rsi_signal,warn:false},{label:"Key Risk",text:claudeAnalysis.key_risk,warn:true}].map(item => (
                        <div key={item.label} style={{ padding: "10px 12px", borderRadius: 8, background: item.warn ? T.redBg : T.bgCard, border: `1px solid ${item.warn ? T.redBorder : T.border}` }}>
                          <div style={{ color: item.warn ? T.red : T.textFaint, fontSize: 10, letterSpacing: "0.8px", marginBottom: 5, textTransform: "uppercase" }}>{item.label}</div>
                          <div style={{ color: item.warn ? "#fca5a5" : T.textMuted, fontSize: 12, lineHeight: 1.5 }}>{item.text}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : !claudeLoading && (
                  <div style={{ color: T.textFaint, fontSize: 12 }}>Analysis will appear here once data loads.</div>
                )}
                <div style={{ marginTop: 14, color: T.textFaint, fontSize: 10, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                  Technical + fundamental analysis · Not financial advice · Always do your own research
                </div>
              </Card>
            </>
          )}
        </div>
      )}

      {/* ── PAGE 4: COMPARE ── */}
      {page === 4 && (
        <div style={{ padding: 24, animation: "fadeUp 0.3s ease" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Compare Stocks</h1>
          <p style={{ color: T.textMuted, marginBottom: 24 }}>Side-by-side technical comparison</p>

          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            {[0,1].map(idx => (
              <div key={idx}>
                <div style={{ color: T.textFaint, fontSize: 10, letterSpacing: "1px", marginBottom: 5, textTransform: "uppercase" }}>Stock {idx+1}</div>
                <select value={compareList[idx].symbol} onChange={e => { const s = ALL_STOCKS.find(a => a.symbol === e.target.value); setCompareList(prev => { const n=[...prev]; n[idx]=s; return n; }); }} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 14px", color: T.text, fontSize: 13, fontFamily: "inherit" }}>
                  {ALL_STOCKS.map(s => <option key={s.symbol} value={s.symbol}>{s.name}</option>)}
                </select>
              </div>
            ))}
          </div>

          <Card style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "190px 1fr 1fr", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
              <div style={{ padding: "10px 16px", color: T.textFaint, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>Metric</div>
              {compareList.map(s => <div key={s.symbol} style={{ padding: "10px 16px", color: T.text, fontWeight: 700, fontSize: 13 }}>{s.short}</div>)}
            </div>
            {[
              { label: "Signal",        fn: d => d?.score ? <SignalBadge {...d.score} /> : "—", raw: true },
              { label: "Score",         fn: d => d?.score?.composite != null ? `${d.score.composite}/100` : "—", colorFn: d => d?.score?.signalColor },
              { label: "Current Price", fn: d => d ? rupee(d.current) : "—" },
              { label: "Day Change",    fn: d => d ? pct(d.changePct) : "—", colorFn: d => d?.changePct >= 0 ? T.green : T.red },
              { label: "10D Return",    fn: d => d?.returns?.d10 != null ? pct(d.returns.d10) : "—", colorFn: d => (d?.returns?.d10||0) >= 0 ? T.green : T.red },
              { label: "30D Return",    fn: d => d?.returns?.d30 != null ? pct(d.returns.d30) : "—", colorFn: d => (d?.returns?.d30||0) >= 0 ? T.green : T.red },
              { label: "100D Return",   fn: d => d?.returns?.d100 != null ? pct(d.returns.d100) : "—", colorFn: d => (d?.returns?.d100||0) >= 0 ? T.green : T.red },
              { label: "RSI (14)",      fn: d => d ? d.rsi.toFixed(1) : "—", colorFn: d => d?.rsi > 70 ? T.red : d?.rsi < 30 ? T.green : T.yellow },
              { label: "vs SMA 20",     fn: d => d ? (d.current > d.sma20 ? "Above ▲" : "Below ▼") : "—", colorFn: d => d?.current > d?.sma20 ? T.green : T.red },
              { label: "vs SMA 50",     fn: d => d ? (d.current > d.sma50 ? "Above ▲" : "Below ▼") : "—", colorFn: d => d?.current > d?.sma50 ? T.green : T.red },
              { label: "vs SMA 200",    fn: d => d ? (d.current > d.sma200 ? "Above ▲" : "Below ▼") : "—", colorFn: d => d?.current > d?.sma200 ? T.green : T.red },
              { label: "52W High",      fn: d => d ? `₹${d.high52.toFixed(0)}` : "—" },
              { label: "52W Low",       fn: d => d ? `₹${d.low52.toFixed(0)}` : "—" },
              { label: "52W Position",  fn: d => d ? `${d.posIn52W.toFixed(1)}%` : "—", colorFn: d => d?.posIn52W > 75 ? T.red : d?.posIn52W < 30 ? T.green : T.yellow },
              { label: "Volume Ratio",  fn: d => d ? `${d.volRatio.toFixed(2)}×` : "—", colorFn: d => d?.volRatio > 1.5 ? T.yellow : T.textMuted },
              { label: "MA Cross",      fn: d => d ? (d.crossSignal === "NONE" ? "None" : d.crossSignal) : "—", colorFn: d => d?.crossSignal === "GOLDEN" ? T.green : d?.crossSignal === "DEATH" ? T.red : T.textMuted },
            ].map((row, i) => {
              const vals = compareList.map(s => stockData[s.symbol]);
              return (
                <div key={row.label} style={{ display: "grid", gridTemplateColumns: "190px 1fr 1fr", borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? "transparent" : `${T.bg}88` }}>
                  <div style={{ padding: "9px 16px", color: T.textMuted, fontSize: 12 }}>{row.label}</div>
                  {vals.map((d, idx) => (
                    <div key={idx} style={{ padding: "9px 16px", color: row.colorFn ? row.colorFn(d) : T.text, fontSize: 12, fontFamily: row.raw ? "inherit" : "JetBrains Mono", fontWeight: 500, display: "flex", alignItems: "center" }}>
                      {row.fn(d)}
                    </div>
                  ))}
                </div>
              );
            })}
          </Card>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {compareList.map(s => {
              const d = stockData[s.symbol];
              return (
                <Card key={s.symbol}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                    <div>
                      <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{s.short}</div>
                      <div style={{ color: T.textFaint, fontSize: 11 }}>{s.name}</div>
                    </div>
                    {d && <div style={{ textAlign: "right" }}><div style={{ color: T.text, fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 600 }}>{rupee(d.current)}</div><div style={{ color: d.changePct >= 0 ? T.green : T.red, fontSize: 12, fontFamily: "JetBrains Mono" }}>{pct(d.changePct)}</div></div>}
                  </div>
                  {d ? <SparkLine history={d.history} change={d.change} width={400} height={70} /> : <div style={{ color: T.textFaint, animation: "pulse 1.5s infinite", padding: 20 }}>Loading...</div>}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PAGE 5: TOP PICKS ── */}
      {page === 5 && (
        <div style={{ padding: 24, animation: "fadeUp 0.3s ease" }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Today's Top Picks</h1>
          <p style={{ color: T.textMuted, marginBottom: 8 }}>Auto-ranked by 5-pillar composite score · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</p>
          <div style={{ background: T.blueBg, border: `1px solid ${T.blueBorder}`, borderRadius: 8, padding: "10px 14px", marginBottom: 28, fontSize: 12, color: T.textMuted }}>
            ℹ️ Rankings are based purely on technical indicators. Always verify with fundamental research before investing. Not financial advice.
          </div>

          {loading && loadedCount < ALL_STOCKS.length && (
            <div style={{ textAlign: "center", padding: 40, color: T.textFaint }}>
              <div style={{ width: 24, height: 24, border: `3px solid ${T.border}`, borderTopColor: T.blue, borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 12px" }} />
              Loading stock data... ({loadedCount}/{ALL_STOCKS.length})
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Strong Buys */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.green }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.green }}>Top Buy Signals</h2>
                <span style={{ color: T.textFaint, fontSize: 12 }}>({topBuys.length} stocks)</span>
              </div>
              {topBuys.length === 0 && <div style={{ color: T.textFaint, fontSize: 13, padding: 20 }}>No strong buy signals today. Market may be overbought.</div>}
              {topBuys.map((stock, idx) => {
                const d = stock.data;
                return (
                  <div key={stock.symbol} className="row-hover" onClick={() => { setSelectedStock(stock); setPage(3); }} style={{ background: T.bgCard, border: `1px solid ${T.greenBorder}`, borderRadius: 12, padding: 16, marginBottom: 12, transition: "all 0.2s", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ background: T.greenBg, border: `1px solid ${T.greenBorder}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: T.green, fontWeight: 800, fontFamily: "JetBrains Mono", fontSize: 14 }}>#{idx+1}</div>
                        <div>
                          <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{stock.short}</div>
                          <div style={{ color: T.textFaint, fontSize: 11 }}>{stock.sector}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <SignalBadge {...d.score} size="lg" />
                        <div style={{ color: T.textMuted, fontSize: 11, marginTop: 4, fontFamily: "JetBrains Mono" }}>{rupee(d.current)}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                      {[
                        { label: "Score", value: `${d.score.composite}/100`, color: d.score.signalColor },
                        { label: "RSI", value: d.rsi?.toFixed(0), color: d.rsi < 30 ? T.green : d.rsi > 70 ? T.red : T.yellow },
                        { label: "52W Pos", value: `${d.posIn52W?.toFixed(0)}%`, color: d.posIn52W < 30 ? T.green : T.textMuted },
                        { label: "D30", value: pct(d.returns.d30), color: (d.returns.d30||0) >= 0 ? T.green : T.red },
                      ].map(item => (
                        <div key={item.label} style={{ textAlign: "center", background: T.bg, borderRadius: 6, padding: "6px 4px" }}>
                          <div style={{ color: T.textFaint, fontSize: 9, marginBottom: 3 }}>{item.label}</div>
                          <div style={{ color: item.color, fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Pillar bars mini */}
                    <div style={{ display: "flex", gap: 4 }}>
                      {Object.entries(d.score.pillars).map(([key, val]) => (
                        <div key={key} style={{ flex: 1 }}>
                          <div style={{ color: T.textFaint, fontSize: 8, marginBottom: 2, textAlign: "center" }}>{key.slice(0,3).toUpperCase()}</div>
                          <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${val}%`, background: val >= 65 ? T.green : val >= 40 ? T.yellow : T.red, borderRadius: 2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, color: T.textFaint, fontSize: 10, textAlign: "right" }}>Click to deep dive →</div>
                  </div>
                );
              })}
            </div>

            {/* Strong Sells */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: T.red }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.red }}>Stocks to Avoid</h2>
                <span style={{ color: T.textFaint, fontSize: 12 }}>({topSells.length} stocks)</span>
              </div>
              {topSells.length === 0 && <div style={{ color: T.textFaint, fontSize: 13, padding: 20 }}>No strong sell signals today.</div>}
              {topSells.map((stock, idx) => {
                const d = stock.data;
                return (
                  <div key={stock.symbol} className="row-hover" onClick={() => { setSelectedStock(stock); setPage(3); }} style={{ background: T.bgCard, border: `1px solid ${T.redBorder}`, borderRadius: 12, padding: 16, marginBottom: 12, transition: "all 0.2s", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 8, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: T.red, fontWeight: 800, fontFamily: "JetBrains Mono", fontSize: 14 }}>#{idx+1}</div>
                        <div>
                          <div style={{ color: T.text, fontWeight: 700, fontSize: 14 }}>{stock.short}</div>
                          <div style={{ color: T.textFaint, fontSize: 11 }}>{stock.sector}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <SignalBadge {...d.score} size="lg" />
                        <div style={{ color: T.textMuted, fontSize: 11, marginTop: 4, fontFamily: "JetBrains Mono" }}>{rupee(d.current)}</div>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                      {[
                        { label: "Score", value: `${d.score.composite}/100`, color: d.score.signalColor },
                        { label: "RSI", value: d.rsi?.toFixed(0), color: d.rsi > 70 ? T.red : d.rsi < 30 ? T.green : T.yellow },
                        { label: "52W Pos", value: `${d.posIn52W?.toFixed(0)}%`, color: d.posIn52W > 75 ? T.red : T.textMuted },
                        { label: "D30", value: pct(d.returns.d30), color: (d.returns.d30||0) >= 0 ? T.green : T.red },
                      ].map(item => (
                        <div key={item.label} style={{ textAlign: "center", background: T.bg, borderRadius: 6, padding: "6px 4px" }}>
                          <div style={{ color: T.textFaint, fontSize: 9, marginBottom: 3 }}>{item.label}</div>
                          <div style={{ color: item.color, fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      {Object.entries(d.score.pillars).map(([key, val]) => (
                        <div key={key} style={{ flex: 1 }}>
                          <div style={{ color: T.textFaint, fontSize: 8, marginBottom: 2, textAlign: "center" }}>{key.slice(0,3).toUpperCase()}</div>
                          <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${val}%`, background: val >= 65 ? T.green : val >= 40 ? T.yellow : T.red, borderRadius: 2 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: 10, color: T.textFaint, fontSize: 10, textAlign: "right" }}>Click to deep dive →</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Full ranking table */}
          <div style={{ marginTop: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Full Rankings — All 20 Stocks</h2>
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "40px 160px 110px 80px 80px 80px 80px 80px", padding: "10px 16px", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
                {["Rank","Stock","Signal","Score","Day %","D30","D100","RSI"].map(h => <div key={h} style={{ color: T.textFaint, fontSize: 10, letterSpacing: "0.8px", textTransform: "uppercase", fontFamily: "JetBrains Mono" }}>{h}</div>)}
              </div>
              {allScored.map((stock, idx) => {
                const d = stock.data;
                return (
                  <div key={stock.symbol} className="row-hover" onClick={() => { setSelectedStock(stock); setPage(3); }} style={{ display: "grid", gridTemplateColumns: "40px 160px 110px 80px 80px 80px 80px 80px", padding: "9px 16px", borderBottom: idx < allScored.length-1 ? `1px solid ${T.border}` : "none", transition: "background 0.12s", alignItems: "center" }}>
                    <div style={{ color: T.textFaint, fontSize: 12, fontFamily: "JetBrains Mono" }}>#{idx+1}</div>
                    <div>
                      <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{stock.short}</div>
                      <div style={{ color: T.textFaint, fontSize: 10 }}>{stock.sector}</div>
                    </div>
                    <div><SignalBadge {...d.score} /></div>
                    <div style={{ color: d.score.signalColor, fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono" }}>{d.score.composite}/100</div>
                    <div style={{ color: d.changePct >= 0 ? T.green : T.red, fontSize: 12, fontFamily: "JetBrains Mono" }}>{pct(d.changePct)}</div>
                    <div style={{ color: (d.returns.d30||0) >= 0 ? T.green : T.red, fontSize: 12, fontFamily: "JetBrains Mono" }}>{pct(d.returns.d30)}</div>
                    <div style={{ color: (d.returns.d100||0) >= 0 ? T.green : T.red, fontSize: 12, fontFamily: "JetBrains Mono" }}>{pct(d.returns.d100)}</div>
                    <div style={{ color: d.rsi > 70 ? T.red : d.rsi < 30 ? T.green : T.yellow, fontSize: 12, fontFamily: "JetBrains Mono" }}>{d.rsi?.toFixed(0)}</div>
                  </div>
                );
              })}
            </Card>
          </div>
        </div>
      )}

      {/* ── PAGE 6: GUIDE ── */}
      {page === 6 && (
        <div style={{ padding: 24, animation: "fadeUp 0.3s ease", maxWidth: 900, margin: "0 auto" }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 4 }}>Dashboard Guide</h1>
          <p style={{ color: T.textMuted, marginBottom: 32 }}>Everything you need to know to use Dalal Street effectively</p>

          {GUIDE_SECTIONS.map((section, si) => (
            <div key={si} style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <span style={{ fontSize: 20 }}>{section.emoji}</span>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: T.text }}>{section.title}</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {section.items.map((item, ii) => (
                  <div key={ii} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderLeft: `3px solid ${item.color}`, borderRadius: 10, padding: "14px 18px" }}>
                    <div style={{ color: item.color, fontWeight: 700, fontSize: 13, marginBottom: 6, fontFamily: "JetBrains Mono" }}>{item.term}</div>
                    <div style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.7 }}>{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Card style={{ background: T.blueBg, border: `1px solid ${T.blueBorder}`, textAlign: "center" }}>
            <div style={{ fontSize: 24, marginBottom: 8 }}>🇮🇳</div>
            <div style={{ color: T.text, fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Built for Indian Markets</div>
            <div style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.7 }}>
              Dalal Street is a personal BSE/NSE quantitative screener.<br />
              Data from Yahoo Finance · 15-min delay · For research only · Not SEBI registered
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
