export const dynamic = "force-dynamic";

import { useState, useEffect, useRef } from "react";

// ── CONSTANTS ────────────────────────────────────────────────────────────────

const SECTORS = [
  { id: "it", name: "Information Technology", color: "#3b82f6", stocks: ["TCS.NS","INFY.NS","WIPRO.NS","HCLTECH.NS","TECHM.NS"] },
  { id: "banking", name: "Banking & Finance", color: "#10b981", stocks: ["HDFCBANK.NS","ICICIBANK.NS","SBIN.NS","AXISBANK.NS","BAJFINANCE.NS"] },
  { id: "energy", name: "Energy & Oil", color: "#f59e0b", stocks: ["RELIANCE.NS","ONGC.NS","POWERGRID.NS","NTPC.NS","BPCL.NS"] },
  { id: "auto", name: "Automobiles", color: "#f97316", stocks: ["MARUTI.NS","TATAMOTORS.NS","BAJAJAUT.NS"] },
  { id: "pharma", name: "Pharma & Health", color: "#a855f7", stocks: ["SUNPHARMA.NS","DRREDDY.NS","CIPLA.NS"] },
  { id: "fmcg", name: "FMCG", color: "#ec4899", stocks: ["HINDUNILVR.NS","ITC.NS"] },
];

const ALL_STOCKS = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", short: "RELIANCE", sector: "Energy & Oil" },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", short: "TCS", sector: "Information Technology" },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", short: "HDFC BANK", sector: "Banking & Finance" },
  { symbol: "INFY.NS", name: "Infosys", short: "INFOSYS", sector: "Information Technology" },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank", short: "ICICI BANK", sector: "Banking & Finance" },
  { symbol: "WIPRO.NS", name: "Wipro", short: "WIPRO", sector: "Information Technology" },
  { symbol: "SBIN.NS", name: "State Bank of India", short: "SBI", sector: "Banking & Finance" },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance", short: "BAJAJ FIN", sector: "Banking & Finance" },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki", short: "MARUTI", sector: "Automobiles" },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharmaceutical", short: "SUN PHARMA", sector: "Pharma & Health" },
  { symbol: "HCLTECH.NS", name: "HCL Technologies", short: "HCL TECH", sector: "Information Technology" },
  { symbol: "TATAMOTORS.NS", name: "Tata Motors", short: "TATA MOTORS", sector: "Automobiles" },
  { symbol: "AXISBANK.NS", name: "Axis Bank", short: "AXIS BANK", sector: "Banking & Finance" },
  { symbol: "ONGC.NS", name: "Oil & Natural Gas Corp", short: "ONGC", sector: "Energy & Oil" },
  { symbol: "NTPC.NS", name: "NTPC Limited", short: "NTPC", sector: "Energy & Oil" },
  { symbol: "ITC.NS", name: "ITC Limited", short: "ITC", sector: "FMCG" },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever", short: "HUL", sector: "FMCG" },
  { symbol: "DRREDDY.NS", name: "Dr Reddy's Laboratories", short: "DR REDDY", sector: "Pharma & Health" },
  { symbol: "TECHM.NS", name: "Tech Mahindra", short: "TECH MAHINDRA", sector: "Information Technology" },
  { symbol: "BAJAJAUT.NS", name: "Bajaj Auto", short: "BAJAJ AUTO", sector: "Automobiles" },
];

const PROXY_BASE = "/api/stock";

// ── THEME ─────────────────────────────────────────────────────────────────────
const T = {
  bg: "#0f1629",
  bgCard: "#1a2340",
  bgHover: "#1e2a4a",
  border: "#2a3a5c",
  borderLight: "#334466",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  textFaint: "#4a6080",
  green: "#22c55e",
  greenBg: "rgba(34,197,94,0.1)",
  greenBorder: "rgba(34,197,94,0.25)",
  red: "#ef4444",
  redBg: "rgba(239,68,68,0.1)",
  redBorder: "rgba(239,68,68,0.25)",
  yellow: "#eab308",
  blue: "#3b82f6",
  blueBg: "rgba(59,130,246,0.1)",
  blueBorder: "rgba(59,130,246,0.25)",
  accent: "#6366f1",
};

// ── DATA FETCHING ─────────────────────────────────────────────────────────────

async function fetchStockData(symbol) {
  try {
    const res = await fetch(`${PROXY_BASE}?symbol=${symbol}&range=6mo&interval=1d`, {
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json();
    const result = data.chart.result[0];
    const meta = result.meta;
    const closes = result.indicators.quote[0].close.map(v => (v != null ? v : null));
    const opens = result.indicators.quote[0].open.map(v => (v != null ? v : null));
    const highs = result.indicators.quote[0].high.map(v => (v != null ? v : null));
    const lows = result.indicators.quote[0].low.map(v => (v != null ? v : null));
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

    const rsi = () => {
      const period = 14;
      const slice = validCloses.slice(-period - 1);
      if (slice.length < period + 1) return null;
      let gains = 0, losses = 0;
      for (let i = 1; i < slice.length; i++) {
        const diff = slice[i] - slice[i - 1];
        if (diff > 0) gains += diff; else losses -= diff;
      }
      const avgGain = gains / period, avgLoss = losses / period;
      if (avgLoss === 0) return 100;
      return 100 - 100 / (1 + avgGain / avgLoss);
    };

    const year = validCloses.slice(-252);
    const high52 = Math.max(...year);
    const low52 = Math.min(...year);
    const posIn52W = ((current - low52) / (high52 - low52)) * 100;

    const avgVol30 = volumes.slice(-30).reduce((a, b) => a + b, 0) / 30;
    const todayVol = volumes[volumes.length - 1] || 0;
    const volRatio = avgVol30 > 0 ? todayVol / avgVol30 : 1;

    const sma20val = sma(20), sma50val = sma(50), sma200val = sma(200);
    const prevSma20 = validCloses.length > 21 ? validCloses.slice(-21, -1).reduce((a, b) => a + b, 0) / 20 : null;
    const prevSma50 = validCloses.length > 51 ? validCloses.slice(-51, -1).reduce((a, b) => a + b, 0) / 50 : null;
    let crossSignal = "NONE";
    if (prevSma20 && prevSma50 && sma20val && sma50val) {
      if (prevSma20 < prevSma50 && sma20val > sma50val) crossSignal = "GOLDEN";
      if (prevSma20 > prevSma50 && sma20val < sma50val) crossSignal = "DEATH";
    }

    const momentumScore = Math.min(100, Math.max(0,
      50 + (getReturn(10) || 0) * 2 + (getReturn(30) || 0) * 0.5 + (getReturn(100) || 0) * 0.2
    ));

    // Build OHLC history including today
    const history = timestamps.map((t, i) => ({
      date: new Date(t * 1000).toLocaleDateString("en-IN", { month: "short", day: "numeric" }),
      ts: t,
      close: closes[i],
      open: opens[i],
      high: highs[i],
      low: lows[i],
      volume: volumes[i],
    })).filter(d => d.close != null);

    return {
      symbol, current, prevClose,
      change: current - prevClose,
      changePct: ((current - prevClose) / prevClose) * 100,
      returns: { d10: getReturn(10), d20: getReturn(20), d30: getReturn(30), d100: getReturn(100) },
      sma20: sma20val, sma50: sma50val, sma200: sma200val, ema20: ema(20),
      rsi: rsi(), high52, low52, posIn52W,
      volRatio, avgVol30, todayVol,
      crossSignal, momentumScore, history,
    };
  } catch (e) {
    return null;
  }
}

async function getClaudeVerdict(d, stockName) {
  const prompt = `You are a sharp quantitative analyst. Analyze these technical indicators for ${stockName} and return ONLY a JSON object, no markdown, no backticks.

Indicators:
- Price: ₹${d.current?.toFixed(2)} | Day: ${d.changePct?.toFixed(2)}%
- RSI(14): ${d.rsi?.toFixed(1)} ${d.rsi > 70 ? "(OVERBOUGHT)" : d.rsi < 30 ? "(OVERSOLD)" : "(NEUTRAL)"}
- D10: ${d.returns?.d10?.toFixed(2)}% | D20: ${d.returns?.d20?.toFixed(2)}% | D30: ${d.returns?.d30?.toFixed(2)}% | D100: ${d.returns?.d100?.toFixed(2)}%
- vs SMA20 ₹${d.sma20?.toFixed(0)}: ${d.current > d.sma20 ? "ABOVE" : "BELOW"}
- vs SMA50 ₹${d.sma50?.toFixed(0)}: ${d.current > d.sma50 ? "ABOVE" : "BELOW"}
- vs SMA200 ₹${d.sma200?.toFixed(0)}: ${d.current > d.sma200 ? "ABOVE" : "BELOW"}
- 52W Position: ${d.posIn52W?.toFixed(1)}% | High: ₹${d.high52?.toFixed(0)} | Low: ₹${d.low52?.toFixed(0)}
- Volume: ${d.volRatio?.toFixed(2)}x vs 30D avg
- MA Cross: ${d.crossSignal}
- Momentum Score: ${d.momentumScore?.toFixed(0)}/100

Return this exact JSON:
{
  "verdict": "STRONG BUY" or "ACCUMULATE" or "HOLD" or "REDUCE" or "AVOID",
  "confidence": number 0-100,
  "momentum": "STRONG BULLISH" or "BULLISH" or "NEUTRAL" or "BEARISH" or "STRONG BEARISH",
  "rsi_signal": "one sentence on RSI",
  "trend_signal": "one sentence on moving averages",
  "volume_signal": "one sentence on volume",
  "key_risk": "biggest technical risk in one sentence",
  "summary": "2-sentence analyst summary of the setup"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  const text = data.content.map(c => c.text || "").join("");
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ── COMPONENTS ────────────────────────────────────────────────────────────────

function SparkLine({ history, change, width = 100, height = 36 }) {
  if (!history || history.length < 2) return null;
  const prices = history.map(h => h.close);
  const min = Math.min(...prices), max = Math.max(...prices);
  const range = max - min || 1;
  const color = change >= 0 ? T.green : T.red;
  const pts = prices.map((p, i) =>
    `${(i / (prices.length - 1)) * width},${height - ((p - min) / range) * height}`
  ).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg${change > 0 ? "up" : "dn"}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#sg${change > 0 ? "up" : "dn"})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function CandlestickChart({ history, sma20, sma50 }) {
  if (!history || history.length < 5) return (
    <div style={{ color: T.textFaint, fontSize: 12, padding: 20 }}>Loading chart...</div>
  );

  const W = 700, H = 200, PAD = { top: 10, right: 10, bottom: 24, left: 52 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  // Show last 60 candles max for readability
  const candles = history.slice(-60);
  const allPrices = candles.flatMap(c => [c.high, c.low]).filter(Boolean);
  const minP = Math.min(...allPrices) * 0.998;
  const maxP = Math.max(...allPrices) * 1.002;
  const range = maxP - minP || 1;

  const xScale = (i) => PAD.left + (i / (candles.length - 1)) * chartW;
  const yScale = (p) => PAD.top + chartH - ((p - minP) / range) * chartH;

  const candleWidth = Math.max(2, Math.floor(chartW / candles.length) - 2);

  // SMA lines over the candles
  const sma20pts = candles.map((_, i) => {
    const slice = candles.slice(Math.max(0, i - 19), i + 1).map(c => c.close).filter(Boolean);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    return `${xScale(i)},${yScale(avg)}`;
  }).join(" ");

  const sma50pts = candles.map((_, i) => {
    const slice = candles.slice(Math.max(0, i - 49), i + 1).map(c => c.close).filter(Boolean);
    const avg = slice.reduce((a, b) => a + b, 0) / slice.length;
    return `${xScale(i)},${yScale(avg)}`;
  }).join(" ");

  // Y axis labels
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD.top + chartH * (1 - f),
    val: (minP + f * range).toFixed(0),
  }));

  // X axis labels — show every ~10 candles
  const xLabels = candles.map((c, i) => ({ i, label: c.date }))
    .filter((_, i) => i % Math.ceil(candles.length / 6) === 0 || i === candles.length - 1);

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
        {/* Grid */}
        {yLabels.map((l, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={l.y} x2={W - PAD.right} y2={l.y} stroke={T.border} strokeWidth="1" strokeDasharray="3,4" />
            <text x={PAD.left - 6} y={l.y + 4} textAnchor="end" fill={T.textFaint} fontSize="9" fontFamily="monospace">
              {Number(l.val).toLocaleString("en-IN")}
            </text>
          </g>
        ))}

        {/* Candles */}
        {candles.map((c, i) => {
          if (!c.open || !c.close || !c.high || !c.low) return null;
          const isGreen = c.close >= c.open;
          const color = isGreen ? T.green : T.red;
          const bodyTop = yScale(Math.max(c.open, c.close));
          const bodyBot = yScale(Math.min(c.open, c.close));
          const bodyH = Math.max(1, bodyBot - bodyTop);
          const cx = xScale(i);
          return (
            <g key={i}>
              {/* Wick */}
              <line x1={cx} y1={yScale(c.high)} x2={cx} y2={yScale(c.low)} stroke={color} strokeWidth="1" opacity="0.8" />
              {/* Body */}
              <rect
                x={cx - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={bodyH}
                fill={isGreen ? color : color}
                fillOpacity={isGreen ? 0.8 : 0.9}
                stroke={color}
                strokeWidth="0.5"
              />
            </g>
          );
        })}

        {/* SMA Lines */}
        <polyline points={sma20pts} fill="none" stroke="#f59e0b" strokeWidth="1.2" strokeDasharray="4,3" opacity="0.8" />
        <polyline points={sma50pts} fill="none" stroke="#3b82f6" strokeWidth="1.2" strokeDasharray="4,3" opacity="0.8" />

        {/* X Labels */}
        {xLabels.map((l, i) => (
          <text key={i} x={xScale(l.i)} y={H - 6} textAnchor="middle" fill={T.textFaint} fontSize="9" fontFamily="monospace">
            {l.label}
          </text>
        ))}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: 20, marginTop: 6 }}>
        {[
          { color: T.green, label: "Bullish candle" },
          { color: T.red, label: "Bearish candle" },
          { color: "#f59e0b", label: "SMA 20", dashed: true },
          { color: "#3b82f6", label: "SMA 50", dashed: true },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{
              width: 20, height: 2,
              background: item.dashed ? "none" : item.color,
              borderTop: item.dashed ? `2px dashed ${item.color}` : "none",
            }} />
            <span style={{ color: T.textFaint, fontSize: 10 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RSIGauge({ value }) {
  if (!value) return null;
  const pct = value / 100;
  const color = value > 70 ? T.red : value < 30 ? T.green : T.yellow;
  const label = value > 70 ? "OVERBOUGHT" : value < 30 ? "OVERSOLD" : "NEUTRAL";
  return (
    <div style={{ textAlign: "center" }}>
      <svg width="90" height="50" viewBox="0 0 90 50" style={{ display: "block", margin: "0 auto" }}>
        <path d="M10,45 A35,35 0 0,1 80,45" fill="none" stroke={T.border} strokeWidth="7" strokeLinecap="round" />
        <path d="M10,45 A35,35 0 0,1 80,45" fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${pct * 109.9} 109.9`} />
        <text x="45" y="42" textAnchor="middle" fill={color} fontSize="14" fontWeight="700" fontFamily="monospace">
          {value.toFixed(0)}
        </text>
      </svg>
      <div style={{ color, fontSize: 10, letterSpacing: "1px", marginTop: 2, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function VerdictBadge({ verdict, size = "sm" }) {
  const map = {
    "STRONG BUY": { bg: "#166534", text: "#4ade80", border: "#22c55e" },
    "ACCUMULATE": { bg: "#14532d", text: "#86efac", border: "#16a34a" },
    "HOLD": { bg: "#713f12", text: "#fde68a", border: "#eab308" },
    "REDUCE": { bg: "#7c2d12", text: "#fdba74", border: "#ea580c" },
    "AVOID": { bg: "#7f1d1d", text: "#fca5a5", border: "#ef4444" },
  };
  const c = map[verdict] || { bg: T.bgCard, text: T.text, border: T.border };
  return (
    <div style={{
      background: c.bg, color: c.text, border: `1px solid ${c.border}`,
      borderRadius: 6,
      padding: size === "lg" ? "8px 20px" : "3px 10px",
      fontSize: size === "lg" ? 15 : 11,
      fontWeight: 700, display: "inline-block", letterSpacing: "0.5px",
      fontFamily: "monospace",
    }}>{verdict || "—"}</div>
  );
}

function ReturnPill({ label, value }) {
  const isPos = value >= 0;
  const color = isPos ? T.green : T.red;
  const bg = isPos ? T.greenBg : T.redBg;
  const border = isPos ? T.greenBorder : T.redBorder;
  return (
    <div style={{ textAlign: "center", padding: "10px 8px", background: bg, border: `1px solid ${border}`, borderRadius: 8 }}>
      <div style={{ color: T.textMuted, fontSize: 10, marginBottom: 5, letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ color, fontSize: 15, fontWeight: 700, fontFamily: "monospace" }}>
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
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${pct}%`, background: `linear-gradient(90deg, ${T.green}, ${color})`,
          borderRadius: 4, transition: "width 1s ease",
        }} />
        <div style={{
          position: "absolute", top: -4, left: `${pct}%`,
          transform: "translateX(-50%)", width: 16, height: 16,
          borderRadius: "50%", background: color, border: `2px solid ${T.bg}`,
          boxShadow: `0 0 8px ${color}66`,
        }} />
      </div>
      <div style={{ textAlign: "center", marginTop: 10, color, fontSize: 13, fontWeight: 700 }}>
        {pct.toFixed(1)}% of 52-week range
      </div>
    </div>
  );
}

function Card({ children, style = {} }) {
  return (
    <div style={{
      background: T.bgCard, border: `1px solid ${T.border}`,
      borderRadius: 12, padding: 18, ...style,
    }}>
      {children}
    </div>
  );
}

function Label({ children }) {
  return (
    <div style={{ color: T.textFaint, fontSize: 10, letterSpacing: "1.2px", marginBottom: 10, textTransform: "uppercase", fontFamily: "monospace" }}>
      {children}
    </div>
  );
}

function Tag({ label, color }) {
  return (
    <span style={{
      background: `${color}22`, color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "2px 7px", fontSize: 10, fontWeight: 600,
    }}>{label}</span>
  );
}

// ── MAIN APP ─────────────────────────────────────────────────────────────────

export default function DalalStreet() {
  const [page, setPage] = useState(1);
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState(ALL_STOCKS[0]);
  const [verdict, setVerdict] = useState(null);
  const [verdictLoading, setVerdictLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("changePct");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [compareList, setCompareList] = useState([ALL_STOCKS[0], ALL_STOCKS[1]]);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    async function loadAll() {
      setLoading(true);
      await Promise.all(ALL_STOCKS.map(async (s) => {
        const d = await fetchStockData(s.symbol);
        if (d) setStockData(prev => ({ ...prev, [s.symbol]: d }));
      }));
      setLoading(false);
    }
    loadAll();
  }, []);

  useEffect(() => {
    if (page !== 3) return;
    const d = stockData[selectedStock.symbol];
    if (!d) return;
    setVerdict(null);
    setVerdictLoading(true);
    getClaudeVerdict(d, selectedStock.name)
      .then(v => { setVerdict(v); setVerdictLoading(false); })
      .catch(() => setVerdictLoading(false));
  }, [selectedStock, page, stockData]);

  const loadedCount = Object.keys(stockData).length;

  const filteredStocks = ALL_STOCKS.filter(s => {
    if (sectorFilter !== "all" && s.sector !== sectorFilter) return false;
    if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !s.short.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const da = stockData[a.symbol], db = stockData[b.symbol];
    if (!da && !db) return 0;
    if (!da) return 1;
    if (!db) return -1;
    if (sortBy === "changePct") return db.changePct - da.changePct;
    if (sortBy === "momentum") return db.momentumScore - da.momentumScore;
    if (sortBy === "rsi") return db.rsi - da.rsi;
    if (sortBy === "vol") return db.volRatio - da.volRatio;
    if (sortBy === "r100") return (db.returns?.d100 || 0) - (da.returns?.d100 || 0);
    return 0;
  });

  const sectorStats = SECTORS.map(sector => {
    const stocks = sector.stocks.map(sym => stockData[sym]).filter(Boolean);
    if (!stocks.length) return { ...sector, avgChange: null, bullish: 0, total: 0, loadedStocks: [] };
    const avgChange = stocks.reduce((a, b) => a + b.changePct, 0) / stocks.length;
    const bullish = stocks.filter(s => s.changePct > 0).length;
    return { ...sector, avgChange, bullish, total: stocks.length, loadedStocks: stocks };
  });

  const d = stockData[selectedStock.symbol];

  const navItems = [
    { n: 1, label: "Market" },
    { n: 2, label: "Screener" },
    { n: 3, label: "Deep Dive" },
    { n: 4, label: "Compare" },
  ];

  const pct = (v) => v != null ? `${v >= 0 ? "+" : ""}${v.toFixed(2)}%` : "—";
  const rupee = (v) => v != null ? `₹${v.toLocaleString("en-IN", { maximumFractionDigits: 1 })}` : "—";

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
        .stock-row:hover { background: ${T.bgHover} !important; cursor: pointer; }
        .sector-card:hover { border-color: ${T.borderLight} !important; transform: translateY(-2px); cursor: pointer; }
        .stock-chip:hover { background: ${T.bgHover} !important; }
        input:focus, select:focus { outline: 2px solid ${T.blue}; outline-offset: 1px; }
      `}</style>

      {/* TOP NAV */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100,
        background: T.bgCard, borderBottom: `1px solid ${T.border}`,
        padding: "0 24px", height: 52,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            background: "linear-gradient(135deg, #6366f1, #3b82f6)",
            borderRadius: 8, width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 800, color: "#fff", fontFamily: "JetBrains Mono",
          }}>D</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: T.text, letterSpacing: "-0.3px" }}>
              DALAL<span style={{ color: T.accent }}>·</span>STREET
            </div>
            <div style={{ color: T.textFaint, fontSize: 9, letterSpacing: "1px" }}>BSE QUANTITATIVE SCREENER</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {navItems.map(({ n, label }) => (
            <button key={n} className="nav-btn" onClick={() => setPage(n)} style={{
              background: page === n ? T.accent : "transparent",
              color: page === n ? "#fff" : T.textMuted,
              border: `1px solid ${page === n ? T.accent : T.border}`,
              borderRadius: 6, padding: "5px 16px", fontSize: 12, fontWeight: 500,
              fontFamily: "inherit", cursor: "pointer", transition: "all 0.15s",
            }}>{label}</button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 12, border: `2px solid ${T.border}`, borderTopColor: T.blue, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
              <span style={{ color: T.textMuted, fontSize: 11 }}>{loadedCount}/{ALL_STOCKS.length} loading</span>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.green, animation: "pulse 2s infinite" }} />
            <span style={{ color: T.textMuted, fontSize: 11 }}>15 MIN DELAY</span>
          </div>
          <div style={{ color: T.textFaint, fontSize: 11 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </div>
        </div>
      </div>

      {/* ── PAGE 1: MARKET ── */}
      {page === 1 && (
        <div style={{ padding: "24px", animation: "fadeUp 0.3s ease" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: T.text, letterSpacing: "-0.5px" }}>Market Overview</h1>
            <p style={{ color: T.textMuted, marginTop: 4 }}>
              BSE Sector Performance · {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {/* Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            {[
              { label: "Stocks Tracked", value: ALL_STOCKS.length, color: T.text },
              { label: "Advancing ▲", value: Object.values(stockData).filter(d => d.changePct > 0).length, color: T.green },
              { label: "Declining ▼", value: Object.values(stockData).filter(d => d.changePct < 0).length, color: T.red },
              { label: "RSI Overbought (>70)", value: Object.values(stockData).filter(d => d.rsi > 70).length, color: T.yellow },
            ].map((item, i) => (
              <Card key={i} style={{ textAlign: "center" }}>
                <div style={{ color: T.textMuted, fontSize: 11, marginBottom: 8 }}>{item.label}</div>
                <div style={{ color: item.color, fontSize: 32, fontWeight: 800, fontFamily: "JetBrains Mono" }}>
                  {item.value}
                </div>
              </Card>
            ))}
          </div>

          {/* Sector Heatmap */}
          <Label>Sector Heatmap</Label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
            {sectorStats.map(sector => {
              const isPos = sector.avgChange >= 0;
              const intensity = Math.min(1, Math.abs(sector.avgChange || 0) / 4);
              return (
                <div key={sector.id} className="sector-card" style={{
                  background: sector.avgChange == null ? T.bgCard
                    : isPos ? `rgba(34,197,94,${0.04 + intensity * 0.12})`
                    : `rgba(239,68,68,${0.04 + intensity * 0.12})`,
                  border: `1px solid ${sector.avgChange == null ? T.border
                    : isPos ? `rgba(34,197,94,${0.2 + intensity * 0.4})`
                    : `rgba(239,68,68,${0.2 + intensity * 0.4})`}`,
                  borderLeft: `3px solid ${sector.color}`,
                  borderRadius: 12, padding: 16, transition: "all 0.2s",
                }} onClick={() => { setSectorFilter(sector.name); setPage(2); }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ color: T.text, fontWeight: 700, fontSize: 13 }}>{sector.name}</div>
                      <div style={{ color: T.textMuted, fontSize: 11, marginTop: 2 }}>{sector.total || "—"} stocks</div>
                    </div>
                    {sector.avgChange != null ? (
                      <div style={{ color: isPos ? T.green : T.red, fontSize: 20, fontWeight: 800, fontFamily: "JetBrains Mono" }}>
                        {isPos ? "+" : ""}{sector.avgChange.toFixed(2)}%
                      </div>
                    ) : (
                      <div style={{ color: T.textFaint, fontSize: 11, animation: "pulse 1.5s infinite" }}>loading</div>
                    )}
                  </div>

                  {sector.total > 0 && (
                    <>
                      <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: "hidden", marginBottom: 10 }}>
                        <div style={{
                          height: "100%", width: `${(sector.bullish / sector.total) * 100}%`,
                          background: T.green, borderRadius: 2, transition: "width 0.8s",
                        }} />
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {sector.loadedStocks.map((s, i) => {
                          const stock = ALL_STOCKS.find(a => a.symbol === s.symbol);
                          return (
                            <span key={i} style={{
                              background: s.changePct > 0 ? T.greenBg : T.redBg,
                              color: s.changePct > 0 ? T.green : T.red,
                              border: `1px solid ${s.changePct > 0 ? T.greenBorder : T.redBorder}`,
                              borderRadius: 4, padding: "2px 6px", fontSize: 10, fontWeight: 500,
                            }}>{stock?.short || s.symbol.replace(".NS", "")}</span>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Gainers / Losers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              { title: "Top Gainers Today", stocks: [...ALL_STOCKS].sort((a, b) => (stockData[b.symbol]?.changePct || -99) - (stockData[a.symbol]?.changePct || -99)).slice(0, 6), pos: true },
              { title: "Top Losers Today", stocks: [...ALL_STOCKS].sort((a, b) => (stockData[a.symbol]?.changePct || 99) - (stockData[b.symbol]?.changePct || 99)).slice(0, 6), pos: false },
            ].map(group => (
              <Card key={group.title}>
                <Label>{group.title}</Label>
                {group.stocks.map(stock => {
                  const d = stockData[stock.symbol];
                  return (
                    <div key={stock.symbol} className="stock-row" style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "8px 10px", borderRadius: 8, marginBottom: 3, transition: "background 0.15s",
                    }} onClick={() => { setSelectedStock(stock); setPage(3); }}>
                      <div>
                        <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{stock.short}</div>
                        <div style={{ color: T.textFaint, fontSize: 10, marginTop: 1 }}>{stock.sector}</div>
                      </div>
                      {d ? (
                        <div style={{ textAlign: "right" }}>
                          <div style={{ color: T.textMuted, fontSize: 12, fontFamily: "JetBrains Mono" }}>
                            {rupee(d.current)}
                          </div>
                          <div style={{ color: group.pos ? T.green : T.red, fontSize: 12, fontWeight: 700, fontFamily: "JetBrains Mono" }}>
                            {pct(d.changePct)}
                          </div>
                        </div>
                      ) : <div style={{ color: T.textFaint, fontSize: 11, animation: "pulse 1.5s infinite" }}>—</div>}
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
        <div style={{ padding: "24px", animation: "fadeUp 0.3s ease" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20 }}>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>Stock Screener</h1>
              <p style={{ color: T.textMuted, marginTop: 4 }}>{filteredStocks.length} stocks · Click any row to deep dive</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{
                background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: "7px 12px", color: T.text, fontSize: 12, fontFamily: "inherit", width: 150,
              }} />
              <select value={sectorFilter} onChange={e => setSectorFilter(e.target.value)} style={{
                background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: "7px 10px", color: T.textMuted, fontSize: 12, fontFamily: "inherit",
              }}>
                <option value="all">All Sectors</option>
                {SECTORS.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{
                background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8,
                padding: "7px 10px", color: T.textMuted, fontSize: 12, fontFamily: "inherit",
              }}>
                <option value="changePct">Sort: Day %</option>
                <option value="momentum">Sort: Momentum</option>
                <option value="rsi">Sort: RSI</option>
                <option value="vol">Sort: Volume</option>
                <option value="r100">Sort: 100D Return</option>
              </select>
            </div>
          </div>

          <Card style={{ padding: 0, overflow: "hidden" }}>
            {/* Header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "170px 100px 85px 75px 75px 75px 65px 70px 80px 80px 90px",
              padding: "10px 16px", background: T.bg, borderBottom: `1px solid ${T.border}`,
            }}>
              {["Stock", "Price", "Day %", "D10", "D30", "D100", "RSI", "Vol×", "52W Pos", "Mom", "Chart"].map(h => (
                <div key={h} style={{ color: T.textFaint, fontSize: 10, letterSpacing: "0.8px", textTransform: "uppercase", fontFamily: "JetBrains Mono" }}>{h}</div>
              ))}
            </div>

            {filteredStocks.map((stock, idx) => {
              const d = stockData[stock.symbol];
              const isLast = idx === filteredStocks.length - 1;
              return (
                <div key={stock.symbol} className="stock-row" style={{
                  display: "grid",
                  gridTemplateColumns: "170px 100px 85px 75px 75px 75px 65px 70px 80px 80px 90px",
                  padding: "9px 16px",
                  borderBottom: isLast ? "none" : `1px solid ${T.border}`,
                  transition: "background 0.12s", alignItems: "center",
                }} onClick={() => { setSelectedStock(stock); setPage(3); }}>
                  <div>
                    <div style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{stock.short}</div>
                    <div style={{ color: T.textFaint, fontSize: 10, marginTop: 1 }}>{stock.sector}</div>
                  </div>
                  <div style={{ color: T.textMuted, fontSize: 12, fontFamily: "JetBrains Mono" }}>
                    {d ? rupee(d.current) : <span style={{ animation: "pulse 1.5s infinite", color: T.textFaint }}>—</span>}
                  </div>
                  <div style={{ color: d ? (d.changePct >= 0 ? T.green : T.red) : T.textFaint, fontWeight: 700, fontSize: 12, fontFamily: "JetBrains Mono" }}>
                    {d ? pct(d.changePct) : "—"}
                  </div>
                  {[d?.returns?.d10, d?.returns?.d30, d?.returns?.d100].map((v, i) => (
                    <div key={i} style={{ color: v == null ? T.textFaint : v >= 0 ? T.green : T.red, fontSize: 11, fontFamily: "JetBrains Mono" }}>
                      {v != null ? pct(v) : "—"}
                    </div>
                  ))}
                  <div style={{ color: d ? (d.rsi > 70 ? T.red : d.rsi < 30 ? T.green : T.yellow) : T.textFaint, fontSize: 11, fontFamily: "JetBrains Mono" }}>
                    {d ? d.rsi.toFixed(0) : "—"}
                  </div>
                  <div style={{ color: d ? (d.volRatio > 1.5 ? T.yellow : T.textMuted) : T.textFaint, fontSize: 11, fontFamily: "JetBrains Mono" }}>
                    {d ? `${d.volRatio.toFixed(1)}×` : "—"}
                  </div>
                  <div>
                    {d && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <div style={{ width: 50, height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${d.posIn52W}%`,
                            background: d.posIn52W > 75 ? T.red : d.posIn52W < 30 ? T.green : T.yellow,
                            borderRadius: 2,
                          }} />
                        </div>
                        <span style={{ color: T.textFaint, fontSize: 10 }}>{d.posIn52W.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                  <div>
                    {d && (
                      <div style={{ width: 60, height: 4, background: T.border, borderRadius: 2, overflow: "hidden" }}>
                        <div style={{
                          height: "100%", width: `${Math.min(100, d.momentumScore)}%`,
                          background: d.momentumScore > 60 ? T.green : d.momentumScore > 40 ? T.yellow : T.red,
                          borderRadius: 2,
                        }} />
                      </div>
                    )}
                  </div>
                  <div>{d ? <SparkLine history={d.history} change={d.change} width={80} height={28} /> : null}</div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {/* ── PAGE 3: DEEP DIVE ── */}
      {page === 3 && (
        <div style={{ padding: "24px", animation: "fadeUp 0.3s ease" }}>
          {/* Stock chips */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 20 }}>
            {ALL_STOCKS.map(s => (
              <button key={s.symbol} className="stock-chip" onClick={() => setSelectedStock(s)} style={{
                background: selectedStock.symbol === s.symbol ? T.accent : T.bgCard,
                color: selectedStock.symbol === s.symbol ? "#fff" : T.textMuted,
                border: `1px solid ${selectedStock.symbol === s.symbol ? T.accent : T.border}`,
                borderRadius: 6, padding: "4px 12px", fontSize: 11, fontFamily: "JetBrains Mono",
                cursor: "pointer", fontWeight: selectedStock.symbol === s.symbol ? 700 : 400,
                transition: "all 0.15s",
              }}>{s.short}</button>
            ))}
          </div>

          {!d && (
            <div style={{ textAlign: "center", padding: 60, color: T.textFaint, animation: "pulse 1.5s infinite" }}>
              Loading data...
            </div>
          )}

          {d && (
            <>
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                <div>
                  <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.5px" }}>{selectedStock.name}</h1>
                  <div style={{ color: T.textMuted, fontSize: 12, marginTop: 4 }}>
                    {selectedStock.sector} · {selectedStock.symbol}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 10 }}>
                    <span style={{ color: T.text, fontSize: 34, fontWeight: 800, fontFamily: "JetBrains Mono" }}>
                      ₹{d.current.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                    </span>
                    <span style={{ color: d.change >= 0 ? T.green : T.red, fontSize: 16, fontWeight: 700, fontFamily: "JetBrains Mono" }}>
                      {d.change >= 0 ? "▲" : "▼"} ₹{Math.abs(d.change).toFixed(2)} ({Math.abs(d.changePct).toFixed(2)}%)
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    {d.crossSignal !== "NONE" && (
                      <Tag
                        label={d.crossSignal === "GOLDEN" ? "⭐ Golden Cross" : "☠️ Death Cross"}
                        color={d.crossSignal === "GOLDEN" ? T.green : T.red}
                      />
                    )}
                    <Tag label={`RSI ${d.rsi?.toFixed(0)}`} color={d.rsi > 70 ? T.red : d.rsi < 30 ? T.green : T.yellow} />
                    <Tag label={`Vol ${d.volRatio.toFixed(1)}×`} color={d.volRatio > 1.5 ? T.yellow : T.textMuted} />
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {verdictLoading ? (
                    <div style={{ color: T.yellow, fontSize: 12, animation: "pulse 1s infinite" }}>Claude analyzing...</div>
                  ) : verdict ? (
                    <>
                      <VerdictBadge verdict={verdict.verdict} size="lg" />
                      <div style={{ color: T.textMuted, fontSize: 11, marginTop: 6 }}>
                        Confidence: <span style={{ color: T.text, fontWeight: 600 }}>{verdict.confidence}%</span>
                      </div>
                    </>
                  ) : null}
                </div>
              </div>

              {/* Candlestick Chart */}
              <Card style={{ marginBottom: 16 }}>
                <Label>6-Month Candlestick Chart with SMA20 & SMA50</Label>
                <CandlestickChart history={d.history} sma20={d.sma20} sma50={d.sma50} />
              </Card>

              {/* Returns */}
              <Card style={{ marginBottom: 16 }}>
                <Label>Price Returns</Label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                  <ReturnPill label="10 Day" value={d.returns.d10} />
                  <ReturnPill label="20 Day" value={d.returns.d20} />
                  <ReturnPill label="30 Day" value={d.returns.d30} />
                  <ReturnPill label="100 Day" value={d.returns.d100} />
                </div>
              </Card>

              {/* KPI Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Moving Averages */}
                <Card>
                  <Label>Moving Averages</Label>
                  {[
                    { label: "SMA 20", val: d.sma20 },
                    { label: "SMA 50", val: d.sma50 },
                    { label: "SMA 200", val: d.sma200 },
                    { label: "EMA 20", val: d.ema20 },
                  ].map(item => {
                    const above = d.current > item.val;
                    return (
                      <div key={item.label} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        padding: "7px 0", borderBottom: `1px solid ${T.border}`,
                      }}>
                        <span style={{ color: T.textMuted, fontSize: 12 }}>{item.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ color: T.text, fontSize: 12, fontFamily: "JetBrains Mono" }}>
                            ₹{item.val?.toFixed(0) || "—"}
                          </span>
                          <span style={{
                            background: above ? T.greenBg : T.redBg,
                            color: above ? T.green : T.red,
                            border: `1px solid ${above ? T.greenBorder : T.redBorder}`,
                            borderRadius: 4, padding: "1px 6px", fontSize: 10, fontWeight: 600,
                          }}>{above ? "▲" : "▼"}</span>
                        </div>
                      </div>
                    );
                  })}
                </Card>

                {/* RSI */}
                <Card style={{ textAlign: "center" }}>
                  <Label>RSI (14-Day)</Label>
                  <RSIGauge value={d.rsi} />
                  <div style={{ marginTop: 14, textAlign: "left" }}>
                    {[
                      { label: "Signal", value: d.rsi > 70 ? "Overbought" : d.rsi < 30 ? "Oversold" : "Neutral zone" },
                      { label: "Value", value: d.rsi?.toFixed(2) },
                    ].map(item => (
                      <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${T.border}` }}>
                        <span style={{ color: T.textMuted, fontSize: 12 }}>{item.label}</span>
                        <span style={{ color: T.text, fontSize: 12, fontFamily: "JetBrains Mono" }}>{item.value}</span>
                      </div>
                    ))}
                    {verdict?.rsi_signal && (
                      <div style={{ color: T.textMuted, fontSize: 11, marginTop: 10, lineHeight: 1.5 }}>
                        {verdict.rsi_signal}
                      </div>
                    )}
                  </div>
                </Card>

                {/* Volume */}
                <Card>
                  <Label>Volume Analysis</Label>
                  <div style={{ textAlign: "center", marginBottom: 14 }}>
                    <div style={{ color: d.volRatio > 1.5 ? T.yellow : T.text, fontSize: 32, fontWeight: 800, fontFamily: "JetBrains Mono" }}>
                      {d.volRatio.toFixed(2)}×
                    </div>
                    <div style={{ color: T.textMuted, fontSize: 11 }}>vs 30-day average</div>
                  </div>
                  {[
                    { label: "Today", value: `${(d.todayVol / 1e6).toFixed(2)}M` },
                    { label: "30D Avg", value: `${(d.avgVol30 / 1e6).toFixed(2)}M` },
                    { label: "Signal", value: d.volRatio > 2 ? "Unusual spike ⚠️" : d.volRatio > 1.3 ? "Above average" : "Normal" },
                  ].map(item => (
                    <div key={item.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${T.border}` }}>
                      <span style={{ color: T.textMuted, fontSize: 12 }}>{item.label}</span>
                      <span style={{ color: T.text, fontSize: 12, fontFamily: "JetBrains Mono" }}>{item.value}</span>
                    </div>
                  ))}
                </Card>
              </div>

              {/* 52W Bar */}
              <Card style={{ marginBottom: 16 }}>
                <Label>52-Week Range Position</Label>
                <PositionBar value={d.posIn52W} low={d.low52} high={d.high52} />
              </Card>

              {/* Claude Verdict */}
              {verdict && (
                <Card style={{ border: `1px solid ${T.blueBorder}`, background: T.blueBg, animation: "fadeUp 0.4s ease" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <Label>Claude AI Quantitative Verdict</Label>
                    <VerdictBadge verdict={verdict.verdict} />
                  </div>
                  <p style={{ color: T.textMuted, fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
                    {verdict.summary}
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {[
                      { label: "Trend", text: verdict.trend_signal, warn: false },
                      { label: "Volume", text: verdict.volume_signal, warn: false },
                      { label: "Momentum", text: verdict.momentum, warn: false },
                      { label: "Key Risk", text: verdict.key_risk, warn: true },
                    ].map(item => (
                      <div key={item.label} style={{
                        padding: "10px 12px", borderRadius: 8,
                        background: item.warn ? T.redBg : T.bgCard,
                        border: `1px solid ${item.warn ? T.redBorder : T.border}`,
                      }}>
                        <div style={{ color: item.warn ? T.red : T.textFaint, fontSize: 10, letterSpacing: "0.8px", marginBottom: 5, textTransform: "uppercase" }}>
                          {item.label}
                        </div>
                        <div style={{ color: item.warn ? "#fca5a5" : T.textMuted, fontSize: 12, lineHeight: 1.5 }}>{item.text}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 14, color: T.textFaint, fontSize: 10, borderTop: `1px solid ${T.border}`, paddingTop: 10 }}>
                    Based purely on technical indicators · Not financial advice · Always do your own research
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ── PAGE 4: COMPARE ── */}
      {page === 4 && (
        <div style={{ padding: "24px", animation: "fadeUp 0.3s ease" }}>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" }}>Compare Stocks</h1>
            <p style={{ color: T.textMuted, marginTop: 4 }}>Side-by-side technical comparison across all KPIs</p>
          </div>

          <div style={{ display: "flex", gap: 16, marginBottom: 24 }}>
            {[0, 1].map(idx => (
              <div key={idx}>
                <div style={{ color: T.textFaint, fontSize: 10, letterSpacing: "1px", marginBottom: 5, textTransform: "uppercase" }}>
                  Stock {idx + 1}
                </div>
                <select value={compareList[idx].symbol} onChange={e => {
                  const s = ALL_STOCKS.find(a => a.symbol === e.target.value);
                  setCompareList(prev => { const n = [...prev]; n[idx] = s; return n; });
                }} style={{
                  background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8,
                  padding: "8px 14px", color: T.text, fontSize: 13, fontFamily: "inherit",
                }}>
                  {ALL_STOCKS.map(s => <option key={s.symbol} value={s.symbol}>{s.name}</option>)}
                </select>
              </div>
            ))}
          </div>

          {/* Comparison Table */}
          <Card style={{ padding: 0, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 1fr", background: T.bg, borderBottom: `1px solid ${T.border}` }}>
              <div style={{ padding: "10px 16px", color: T.textFaint, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.8px" }}>Metric</div>
              {compareList.map(s => (
                <div key={s.symbol} style={{ padding: "10px 16px", color: T.text, fontWeight: 700, fontSize: 13 }}>
                  {s.short} <span style={{ color: T.textFaint, fontWeight: 400, fontSize: 11 }}>({s.sector})</span>
                </div>
              ))}
            </div>

            {[
              { label: "Current Price", fn: d => d ? rupee(d.current) : "—" },
              { label: "Day Change", fn: d => d ? pct(d.changePct) : "—", colorFn: d => d?.changePct >= 0 ? T.green : T.red },
              { label: "10D Return", fn: d => d?.returns?.d10 != null ? pct(d.returns.d10) : "—", colorFn: d => (d?.returns?.d10 || 0) >= 0 ? T.green : T.red },
              { label: "20D Return", fn: d => d?.returns?.d20 != null ? pct(d.returns.d20) : "—", colorFn: d => (d?.returns?.d20 || 0) >= 0 ? T.green : T.red },
              { label: "30D Return", fn: d => d?.returns?.d30 != null ? pct(d.returns.d30) : "—", colorFn: d => (d?.returns?.d30 || 0) >= 0 ? T.green : T.red },
              { label: "100D Return", fn: d => d?.returns?.d100 != null ? pct(d.returns.d100) : "—", colorFn: d => (d?.returns?.d100 || 0) >= 0 ? T.green : T.red },
              { label: "RSI (14)", fn: d => d ? d.rsi.toFixed(1) : "—", colorFn: d => d?.rsi > 70 ? T.red : d?.rsi < 30 ? T.green : T.yellow },
              { label: "SMA 20", fn: d => d?.sma20 ? `₹${d.sma20.toFixed(0)}` : "—" },
              { label: "SMA 50", fn: d => d?.sma50 ? `₹${d.sma50.toFixed(0)}` : "—" },
              { label: "SMA 200", fn: d => d?.sma200 ? `₹${d.sma200.toFixed(0)}` : "—" },
              { label: "Price vs SMA200", fn: d => d ? (d.current > d.sma200 ? "Above ▲" : "Below ▼") : "—", colorFn: d => d?.current > d?.sma200 ? T.green : T.red },
              { label: "52W High", fn: d => d ? `₹${d.high52.toFixed(0)}` : "—" },
              { label: "52W Low", fn: d => d ? `₹${d.low52.toFixed(0)}` : "—" },
              { label: "52W Position", fn: d => d ? `${d.posIn52W.toFixed(1)}%` : "—", colorFn: d => d?.posIn52W > 75 ? T.red : d?.posIn52W < 30 ? T.green : T.yellow },
              { label: "Volume Ratio", fn: d => d ? `${d.volRatio.toFixed(2)}×` : "—", colorFn: d => d?.volRatio > 1.5 ? T.yellow : T.textMuted },
              { label: "Momentum Score", fn: d => d ? `${d.momentumScore.toFixed(0)}/100` : "—", colorFn: d => d?.momentumScore > 60 ? T.green : d?.momentumScore > 40 ? T.yellow : T.red },
              { label: "MA Cross Signal", fn: d => d ? (d.crossSignal === "NONE" ? "None" : d.crossSignal) : "—", colorFn: d => d?.crossSignal === "GOLDEN" ? T.green : d?.crossSignal === "DEATH" ? T.red : T.textMuted },
            ].map((row, i) => {
              const vals = compareList.map(s => stockData[s.symbol]);
              return (
                <div key={row.label} style={{
                  display: "grid", gridTemplateColumns: "200px 1fr 1fr",
                  borderBottom: `1px solid ${T.border}`,
                  background: i % 2 === 0 ? "transparent" : `${T.bg}88`,
                }}>
                  <div style={{ padding: "9px 16px", color: T.textMuted, fontSize: 12 }}>{row.label}</div>
                  {vals.map((d, idx) => (
                    <div key={idx} style={{ padding: "9px 16px", color: row.colorFn ? row.colorFn(d) : T.text, fontSize: 12, fontFamily: "JetBrains Mono", fontWeight: 500 }}>
                      {row.fn(d)}
                    </div>
                  ))}
                </div>
              );
            })}
          </Card>

          {/* Mini Charts */}
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
                    {d && (
                      <div style={{ textAlign: "right" }}>
                        <div style={{ color: T.text, fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 600 }}>{rupee(d.current)}</div>
                        <div style={{ color: d.changePct >= 0 ? T.green : T.red, fontSize: 12, fontFamily: "JetBrains Mono" }}>{pct(d.changePct)}</div>
                      </div>
                    )}
                  </div>
                  {d ? <SparkLine history={d.history} change={d.change} width={400} height={70} /> : (
                    <div style={{ color: T.textFaint, animation: "pulse 1.5s infinite", padding: 20 }}>Loading...</div>
                  )}
                </Card>
              );
            })}
          </div>

          <div style={{ marginTop: 16, color: T.textFaint, fontSize: 11, textAlign: "center" }}>
            All data from Yahoo Finance · 15-min delayed · Technical analysis only · Not financial advice
          </div>
        </div>
      )}
    </div>
  );
}
