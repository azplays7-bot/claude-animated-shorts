// On-screen titles, sourced stat cards, captions (yellow keywords), sepia for 1886, cut flashes and the final card for "The 9-5 Trap".
import React from "react";
import { AbsoluteFill } from "remotion";
import { CHUNKS, COL, SCN, backOut, clamp, easeIn, easeOut, lerp, ramp, smooth } from "./timeline";
import { C1_BUS, C1_DESK, C1_FACE, C1_PAY, C2_CLOCK, C3_RENT, C4_BORROW, C5_GROW, C6_EXIT, FINAL_AT } from "./Scenes";

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
  if (i < 0 || t >= FINAL_AT - 0.1) return null;
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
/** small source line under a stat */
const Src: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ marginTop: 6, fontFamily: I, fontWeight: 400, fontSize: 17, color: "rgba(255,255,255,0.85)", textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}>{children}</div>
);
const Stat: React.FC<{ t: number; a: number; b: number; y?: number; big: string; color?: string; line: React.ReactNode; src: string }> = ({ t, a, b, y = 120, big, color = COL.gold, line, src }) => {
  const o = vis(t, a, b);
  if (o <= 0) return null;
  return <Top y={y} o={o} s={pop(t, a)}><Head size={104} color={color} glow={color === COL.red ? "rgba(255,64,87,0.6)" : "rgba(255,200,61,0.55)"}>{big}</Head>
    <div style={{ marginTop: 6 }}><Chip border={color}>{line}</Chip></div><Src>{src}</Src></Top>;
};
export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const els: React.ReactNode[] = [];
  // ---- 1: payday drains, then the question
  { const o = vis(t, C1_PAY, C1_FACE + 0.1); if (o > 0) {
    const u = easeIn(ramp(t, C1_PAY + 0.5, C1_FACE - 0.3)), v = Math.round(lerp(1232, 41, u));
    els.push(<Top key="pay" y={150} o={o} s={pop(t, C1_PAY)}><div style={{ fontFamily: I, fontWeight: 800, fontSize: 26, color: "#bbf7d0", letterSpacing: 2 }}>PAYDAY · WEEKLY</div>
      <Head size={124} color={u > 0.7 ? COL.red : COL.green} glow={u > 0.7 ? "rgba(255,64,87,0.6)" : "rgba(43,217,107,0.6)"}>${v.toLocaleString("en-US")}</Head>
      <Chip>rent · bills · card · car</Chip><Src>$1,232 = U.S. median full-time weekly pay, Q3 2026 (BLS). Drain is illustrative.</Src></Top>); } }
  { const o = vis(t, C1_FACE + 0.1, SCN[0][1] + 0.2); if (o > 0) els.push(<Top key="q" y={130} o={o} s={pop(t, C1_FACE + 0.1)}><Head size={70}>IS THE 9–5</Head><Head size={120} color={COL.gold} glow="rgba(255,200,61,0.7)">A TRAP?</Head></Top>); }
  // ---- 2: history
  { const o = vis(t, SCN[1][0] + 0.2, C2_CLOCK - 0.1); if (o > 0) els.push(<Top key="1886" y={120} o={o} s={pop(t, SCN[1][0] + 0.2)}><Head size={92} color="#f3e2b8">MAY 1, 1886</Head><Chip border="#d6b98a">Nationwide strike for the 8-hour day</Chip><Src>PBS · TIME · labor history records</Src></Top>); }
  { const o = vis(t, C2_CLOCK + 0.2, SCN[1][1]); if (o > 0) els.push(<Top key="1940" y={120} o={o} s={pop(t, C2_CLOCK + 0.2)}><Head size={96} color={COL.gold}>40-HOUR WEEK</Head><Chip>Fair Labor Standards Act (1938) · 40 hours from Oct 1940</Chip><Src>U.S. Department of Labor</Src></Top>); }
  // ---- 3: pay vs rent
  els.push(<Stat key="8" t={t} a={SCN[2][0] + 0.3} b={C3_RENT - 0.05} big="+8%" line="typical weekly pay after inflation, 1979 → 2014" src="BLS Spotlight on Statistics (2015)" />);
  els.push(<Stat key="49" t={t} a={C3_RENT + 0.1} b={SCN[2][1]} big="49%" color={COL.red} line="of renter households pay 30%+ of income on housing (2024)" src="Harvard JCHS, State of the Nation's Housing 2026" />);
  // ---- 4: borrowing
  els.push(<Stat key="37" t={t} a={SCN[3][0] + 0.3} b={C4_BORROW - 0.05} big="37%" color={COL.red} line="of adults wouldn't cover a $400 expense with cash" src="Federal Reserve SHED, survey Oct 2025 (pub. May 2026)" />);
  { const o = vis(t, C4_BORROW + 0.2, SCN[3][1]); if (o > 0) els.push(<Top key="debt" y={120} o={o} s={pop(t, C4_BORROW + 0.2)}>
      <Head size={64} color={COL.red} glow="rgba(255,64,87,0.6)">≈21% CARD INTEREST</Head><Head size={52}>NEW-CAR PAYMENT ≈ $765/MO</Head>
      <Src>Fed G.19, Q1–Q2 2026 · Experian, Q2 2026 · U.S. card debt: record $1.29T (NY Fed, Q3 2026)</Src></Top>); }
  // ---- 5: the way out
  { const o = vis(t, SCN[4][0] + 0.3, C5_GROW); if (o > 0) els.push(<Top key="ef" y={130} o={o} s={pop(t, SCN[4][0] + 0.3)}><Head size={70}>STEP 1</Head><Head size={88} color={COL.gold}>EMERGENCY FUND</Head><Head size={56}>STEP 2 · INVEST</Head></Top>); }
  { const o = vis(t, C5_GROW + 0.1, SCN[4][1]); if (o > 0) {
    const u = ramp(t, C5_GROW + 0.3, SCN[4][1] - 0.5), yrs = Math.round(30 * u);
    const r = 0.07 / 12, fv = yrs ? 200 * ((Math.pow(1 + r, yrs * 12) - 1) / r) : 0;
    els.push(<Top key="cg" y={120} o={o}><div style={{ fontFamily: I, fontWeight: 800, fontSize: 26, color: "#fde68a", letterSpacing: 2 }}>$200/MONTH · 7% AVG · YEAR {yrs}</div>
      <Head size={112} color={COL.gold} glow="rgba(255,200,61,0.6)">{"$" + Math.round(fv).toLocaleString("en-US")}*</Head>
      <Chip>you put in ${(200 * 12 * yrs).toLocaleString("en-US")}</Chip><Src>*Hypothetical, not guaranteed. Returns vary. Method: SEC Investor.gov compound interest.</Src></Top>); } }
  // ---- 6: balance + final card
  { const o = vis(t, SCN[5][0] + 0.2, C6_EXIT + 0.4); if (o > 0) els.push(<Top key="72" y={120} o={o} s={pop(t, SCN[5][0] + 0.2)}><Head size={104} color={COL.green} glow="rgba(43,217,107,0.6)">72%</Head><Chip border={COL.green}>of private-sector workers can get a retirement plan</Chip><Src>BLS National Compensation Survey, March 2026 · 401(k) split shown is an example</Src></Top>); }
  { const o = vis(t, FINAL_AT - 0.1, 61, 0.35); if (o > 0) els.push(<div key="fin" style={{ position: "absolute", top: 330, left: 40, right: 40, textAlign: "center", opacity: o, transform: `scale(${0.94 + 0.06 * easeOut(ramp(t, FINAL_AT - 0.1, FINAL_AT + 0.6))})` }}>
      <Head size={60}>THE 9–5 ISN'T NECESSARILY THE TRAP.</Head>
      <div style={{ height: 22 }} />
      <Head size={52}>IT'S WORKING YOUR ENTIRE LIFE</Head><Head size={64} color={COL.gold} glow="rgba(255,200,61,0.7)">WITHOUT BUILDING FINANCIAL FREEDOM.</Head></div>); }

  const cuts = [C1_BUS, C1_DESK, C1_PAY, C1_FACE, C2_CLOCK, C3_RENT, C5_GROW, C6_EXIT];
  let flash = 0;
  for (const c of cuts) if (t >= c && t < c + 0.15) flash = Math.max(flash, 1 - (t - c) / 0.15);
  let black = 1 - smooth(ramp(t, 0, 0.3));
  for (const b of [SCN[1][0], SCN[2][0], SCN[3][0], SCN[4][0], SCN[5][0]]) { const d = Math.abs(t - b); if (d < 0.16) black = Math.max(black, 1 - d / 0.16); }
  black = Math.max(black, smooth(ramp(t, 59.55, 60)));
  const sepia = t >= SCN[1][0] && t < SCN[1][1] ? (t < C2_CLOCK ? 0.85 : 0.85 * (1 - ramp(t, C2_CLOCK, SCN[1][1]))) : 0;
  const finalDim = vis(t, FINAL_AT - 0.1, 61, 0.35) * 0.45;
  return (
    <AbsoluteFill>
      {sepia > 0 && <AbsoluteFill style={{ background: "#a5784a", mixBlendMode: "color", opacity: sepia }} />}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.42) 100%)" }} />
      {finalDim > 0 && <AbsoluteFill style={{ background: "#000", opacity: finalDim }} />}
      {els}
      <Caption t={t} />
      {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: 0.4 * flash }} />}
      {black > 0 && <AbsoluteFill style={{ background: "#000", opacity: black }} />}
    </AbsoluteFill>
  );
};
