// On-screen text and animated numbers (crisp HTML over the 3D), plus the cut flashes and the final fade.
import React from "react";
import { AbsoluteFill } from "remotion";
import { BUYS, COL, DROPS, RANGE, SC, backOut, clamp, easeOut, monthLabel, priceAt, ramp, smooth } from "./timeline";
import { C1, C2, chartYearAt, depIndex } from "./Scenes";

const F = "Anton, Impact, sans-serif", I = "Inter, Arial, sans-serif";
const shadow = "0 4px 0 rgba(0,0,0,0.55), 0 0 26px rgba(0,0,0,0.6)";
const vis = (t: number, a: number, b: number, fade = 0.25) => clamp(Math.min((t - a) / fade, (b - t) / fade));
const pop = (t: number, a: number) => backOut(ramp(t, a, a + 0.35));

const Box: React.FC<{ top: number; children: React.ReactNode; o?: number; s?: number }> = ({ top, children, o = 1, s = 1 }) => (
  <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", opacity: o,
    transform: `scale(${s})`, transformOrigin: "50% 50%", textAlign: "center" }}>{children}</div>
);
const Big: React.FC<{ size: number; color?: string; children: React.ReactNode; glow?: string }> = ({ size, color = "#fff", children, glow }) => (
  <div style={{ fontFamily: F, fontSize: size, lineHeight: 1.02, color, textShadow: glow ? `${shadow}, 0 0 40px ${glow}, 0 0 80px ${glow}` : shadow, letterSpacing: 1 }}>{children}</div>
);
const Pill: React.FC<{ children: React.ReactNode; bg?: string; color?: string }> = ({ children, bg = "rgba(8,14,32,0.78)", color = "#fff" }) => (
  <div style={{ fontFamily: I, fontWeight: 800, fontSize: 30, color, background: bg, padding: "10px 22px", borderRadius: 14, margin: 6,
    border: "2px solid rgba(63,216,255,0.55)", boxShadow: "0 8px 30px rgba(0,0,0,0.5)" }}>{children}</div>
);
const fmtPrice = (p: number) => p >= 1000 ? "$" + Math.round(p).toLocaleString("en-US") : p >= 10 ? "$" + p.toFixed(0) : "$" + p.toFixed(2);
const M = (v: number) => `$${Math.round(v / 1e6)}`;

export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const els: React.ReactNode[] = [];
  // ---------------------------------------------------------------- clip 1
  { const o = vis(t, 1.7, 5.0); if (o > 0) els.push(
    <Box key="hook" top={150} o={o} s={pop(t, 1.7)}><Big size={92}>$20 EVERY MONTH</Big><Big size={64} color={COL.gold} glow="rgba(255,194,61,0.6)">— SINCE 2010 —</Big></Box>); }
  { const o = vis(t, SC.deposit[0] + 0.2, SC.deposit[1] - 0.1); if (o > 0) {
    const i = depIndex(t - SC.deposit[0]); const b = BUYS[i];
    els.push(<Box key="dep" top={110} o={o}><Big size={84}>{monthLabel(b.m)}</Big>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}><Pill>BTC PRICE <span style={{ color: COL.gold }}>{fmtPrice(b.p)}</span></Pill>
        <Pill>INVESTED <span style={{ color: COL.green }}>${(20 * (i + 1)).toLocaleString("en-US")}</span></Pill></div></Box>); } }
  const chartHud = (key: string, lt: number, c: typeof C1, o: number) => {
    const yr = chartYearAt(lt, c.y0, c.y1, c.dur), p = priceAt(yr), months = Math.min(197, Math.round((yr - 2010.5) * 12) + 1);
    return <Box key={key} top={100} o={o}><Big size={130}>{Math.floor(yr)}</Big>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center" }}><Pill>1 BTC = <span style={{ color: COL.gold }}>{fmtPrice(p)}</span></Pill>
        <Pill>INVESTED <span style={{ color: COL.green }}>${(20 * months).toLocaleString("en-US")}</span></Pill></div></Box>;
  };
  { const o = vis(t, SC.chart1[0] + 0.15, SC.chart1[1] - 0.05); if (o > 0) els.push(chartHud("c1", t - SC.chart1[0], C1, o)); }
  // ---------------------------------------------------------------- clip 2
  { const o = vis(t, SC.chart2[0] + 0.15, SC.chart2[1] - 0.05); if (o > 0) els.push(chartHud("c2", t - SC.chart2[0], C2, o)); }
  { const lt = t - SC.crash[0], o = vis(t, SC.crash[0] + 0.15, SC.crash[1] - 0.1);
    if (o > 0) { const second = lt > 3.2;
      els.push(<Box key="crash" top={120} o={o} s={pop(t, SC.crash[0] + (second ? 3.2 : 0.15))}>
        <Big size={104} color={COL.red} glow="rgba(255,53,80,0.7)">{second ? "2022" : "2018"} CRASH</Big>
        <Big size={150} color="#fff">-{second ? DROPS.DROP22 : DROPS.DROP18}%</Big></Box>);
      if (lt > 4.6) els.push(<Box key="still" top={940} o={vis(t, SC.crash[0] + 4.6, SC.crash[1] - 0.1)}><Pill bg="rgba(6,40,20,0.85)" color={COL.green}>STILL BUYING: +$20 ✓</Pill></Box>); } }
  { const o = vis(t, SC.rush[0] + 0.1, SC.rush[1] - 0.1); if (o > 0) els.push(<Box key="rush" top={170} o={o}><Pill>EVERY SINGLE MONTH</Pill></Box>); }
  // ---------------------------------------------------------------- clip 3
  { const o = vis(t, 41.6, 46.1); if (o > 0) {
    const n = Math.round(197 * easeOut(ramp(t, 41.7, 43.2))), usd = Math.round(3940 * easeOut(ramp(t, 43.0, 44.6)) / 20) * 20;
    els.push(<Box key="tot" top={120} o={o}><Big size={86}>{n} MONTHLY</Big><Big size={86}>INVESTMENTS</Big>
      {t > 42.9 && <div style={{ marginTop: 18, transform: `scale(${pop(t, 42.9)})` }}><Big size={62} color={COL.green}>TOTAL INVESTED: ${usd.toLocaleString("en-US")}</Big></div>}</Box>); } }
  { const o = vis(t, 46.3, 53.1); if (o > 0) {
    els.push(<Box key="btc" top={110} o={o} s={pop(t, 46.3)}><Pill>ACCUMULATED ≈ <span style={{ color: COL.gold }}>{Math.round(RANGE.low_btc).toLocaleString("en-US")}–{Math.round(RANGE.high_btc).toLocaleString("en-US")} BTC</span></Pill></Box>);
    if (t > 47.6) { const k = easeOut(ramp(t, 47.6, 49.4));
      els.push(<Box key="val" top={830} o={o} s={pop(t, 47.6)}><div style={{ fontFamily: I, fontWeight: 800, fontSize: 32, color: "#ffe7a8", letterSpacing: 3 }}>ESTIMATED VALUE*</div>
        <Big size={150} color={COL.gold} glow="rgba(255,194,61,0.85)">{M(RANGE.low_usd * k)}–{Math.round(RANGE.high_usd * k / 1e6)}</Big>
        <Big size={96} color={COL.gold} glow="rgba(255,194,61,0.6)">MILLION</Big></Box>); } } }
  { const o = vis(t, 53.4, 56.9); if (o > 0) {
    els.push(<div key="split" style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", opacity: o }}>
      <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontFamily: I, fontWeight: 800, fontSize: 26, color: "#bcd" }}>INVESTED</div><Big size={74}>$3,940</Big></div>
      <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontFamily: I, fontWeight: 800, fontSize: 26, color: "#ffe7a8" }}>EST. VALUE*</div><Big size={74} color={COL.gold} glow="rgba(255,194,61,0.6)">$92–116M</Big></div></div>);
    if (t > 54.6) els.push(<Box key="profit" top={1010} o={o} s={pop(t, 54.6)}><Big size={70} color={COL.green} glow="rgba(45,255,154,0.6)">PROFIT ≈ $92–116 MILLION*</Big></Box>); } }
  { const o = vis(t, 57.0, 61, 0.35); if (o > 0) {
    const line = (k: number, txt: React.ReactNode, size: number, color = "#fff", glow?: string) => (
      <div style={{ opacity: ramp(t, 57.0 + k * 0.22, 57.3 + k * 0.22), transform: `translateY(${(1 - easeOut(ramp(t, 57.0 + k * 0.22, 57.4 + k * 0.22))) * 30}px)` }}><Big size={size} color={color} glow={glow}>{txt}</Big></div>);
    els.push(<Box key="card" top={110} o={o}>
      {line(0, "$20 PER MONTH", 92)}{line(1, "2010–2026", 70, COL.cyan)}
      <div style={{ height: 470 }} />
      {line(2, "TOTAL INVESTED: $3,940", 54)}{line(3, "FINAL VALUE: $92M–$116M*", 54, COL.gold, "rgba(255,194,61,0.6)")}{line(4, "PROFIT: $92M–$116M*", 54, COL.green)}
    </Box>);
    els.push(<div key="note" style={{ position: "absolute", bottom: 26, left: 34, right: 34, opacity: o * ramp(t, 57.8, 58.2), fontFamily: I, fontSize: 15, lineHeight: 1.35, color: "rgba(220,228,255,0.85)", textAlign: "center" }}>
      *Estimate from historical daily BTC prices (CoinDesk/Yahoo via Habrador dataset; blockchain.info). 2010 prices are rounded to the cent and differ by source, giving a range. Valued at $68,766/BTC (Coinbase, Nov 13, 2026). No fees or taxes. Not financial advice; past returns are not guaranteed.</div>); } }

  // ---------------------------------------------------------------- transitions
  const flashes: [number, number, string][] = [[SC.deposit[0], 0.35, "#ffffff"], [SC.chart1[0], 0.3, "#ffffff"], [SC.wallet[0], 0.45, "#ffe6a0"],
    [SC.chart2[0], 0.35, "#ffffff"], [SC.crash[0], 0.4, "#ff2040"], [SC.rush[0], 0.3, "#bff4ff"], [SC.vault[0], 0.5, "#ffffff"], [47.6, 0.6, "#ffd36b"], [SC.finale[0], 0.35, "#ffffff"]];
  let flash = 0, fc = "#fff";
  for (const [at, len, c] of flashes) { const k = t >= at - 0.06 && t < at + len ? (t < at ? (t - at + 0.06) / 0.06 : 1 - (t - at) / len) : 0; if (k > flash) { flash = k; fc = c; } }
  const toBlack = smooth(ramp(t, 59.15, 59.97));
  const fadeIn = 1 - smooth(ramp(t, 0, 0.35));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      {els}
      {flash > 0 && <AbsoluteFill style={{ background: fc, opacity: 0.85 * flash, mixBlendMode: "screen" }} />}
      <AbsoluteFill style={{ background: "#000", opacity: Math.max(toBlack, fadeIn) }} />
    </AbsoluteFill>
  );
};
