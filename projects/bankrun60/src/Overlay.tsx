// On-screen text, live graphics, term explanations, synced subtitles and cut flashes for the bank-run video.
import React from "react";
import { AbsoluteFill } from "remotion";
import { CHUNKS, COL, E, S, SCN, backOut, clamp, easeOut, lerp, ramp, smooth } from "./timeline";
import { DOMINO_AT, MAP_AT, SALE_AT, VAULT2_AT } from "./Scenes";

const F = "Anton, Impact, sans-serif", I = "Inter, Arial, sans-serif";
const shadow = "0 4px 0 rgba(0,0,0,0.55), 0 0 22px rgba(0,0,0,0.45)";
const vis = (t: number, a: number, b: number, fade = 0.22) => clamp(Math.min((t - a) / fade, (b - t) / fade));
const pop = (t: number, a: number) => backOut(ramp(t, a, a + 0.32));
const chunkAt = (needle: string) => CHUNKS.find((c) => c.text.includes(needle))!.start;

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
const money = (v: number) => "$" + v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
/** subtitle line, numbers highlighted */
const Caption: React.FC<{ t: number }> = ({ t }) => {
  const i = CHUNKS.findIndex((c, k) => t >= c.start - 0.05 && t < (CHUNKS[k + 1] && CHUNKS[k + 1].scene === c.scene ? CHUNKS[k + 1].start - 0.05 : Math.min(c.end + 0.12, SCN[c.scene - 1][1] - 0.04)));
  if (i < 0) return null;
  const c = CHUNKS[i];
  const parts = c.text.split(/(\$[\d,]+|\d+%)/g);
  return (
    <div style={{ position: "absolute", bottom: 128, left: 30, right: 30, display: "flex", justifyContent: "center" }}>
      <div style={{ background: "rgba(0,0,0,0.62)", borderRadius: 16, padding: "10px 22px", fontFamily: I, fontWeight: 800, fontSize: 38, lineHeight: 1.2,
        color: "#fff", textAlign: "center", transform: `scale(${0.92 + 0.08 * easeOut(ramp(t, c.start - 0.05, c.start + 0.12))})` }}>
        {parts.map((p, k) => /^(\$[\d,]+|\d+%)$/.test(p) ? <span key={k} style={{ color: COL.gold }}>{p}</span> : <span key={k}>{p}</span>)}
      </div>
    </div>
  );
};

export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const els: React.ReactNode[] = [];
  // ---- 1. the big question
  { const o = vis(t, 0.15, 3.4); if (o > 0) els.push(<Top key="title" y={120} o={o} s={pop(t, 0.15)}><Head size={70}>WHAT IF EVERYONE</Head><Head size={70}>WITHDREW THEIR MONEY</Head><Head size={86} color={COL.gold} glow="rgba(255,200,61,0.6)">FROM THE BANK?</Head></Top>); }
  { const o = vis(t, 3.4, SCN[0][1] - 0.05); if (o > 0) {
    const n = Math.round(lerp(4, 230, Math.pow(ramp(t, 1.2, 8.6), 1.3)));
    els.push(<Top key="line" o={o}><Pill bg="rgba(127,29,29,0.85)" border={COL.red}>PEOPLE IN LINE: <span style={{ color: "#fde68a" }}>{n.toLocaleString("en-US")}</span></Pill></Top>); } }
  // ---- 2. where does your money go?
  { const o = vis(t, S(2) - 0.05, S(3) + 0.3); if (o > 0) els.push(<Top key="secret" y={140} o={o} s={pop(t, S(2) - 0.05)}><Head size={96} color={COL.gold} glow="rgba(255,200,61,0.6)">HERE'S THE SECRET</Head></Top>); }
  { const o = vis(t, S(3) + 0.3, SCN[1][1] - 0.05); if (o > 0) {
    const split = smooth(ramp(t, S(3) + 1.0, S(3) + 2.4));
    els.push(<Top key="split" o={o}>
      <Head size={58}>WHERE YOUR <span style={{ color: COL.gold }}>$1,000</span> GOES</Head>
      <div style={{ width: 600, marginTop: 14, display: "flex", height: 70, borderRadius: 16, overflow: "hidden", border: "3px solid #fff", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>
        <div style={{ width: `${lerp(100, 27, split)}%`, background: "#0e7490", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, fontSize: 24, color: "#fff", whiteSpace: "nowrap" }}>{split > 0.5 ? "KEPT READY" : "YOUR DEPOSIT"}</div>
        <div style={{ flex: 1, background: COL.green, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, fontSize: 30, color: "#05301a", opacity: split }}>LENT OUT AS LOANS</div>
      </div>
      <Note o={split}>Illustration only. How much each bank keeps ready varies.</Note>
      {t > MAP_AT && <Term term="LOAN" o={vis(t, MAP_AT + 0.2, SCN[1][1] - 0.05)} color={COL.green}>money the bank lends out, paid back over time</Term>}
    </Top>); } }
  // ---- 3. the problem begins
  { const o = vis(t, S(5) - 0.1, SCN[2][1] - 0.05); if (o > 0) {
    const cash = t < VAULT2_AT ? 0.7 : lerp(0.65, 0.08, ramp(t, VAULT2_AT, 27.2));
    const low = cash < 0.3;
    els.push(<Top key="gauge" o={o}>
      <Head size={52}>EVERYONE WANTS THEIR MONEY BACK</Head>
      <div style={{ marginTop: 14, width: 560, background: "rgba(10,18,40,0.82)", borderRadius: 18, padding: "12px 18px", border: `3px solid ${low ? COL.red : COL.cyan}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: I, fontWeight: 800, fontSize: 24, color: "#fff" }}><span>CASH READY IN THE VAULT</span><span style={{ color: low ? "#fca5a5" : "#a5f3fc" }}>{Math.round(cash * 100)}%</span></div>
        <div style={{ marginTop: 8, height: 26, borderRadius: 13, background: "#1f2937", overflow: "hidden" }}>
          <div style={{ width: `${cash * 100}%`, height: "100%", background: low ? COL.red : COL.green, transition: "none" }} /></div>
      </div></Top>); } }
  { const o = vis(t, 25.8, SALE_AT - 0.05, 0.15); if (o > 0) {
    const blinkOn = 0.75 + 0.25 * Math.sin(t * 14);
    els.push(<div key="run" style={{ position: "absolute", top: 470, left: 0, right: 0, textAlign: "center", opacity: o, transform: `scale(${pop(t, 25.8)}) rotate(-4deg)` }}>
      <div style={{ display: "inline-block", background: `rgba(220,38,38,${0.9 * blinkOn})`, border: "8px solid #fff", borderRadius: 26, padding: "8px 34px 14px", boxShadow: "0 0 60px rgba(255,40,60,0.8)" }}>
        <div style={{ fontFamily: F, fontSize: 44, color: "#fde68a" }}>⚠ WARNING ⚠</div>
        <Head size={150}>BANK RUN!</Head></div></div>); } }
  // ---- 4. domino effect
  { const o = vis(t, SCN[3][0] + 0.1, SALE_AT - 0.05); if (o > 0) els.push(<Top key="brterm" y={110} o={o}><Term term="BANK RUN" o={o} color={COL.red}>lots of customers pulling out money at once because they're worried</Term></Top>); }
  { const o = vis(t, SALE_AT + 0.05, DOMINO_AT - 0.05); if (o > 0) {
    const lose = chunkAt("it could lose money");
    els.push(<Top key="sale" o={o}><Head size={54}>SELLING IN A HURRY</Head>
      <div style={{ marginTop: 16, display: "flex", gap: 16, alignItems: "center", justifyContent: "center" }}>
        <Pill>WORTH <span style={{ color: COL.green }}>$100</span></Pill>
        <div style={{ fontFamily: F, fontSize: 52, color: "#fff", opacity: ramp(t, S(8) + 1.4, S(8) + 1.8) }}>→</div>
        <div style={{ opacity: ramp(t, S(8) + 1.6, S(8) + 2.0) }}><Pill bg="rgba(127,29,29,0.88)" border={COL.red}>SOLD FOR <span style={{ color: "#fca5a5" }}>$80</span></Pill></div>
      </div>
      {t > lose && <div style={{ marginTop: 8, transform: `scale(${pop(t, lose)})` }}><Head size={84} color={COL.red} glow="rgba(255,64,87,0.6)">LOSS: −$20</Head></div>}
      <Note o={o}>Example numbers</Note></Top>); } }
  { const o = vis(t, DOMINO_AT + 0.05, SCN[3][1] - 0.05); if (o > 0) els.push(<Top key="dom" y={140} o={o} s={pop(t, DOMINO_AT + 0.05)}><Head size={86} color={COL.red} glow="rgba(255,64,87,0.6)">PANIC CAN SPREAD!</Head></Top>); }
  // ---- 5. how banks protect your money
  { const o = vis(t, S(10) - 0.05, S(11) + 0.4); if (o > 0) els.push(<Top key="good" y={130} o={o} s={pop(t, S(10) - 0.05)}><Head size={100} color={COL.green} glow="rgba(43,217,107,0.6)">GOOD NEWS!</Head></Top>); }
  { const o = vis(t, S(11) + 0.4, SCN[4][1] - 0.05); if (o > 0) {
    const b1 = chunkAt("$250,000 per depositor"), b2 = chunkAt("per insured bank");
    const per = [["PER DEPOSITOR", b1 + 1.2], ["PER INSURED BANK", b2 + 0.1], ["PER OWNERSHIP CATEGORY", b2 + 1.0]] as const;
    els.push(<Top key="fdic" y={84} o={o}>
      <div style={{ transform: `scale(${pop(t, S(11) + 0.4)})`, background: "linear-gradient(180deg,#1d4ed8,#1e3a8a)", border: "5px solid #fff", borderRadius: 24, padding: "12px 26px", boxShadow: "0 12px 40px rgba(0,0,0,0.35)" }}>
        <Head size={56}>FDIC INSURANCE</Head>
        <Head size={64} color="#fde68a">— UP TO $250,000 —</Head></div>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {per.map(([txt, at]) => <div key={txt} style={{ opacity: ramp(t, at, at + 0.25), transform: `translateX(${(1 - easeOut(ramp(t, at, at + 0.3))) * -40}px)` }}><Pill>✓ {txt}</Pill></div>)}
      </div>
      <Term term="FDIC" o={vis(t, S(11) + 1.5, SCN[4][1] - 0.05)} color="#60a5fa">a U.S. government agency that insures bank deposits</Term>
    </Top>); } }
  // ---- 6. the big reveal
  { const o = vis(t, S(12) - 0.05, E(12) + 0.15); if (o > 0) {
    const k = ramp(t, S(12) + 0.5, S(12) + 1.4);
    els.push(<Top key="most" o={o}><Head size={50}>ON A NORMAL DAY…</Head>
      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(10, 46px)", gap: 8, background: "rgba(10,18,40,0.8)", padding: 14, borderRadius: 18 }}>
        {Array.from({ length: 20 }, (_, i) => { const w = i === 4 || i === 13; return (
          <svg key={i} width="46" height="56" viewBox="0 0 46 56"><circle cx="23" cy="13" r="10" fill={w && k > 0.5 ? COL.gold : "#e2e8f0"} /><rect x="9" y="26" width="28" height="28" rx="12" fill={w && k > 0.5 ? COL.gold : "#94a3b8"} /></svg>); })}
      </div>
      <Note o={k}>…only a few people withdraw. Most leave their money in.</Note></Top>); } }
  { const o = vis(t, S(13) - 0.05, E(13) + 0.1); if (o > 0) {
    const items = [["CASH KEPT READY", 0.0], ["CAREFUL PLANNING", 1.0], ["DEPOSIT INSURANCE (FDIC)", 2.0]] as const;
    els.push(<Top key="safety" o={o}><Head size={60}>SAFETY SYSTEMS</Head>
      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {items.map(([txt, d]) => <div key={txt} style={{ opacity: ramp(t, S(13) + 0.3 + d, S(13) + 0.6 + d), transform: `scale(${pop(t, S(13) + 0.3 + d)})` }}><Pill border={COL.green}><span style={{ color: COL.green }}>✓</span> {txt}</Pill></div>)}
      </div></Top>); } }
  { const o = vis(t, S(14) - 0.05, 61); if (o > 0) els.push(<Top key="q" y={110} o={o} s={pop(t, S(14) - 0.05)}><Head size={58}>WOULD YOU KEEP YOUR</Head><Head size={58} color={COL.gold}>MONEY IN A BANK?</Head></Top>); }
  { const o = vis(t, 58.3, 61); if (o > 0) els.push(
    <div key="cta" style={{ position: "absolute", top: 640, left: 30, right: 30, textAlign: "center", opacity: o, transform: `scale(${pop(t, 58.3)}) rotate(-2deg)` }}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,#f97316,#c2410c)", borderRadius: 26, padding: "16px 28px", boxShadow: "0 14px 40px rgba(0,0,0,0.4)", border: "5px solid #fff" }}>
        <Head size={62}>FOLLOW FOR MORE</Head><Head size={74} color="#fde68a">CRAZY FACTS!</Head></div></div>); }

  // ---- cut flashes
  const cuts = [SCN[1][0], SCN[2][0], SCN[3][0], SCN[4][0], SCN[5][0], MAP_AT, VAULT2_AT, SALE_AT, DOMINO_AT];
  let flash = 0;
  for (const c of cuts) if (t >= c && t < c + 0.22) flash = Math.max(flash, 1 - (t - c) / 0.22);
  const shakeRed = vis(t, 25.8, 28.0) * (0.5 + 0.5 * Math.sin(t * 14));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.3) 100%)" }} />
      {shakeRed > 0 && <AbsoluteFill style={{ boxShadow: `inset 0 0 160px rgba(255,30,50,${0.7 * shakeRed})` }} />}
      {els}
      <Caption t={t} />
      {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: 0.65 * flash }} />}
    </AbsoluteFill>
  );
};
