// On-screen titles, the investing table, business tags, montage counters, captions (yellow keywords) and cut flashes.
import React from "react";
import { AbsoluteFill } from "remotion";
import { CHUNKS, COL, E, S, SCN, backOut, clamp, easeOut, lerp, ramp, smooth } from "./timeline";
import { CHART_AT, CLOCK_AT, CUSTOMERS_AT, DRIVEWAY_AT, MONTAGE_AT, PULLBACK_AT, RESEARCH_AT, SPLIT_AT, TEAM_AT, fv } from "./Scenes";

const F = "Anton, Impact, sans-serif", I = "Inter, Arial, sans-serif";
const shadow = "0 4px 0 rgba(0,0,0,0.55), 0 0 22px rgba(0,0,0,0.45)";
const vis = (t: number, a: number, b: number, fade = 0.22) => clamp(Math.min((t - a) / fade, (b - t) / fade));
const pop = (t: number, a: number) => backOut(ramp(t, a, a + 0.32));
const money = (v: number) => "$" + Math.round(v).toLocaleString("en-US");
const Top: React.FC<{ y?: number; o: number; s?: number; children: React.ReactNode }> = ({ y = 92, o, s = 1, children }) => (
  <div style={{ position: "absolute", top: y, left: 24, right: 24, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
    opacity: o, transform: `scale(${s})`, transformOrigin: "50% 0%" }}>{children}</div>
);
const Head: React.FC<{ size?: number; color?: string; glow?: string; children: React.ReactNode }> = ({ size = 72, color = "#fff", glow, children }) => (
  <div style={{ fontFamily: F, fontSize: size, lineHeight: 1.05, color, letterSpacing: 1, textShadow: glow ? `${shadow}, 0 0 30px ${glow}` : shadow }}>{children}</div>
);
/** "term = everyday meaning" card */
const Term: React.FC<{ term: string; children: React.ReactNode; o: number; color?: string }> = ({ term, children, o, color = COL.gold }) => (
  <div style={{ marginTop: 14, opacity: o, transform: `translateY(${(1 - o) * 14}px)`, background: "rgba(10,18,40,0.82)", borderRadius: 18, padding: "10px 20px",
    border: `3px solid ${color}`, fontFamily: I, fontWeight: 800, fontSize: 27, color: "#fff", lineHeight: 1.25, maxWidth: 640, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
    <span style={{ color }}>{term}</span> = {children}</div>
);
const Note: React.FC<{ o: number; children: React.ReactNode }> = ({ o, children }) => (
  <div style={{ marginTop: 10, opacity: o, fontFamily: I, fontWeight: 400, fontSize: 19, color: "rgba(255,255,255,0.92)", textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}>{children}</div>
);
const MoneyBag: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ verticalAlign: "middle", marginLeft: 10 }}>
    <path d="M22 10 L42 10 L37 19 L27 19 Z" fill="#c98a1b" />
    <path d="M27 19 C10 28 8 56 32 57 C56 56 54 28 37 19 Z" fill="#e8a923" stroke="#8a5a0a" strokeWidth="2" />
    <rect x="24" y="17" width="16" height="4" rx="2" fill="#8a5a0a" />
    <text x="32" y="48" textAnchor="middle" fontFamily="Anton" fontSize="24" fill="#fff5d6">$</text>
  </svg>
);

const Pill: React.FC<{ children: React.ReactNode; bg?: string; border?: string }> = ({ children, bg = "rgba(10,18,40,0.82)", border = COL.cyan }) => (
  <div style={{ fontFamily: I, fontWeight: 800, fontSize: 30, color: "#fff", background: bg, padding: "10px 22px", borderRadius: 16, border: `3px solid ${border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>{children}</div>
);
const Chip: React.FC<{ children: React.ReactNode; bg?: string; border?: string }> = ({ children, bg = "rgba(10,18,40,0.86)", border = COL.cyan }) => (
  <div style={{ display: "inline-block", fontFamily: I, fontWeight: 800, fontSize: 28, color: "#fff", background: bg, padding: "8px 18px", borderRadius: 14, border: `3px solid ${border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>{children}</div>
);
const Tag: React.FC<{ t: number; at: number; y: number; o: number; color: string; children: React.ReactNode }> = ({ t, at, y, o, color, children }) => (
  <div style={{ position: "absolute", top: y, left: 0, right: 0, textAlign: "center", opacity: o, transform: `scale(${pop(t, at)})` }}><Chip border={color}>{children}</Chip></div>
);
/** big bold captions, keywords in yellow (CAPS words, amounts and percentages) */
const isKey = (w: string) => /\$|\d|%/.test(w) || (w.replace(/[^A-Za-z]/g, "").length >= 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
const Caption: React.FC<{ t: number }> = ({ t }) => {
  const i = CHUNKS.findIndex((c, k) => t >= c.start - 0.05 && t < (CHUNKS[k + 1] && CHUNKS[k + 1].scene === c.scene ? CHUNKS[k + 1].start - 0.05 : Math.min(c.end + 0.12, SCN[c.scene - 1][1] - 0.04)));
  if (i < 0) return null;
  const c = CHUNKS[i];
  const words = c.text.split(" ");
  const dur = Math.max(0.3, c.end - c.start);
  return (
    <div style={{ position: "absolute", bottom: 300, left: 26, right: 26, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 12px",
      transform: `scale(${0.9 + 0.1 * easeOut(ramp(t, c.start - 0.05, c.start + 0.12))})` }}>
      {words.map((w, k) => {
        const at = c.start + dur * (k / words.length);
        const on = t >= at - 0.03;
        return <span key={k} style={{ fontFamily: I, fontWeight: 800, fontSize: 50, lineHeight: 1.15, color: isKey(w) ? "#FFE14D" : "#ffffff",
          WebkitTextStroke: "2px rgba(0,0,0,0.9)", textShadow: "0 4px 0 rgba(0,0,0,0.7), 0 0 18px rgba(0,0,0,0.6)", opacity: on ? 1 : 0.35,
          transform: `translateY(${on ? 0 : 6}px)` }}>{w}</span>;
      })}
    </div>
  );
};
export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const els: React.ReactNode[] = [];
  // ---- 1
  { const o = vis(t, 0.3, SCN[0][1] - 0.05); if (o > 0) els.push(<Top key="h1" y={100} o={o} s={pop(t, 0.3)}><Head size={78}>YOUR LIFE IN</Head><Head size={110} color={COL.gold} glow="rgba(255,200,61,0.6)">10 YEARS</Head></Top>); }
  { const o = vis(t, CLOCK_AT + 0.2, SPLIT_AT); if (o > 0) els.push(<div key="clk" style={{ position: "absolute", top: 560, left: 0, right: 0, textAlign: "center", opacity: o, transform: `scale(${pop(t, CLOCK_AT + 0.2)})` }}><Head size={86} color="#fde68a">+10 YEARS</Head></div>); }
  { const o = vis(t, SPLIT_AT + 0.15, SCN[0][1] - 0.05); if (o > 0) els.push(
    <div key="split" style={{ position: "absolute", top: 330, left: 0, right: 0, display: "flex", opacity: o }}>
      <div style={{ flex: 1, textAlign: "center" }}><Chip bg="rgba(30,41,59,0.9)" border="#94a3b8">STILL STRUGGLING</Chip></div>
      <div style={{ flex: 1, textAlign: "center" }}><Chip bg="rgba(22,101,52,0.9)" border={COL.green}>SAVINGS + A BUSINESS</Chip></div></div>); }
  // ---- 2
  { const o = vis(t, SCN[1][0] + 0.1, SCN[1][1] - 0.05); if (o > 0) els.push(<Top key="h2" o={o} s={pop(t, SCN[1][0] + 0.1)}><Head size={64}>START SMALL.</Head><Head size={64} color={COL.gold}>START LEARNING.</Head></Top>); }
  { const o = vis(t, S(3) + 1.3, RESEARCH_AT); if (o > 0) els.push(<Tag key="save" t={t} at={S(3) + 1.3} y={560} o={o} color={COL.green}>+$100 SAVED</Tag>); }
  { const o = vis(t, RESEARCH_AT + 0.2, DRIVEWAY_AT); if (o > 0) els.push(<Tag key="learn" t={t} at={RESEARCH_AT + 0.2} y={560} o={o} color={COL.cyan}>LEARNING THE BASICS</Tag>); }
  { const o = vis(t, DRIVEWAY_AT + 1.4, SCN[1][1] - 0.05); if (o > 0) els.push(<Tag key="sup" t={t} at={DRIVEWAY_AT + 1.4} y={560} o={o} color={COL.gold}>SUPPLIES UNDER $50</Tag>); }
  // ---- 3: the numbers ($100/month, 7%/yr, monthly compounding)
  { const o = vis(t, CHART_AT + 0.1, SCN[2][1] - 0.05); if (o > 0) {
    const yrs = smooth(ramp(t, CHART_AT + 0.2, S(5) + 1.0)) * 10;
    const rows: [number, string][] = [[1, "YEAR 1"], [5, "YEAR 5"], [10, "YEAR 10"]];
    els.push(<Top key="tbl" y={86} o={o}>
      <div style={{ background: "rgba(10,18,40,0.86)", borderRadius: 20, padding: "12px 20px", border: `3px solid ${COL.cyan}`, fontFamily: I, color: "#fff", minWidth: 520 }}>
        <div style={{ display: "flex", fontSize: 20, fontWeight: 800, color: "#94a3b8" }}><span style={{ flex: 1 }}></span><span style={{ width: 170, textAlign: "right" }}>PUT IN</span><span style={{ width: 190, textAlign: "right" }}>COULD BE*</span></div>
        {rows.map(([y, lbl]) => <div key={y} style={{ display: "flex", fontSize: 32, fontWeight: 800, opacity: ramp(yrs, y - 0.4, y), marginTop: 4 }}>
          <span style={{ flex: 1 }}>{lbl}</span><span style={{ width: 170, textAlign: "right", color: "#93c5fd" }}>{money(1200 * y)}</span><span style={{ width: 190, textAlign: "right", color: COL.green }}>{money(fv(12 * y))}</span></div>)}
      </div></Top>);
    if (t > S(5) + 1.2) els.push(<div key="big" style={{ position: "absolute", top: 400, left: 0, right: 0, textAlign: "center", opacity: o, transform: `scale(${pop(t, S(5) + 1.2)})` }}>
      <Head size={58}>$12,000 INVESTED</Head><Head size={80} color={COL.gold} glow="rgba(255,200,61,0.6)">→ ABOUT $17,300</Head></div>);
    els.push(<div key="disc" style={{ position: "absolute", bottom: 210, left: 30, right: 30, textAlign: "center", opacity: o, fontFamily: I, fontSize: 19, color: "rgba(255,255,255,0.92)", textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}>
      *Hypothetical 7% average annual return, compounded monthly. Not guaranteed. Before taxes and fees. Real returns go up and down.</div>); } }
  // ---- 4
  { const o = vis(t, SCN[3][0] + 0.1, SCN[3][1] - 0.05); if (o > 0) els.push(<Top key="h4" o={o} s={pop(t, SCN[3][0] + 0.1)}><Head size={58}>ONE CUSTOMER</Head><Head size={58} color={COL.gold}>→ MORE OPPORTUNITIES</Head></Top>); }
  { const at = S(7) + 1.5, o = vis(t, at, CUSTOMERS_AT); if (o > 0) els.push(<Tag key="50" t={t} at={at} y={540} o={o} color={COL.green}>FIRST CUSTOMER: +$50</Tag>); }
  { const o = vis(t, CUSTOMERS_AT + 0.2, TEAM_AT); if (o > 0) els.push(<div key="re" style={{ position: "absolute", top: 520, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12, opacity: o }}>
      {[["SAVE SOME", 0], ["REINVEST", 0.5], ["MORE CUSTOMERS", 1.0]].map(([x, d]) => <div key={x as string} style={{ transform: `scale(${pop(t, CUSTOMERS_AT + 0.2 + (d as number))})` }}><Chip>{x}</Chip></div>)}</div>); }
  { const o = vis(t, TEAM_AT + 0.2, SCN[3][1] - 0.05); if (o > 0) els.push(<div key="team" style={{ position: "absolute", top: 520, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", opacity: o }}>
      {[["BETTER ADS", 0], ["TRACK EXPENSES", 0.6], ["1ST EMPLOYEE", 1.3]].map(([x, d]) => <div key={x as string} style={{ transform: `scale(${pop(t, TEAM_AT + 0.2 + (d as number))})` }}><Chip border={COL.gold}>{x}</Chip></div>)}</div>); }
  // ---- 5
  { const o = vis(t, SCN[4][0] + 0.1, SCN[4][1] - 0.05); if (o > 0) els.push(<Top key="h5" o={o}><Head size={56}>10 YEARS OF</Head><Head size={66} color={COL.gold}>SMALL DECISIONS</Head></Top>); }
  { const o = vis(t, S(9) + 0.2, MONTAGE_AT); if (o > 0) els.push(<div key="bad" style={{ position: "absolute", top: 500, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 12, opacity: o }}>
      <div style={{ transform: `scale(${pop(t, S(9) + 0.2)})` }}><Chip bg="rgba(127,29,29,0.88)" border={COL.red}>RAINED OUT</Chip></div>
      <div style={{ transform: `scale(${pop(t, S(9) + 1.2)})` }}><Chip bg="rgba(127,29,29,0.88)" border={COL.red}>LOST A CUSTOMER</Chip></div></div>); }
  { const o = vis(t, MONTAGE_AT + 0.1, SCN[4][1] - 0.05); if (o > 0) {
    const u = ramp(t, MONTAGE_AT + 0.2, SCN[4][1] - 0.3), yr = 1 + Math.floor(u * 9.999), age = Math.floor(18 + u * 10);
    els.push(<div key="cnt" style={{ position: "absolute", top: 300, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14, opacity: o }}>
      <Chip>AGE {age}</Chip>{yr >= 4 && yr <= 5 ? <Chip bg="rgba(127,29,29,0.88)" border={COL.red}>MARKET DOWN, STILL +$100/MO</Chip> : <Chip border={COL.green}>+$100 EVERY MONTH</Chip>}</div>); } }
  // ---- 6
  { const o = vis(t, PULLBACK_AT + 0.2, 61); if (o > 0) els.push(<Top key="h6" y={92} o={o}>
      {["START SMALL.", "STAY CONSISTENT.", "THINK LONG-TERM."].map((x, k) => <div key={x} style={{ opacity: ramp(t, PULLBACK_AT + 0.2 + k * 0.7, PULLBACK_AT + 0.5 + k * 0.7), transform: `translateY(${(1 - easeOut(ramp(t, PULLBACK_AT + 0.2 + k * 0.7, PULLBACK_AT + 0.6 + k * 0.7))) * 24}px)` }}>
        <Head size={58} color={k === 2 ? COL.gold : "#fff"}>{x}</Head></div>)}</Top>); }
  { const o = vis(t, 56.6, 61); if (o > 0) els.push(<div key="start" style={{ position: "absolute", top: 470, left: 0, right: 0, textAlign: "center", opacity: o, transform: `scale(${pop(t, 56.6)})` }}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,#ef4444,#b91c1c)", border: "5px solid #fff", borderRadius: 26, padding: "10px 34px", boxShadow: "0 14px 40px rgba(0,0,0,0.45)" }}>
        <Head size={104}>START TODAY</Head></div></div>); }

  const cuts = [CLOCK_AT, SPLIT_AT, SCN[1][0], RESEARCH_AT, DRIVEWAY_AT, SCN[2][0], CHART_AT, SCN[3][0], CUSTOMERS_AT, TEAM_AT, SCN[4][0], MONTAGE_AT, SCN[5][0]];
  let flash = 0;
  for (const c of cuts) if (t >= c && t < c + 0.2) flash = Math.max(flash, 1 - (t - c) / 0.2);
  const fadeIn = 1 - smooth(ramp(t, 0, 0.3));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.38) 100%)" }} />
      {els}
      <Caption t={t} />
      {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: 0.55 * flash }} />}
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
    </AbsoluteFill>
  );
};
