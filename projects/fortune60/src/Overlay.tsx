// On-screen titles, sourced stat cards, captions (yellow keywords), sepia for 1886, cut flashes and the final card for "Elon Musk: how much does his fortune grow every second?".
import React from "react";
import { AbsoluteFill } from "remotion";
import { CHUNKS, COL, SCN, backOut, clamp, easeIn, easeOut, lerp, ramp, smooth } from "./timeline";
void easeIn; void lerp;
import { C2_WORKER, C3_ROOF, C4_ORBIT, C5_COMMAND, C6_TWIST } from "./Scenes";
import T from "../narration/timing.json";
const FINAL_AT = (T.chunks as { start: number; text: string }[]).find((c) => c.text.includes("NOT a paycheck"))!.start;

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
    <div style={{ position: "absolute", bottom: 250, left: 26, right: 26, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 12px",
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
const Src: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginTop: 6, fontFamily: I, fontWeight: 400, fontSize: 17, color: "rgba(255,255,255,0.85)", textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}>{children}</div>
);
/** the big per-period counter: climbs from 0 to the value, then holds */
const Counter: React.FC<{ t: number; a: number; b: number; end: number; label: string; fmt?: (v: number) => string; climb?: number }> = ({ t, a, b, end, label, fmt = money, climb = 2.2 }) => {
  const o = vis(t, a, b);
  if (o <= 0) return null;
  const u = easeOut(ramp(t, a + 0.1, a + climb));
  return <Top y={110} o={o} s={pop(t, a)}>
    <Head size={102} color={COL.gold} glow="rgba(255,200,61,0.7)">{fmt(end * u)}</Head>
    <div style={{ marginTop: 4 }}><Head size={54}>{label}</Head></div>
    <div style={{ marginTop: 8 }}><Chip border={COL.gold}>Estimated average net-worth growth · not cash income</Chip></div>
  </Top>;
};
const bil = (v: number) => "$" + (v / 1e9).toFixed(2).replace(/\.?0+$/, "") + " BILLION";
export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const els: React.ReactNode[] = [];
  // ---- 1: every second (the counter ticks once a second)
  { const o = vis(t, 0.15, 9.9); if (o > 0) { const sec = Math.floor(t), tick = Math.max(0, 1 - (t - sec) / 0.15);
    els.push(<Top key="s" y={110} o={o} s={pop(t, 0.15) * (1 + 0.05 * tick)}><Head size={112} color={COL.gold} glow="rgba(255,200,61,0.7)">$14,396</Head><Head size={60}>EVERY SECOND</Head>
      <div style={{ marginTop: 8 }}><Chip border={COL.gold}>Estimated average net-worth growth · not cash income</Chip></div></Top>); } }
  // ---- 2..5: the climbing counters
  els.push(<Counter key="m" t={t} a={10.1} b={C2_WORKER - 0.05} end={863775} label="PER MINUTE" />);
  { const o = vis(t, C2_WORKER + 0.05, 19.95); if (o > 0) els.push(<Top key="w" y={110} o={o} s={pop(t, C2_WORKER + 0.05)}><Head size={56}>A TYPICAL FULL-TIME WORKER</Head><Head size={92} color={COL.green}>≈ $640,000</Head><Head size={44}>IN TEN YEARS</Head>
      <Src>Median weekly earnings $1,232 × 52 × 10 (BLS, Q3 2026), before tax, not inflation-adjusted</Src></Top>); }
  els.push(<Counter key="h" t={t} a={20.1} b={29.95} end={51800000} label="PER HOUR" climb={3.0} />);
  els.push(<Counter key="d" t={t} a={30.1} b={39.95} end={1.24e9} label="PER DAY" fmt={bil} climb={6.0} />);
  els.push(<Counter key="mo" t={t} a={40.1} b={49.95} end={37.8e9} label="PER MONTH" fmt={bil} climb={3.4} />);
  // ---- 6: the year, the twist
  { const o = vis(t, 50.1, C6_TWIST); if (o > 0) { const u = easeOut(ramp(t, 50.2, 53.8));
    els.push(<Top key="y" y={110} o={o} s={pop(t, 50.1)}><Head size={86} color={COL.gold} glow="rgba(255,200,61,0.8)">{money(454e9 * u)}</Head><Head size={54}>IN ONE YEAR</Head>
      <div style={{ marginTop: 8 }}><Chip border={COL.gold}>Estimated net-worth increase · year over year</Chip></div></Top>); } }
  { const o = vis(t, C6_TWIST + 0.9, FINAL_AT - 0.05); if (o > 0) els.push(<Top key="dn" y={110} o={o} s={pop(t, C6_TWIST + 0.9)}><Head size={80} color={COL.red} glow="rgba(255,64,87,0.7)">−$7.24 BILLION</Head><Head size={44}>IN A SINGLE DAY</Head>
      <Src>Net worth can fall too: his change on Nov 13, 2026 (Bloomberg Billionaires Index)</Src></Top>); }
  { const o = vis(t, FINAL_AT, 61, 0.3); if (o > 0) els.push(<div key="fin" style={{ position: "absolute", top: 120, left: 30, right: 30, textAlign: "center", opacity: o, transform: `scale(${pop(t, FINAL_AT)})` }}>
      <div style={{ display: "inline-block", background: "rgba(127,29,29,0.92)", border: "5px solid #fff", borderRadius: 20, padding: "8px 26px" }}><Head size={74}>NET WORTH</Head><Head size={74} color="#fde68a">IS NOT CASH</Head></div></div>); }
  { const at = FINAL_AT + 2.2, o = vis(t, at, 61, 0.3); if (o > 0) els.push(<div key="cta" style={{ position: "absolute", top: 400, left: 30, right: 30, textAlign: "center", opacity: o, transform: `scale(${pop(t, at)})` }}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,#f59e0b,#b45309)", border: "4px solid #fff", borderRadius: 20, padding: "8px 20px" }}><Head size={40}>FOLLOW FOR MORE</Head><Head size={48} color="#fff7d6">MIND-BLOWING MONEY FACTS</Head></div></div>); }
  // ---- source line on every clip
  els.push(<div key="src" style={{ position: "absolute", bottom: 46, left: 20, right: 20, textAlign: "center", fontFamily: I, fontWeight: 400, fontSize: 17, lineHeight: 1.3, color: "rgba(255,255,255,0.88)", textShadow: "0 2px 6px rgba(0,0,0,0.95)" }}>
    Estimated averages from a +$454B year-over-year change in net worth · Bloomberg Billionaires Index, as of Nov 13, 2026 · Not salary or cash</div>);

  // flashes at each clip start and at the beats inside a clip; each clip opens cleanly (no black frames) so clips can be used alone
  const cuts = [10, 20, 30, 40, 50, C2_WORKER, C3_ROOF, C4_ORBIT, C5_COMMAND];
  let flash = 0;
  for (const c of cuts) if (t >= c && t < c + 0.2) flash = Math.max(flash, 1 - (t - c) / 0.2);
  const freeze = t >= C6_TWIST && t < C6_TWIST + 0.25 ? 1 - (t - C6_TWIST) / 0.25 : 0;
  const black = smooth(ramp(t, 59.5, 60));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.5) 100%)" }} />
      {freeze > 0 && <AbsoluteFill style={{ background: "#bfe9ff", mixBlendMode: "color", opacity: 0.7 * freeze }} />}
      {els}
      <Caption t={t} />
      {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: 0.45 * flash }} />}
      {black > 0 && <AbsoluteFill style={{ background: "#000", opacity: black }} />}
    </AbsoluteFill>
  );
};
