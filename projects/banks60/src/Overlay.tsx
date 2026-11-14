// On-screen text, term explanations, the interest math, the phone screen, synced subtitles and cut flashes.
import React from "react";
import { AbsoluteFill } from "remotion";
import { CHUNKS, COL, E, PARTS, S, SCN, backOut, clamp, easeOut, ramp } from "./timeline";
import { FUND_AT, SPLIT_AT, TEEN_END } from "./Scenes";

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

/** subtitle line, numbers highlighted */
const Caption: React.FC<{ t: number }> = ({ t }) => {
  const i = CHUNKS.findIndex((c, k) => t >= c.start - 0.05 && t < (CHUNKS[k + 1] && CHUNKS[k + 1].scene === c.scene ? CHUNKS[k + 1].start - 0.05 : c.end + 0.25));
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
  // ---- 1. hook
  { const o = vis(t, 2.9, SCN[0][1] - 0.05); if (o > 0) els.push(<Top key="h1" o={o} s={pop(t, 2.9)}><Head size={78}>WHAT HAPPENS TO</Head><Head size={96} color={COL.gold} glow="rgba(255,200,61,0.6)">YOUR $1,000?</Head></Top>); }
  // ---- 2. deposits -> loans
  { const o = vis(t, S(3) - 0.1, SCN[1][1] - 0.05); if (o > 0) els.push(
    <Top key="h2" o={o} s={pop(t, S(3) - 0.1)}><Head size={74}>BANK DEPOSITS <span style={{ color: COL.green }}>→</span> LOANS</Head>
      <Term term="DEPOSIT" o={vis(t, S(3) + 0.1, S(4) - 0.05)} color={COL.cyan}>money you put into the bank</Term>
      {t > S(4) - 0.05 && <Term term="LOAN" o={vis(t, S(4), SCN[1][1] - 0.05)} color={COL.green}>money you borrow now and pay back later</Term>}
    </Top>); }
  // ---- 3. interest
  { const o = vis(t, S(5) - 0.1, SCN[2][1] - 0.05); if (o > 0) {
    const a = chunkAt("If you borrow"), b = chunkAt("at 8%"), c = chunkAt("that's $80");
    els.push(<Top key="h3" o={o} s={pop(t, S(5) - 0.1)}><Head size={64}>INTEREST = COST OF BORROWING</Head>
      {t < a && <Term term="INTEREST" o={vis(t, S(5) + 1.3, a)}>like a rental fee for using someone else's money</Term>}
      <Note o={vis(t, a, SCN[2][1] - 0.05)}>Simplified example. Real interest rates vary.</Note></Top>);
    if (t > a) els.push(
      <div key="math" style={{ position: "absolute", top: 420, left: 0, right: 0, textAlign: "center", opacity: vis(t, a, SCN[2][1] - 0.05) }}>
        <div style={{ transform: `scale(${pop(t, a)})` }}><Head size={118}>$1,000</Head></div>
        {t > b && <div style={{ transform: `scale(${pop(t, b + 0.6)})` }}><Head size={96} color={COL.gold} glow="rgba(255,200,61,0.6)">+ $80 <span style={{ fontSize: 52 }}>(8%)</span></Head></div>}
        {t > c && <div style={{ transform: `scale(${pop(t, c)})`, marginTop: 6 }}><Head size={124} color={COL.green} glow="rgba(43,217,107,0.6)">= $1,080</Head></div>}
      </div>); } }
  // ---- 4. savings: phone, then split screen
  { const o = vis(t, S(7) - 0.1, SPLIT_AT - 0.03); if (o > 0) {
    const grow = easeOut(ramp(t, chunkAt("You earn just") + 0.2, chunkAt("on your $1,000") + 0.9));
    els.push(<Top key="h4" o={o}><Term term="SAVINGS ACCOUNT" o={vis(t, S(7) + 0.2, SPLIT_AT - 0.03)} color={COL.cyan}>a bank account that pays YOU a little interest</Term></Top>);
    els.push(
      <div key="phone" style={{ position: "absolute", left: "50%", top: 560, width: 300, marginLeft: 20, opacity: o,
        transform: `translateY(${(1 - easeOut(ramp(t, S(7) + 0.4, S(7) + 1.0))) * 700}px) rotate(4deg) scale(0.86)`, transformOrigin: "50% 0%", background: "#0b1224", borderRadius: 42, padding: 14,
        boxShadow: "0 24px 60px rgba(0,0,0,0.45)", border: "4px solid #1f2a44" }}>
        <div style={{ background: "linear-gradient(180deg,#e0f7ff,#ffffff)", borderRadius: 30, padding: "26px 20px 30px", fontFamily: I, textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: "#0f766e", letterSpacing: 2 }}>SAVINGS ACCOUNT</div>
          <div style={{ fontWeight: 400, fontSize: 17, color: "#334155", marginTop: 4 }}>Interest: 1% per year</div>
          <div style={{ fontFamily: F, fontSize: 64, color: "#0f172a", marginTop: 18 }}>{money(1000 + 10 * grow)}</div>
          <div style={{ marginTop: 10, display: "inline-block", opacity: ramp(grow, 0.05, 0.2), background: "#dcfce7", color: "#15803d", fontWeight: 800, fontSize: 22, borderRadius: 12, padding: "6px 14px" }}>+{money(10 * grow)} interest</div>
          <div style={{ fontWeight: 400, fontSize: 15, color: "#64748b", marginTop: 14 }}>after 1 year</div>
        </div>
      </div>); } }
  { const o = vis(t, SPLIT_AT, SCN[3][1] - 0.05); if (o > 0) {
    els.push(<Top key="h4b" o={o} s={pop(t, SPLIT_AT)}><Head size={46}>YOU EARN <span style={{ color: COL.cyan }}>$10</span> | LOAN EARNS <span style={{ color: COL.gold }}>$80</span></Head>
      <Note o={o}>For $1,000 over one year (simplified example)</Note></Top>);
    els.push(<div key="split" style={{ position: "absolute", top: 250, left: 0, right: 0, display: "flex", opacity: o }}>
      <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontFamily: I, fontWeight: 800, fontSize: 26, color: "#cfe" }}>YOU (1%)</div><Head size={104} color={COL.cyan}>$10</Head></div>
      <div style={{ flex: 1, textAlign: "center" }}><div style={{ fontFamily: I, fontWeight: 800, fontSize: 26, color: "#ffeab0" }}>BANK'S LOAN (8%)</div><Head size={104} color={COL.gold} glow="rgba(255,200,61,0.5)">$80</Head></div></div>); } }
  // ---- 5. investments + fees
  { const o = vis(t, S(10) - 0.1, SCN[4][1] - 0.05); if (o > 0) {
    const fees = chunkAt("And some banks charge fees");
    els.push(<Top key="h5" o={o}>
      <Head size={60}>LOANS <span style={{ opacity: ramp(t, S(10) + 0.3, S(10) + 0.6) }}>+ <span style={{ color: COL.cyan }}>INVESTMENTS</span></span> <span style={{ opacity: ramp(t, fees + 0.3, fees + 0.6) }}>+ <span style={{ color: COL.gold }}>FEES</span></span></Head>
      {t < FUND_AT && <Term term="GOVERNMENT BOND" o={vis(t, S(10) + 0.8, FUND_AT - 0.05)} color={COL.cyan}>lending money to the government, which pays it back with interest</Term>}
      {t >= FUND_AT && <Term term="MUTUAL FUND" o={vis(t, chunkAt("for helping customers") + 0.6, SCN[4][1] - 0.05)} color={COL.gold}>a basket holding tiny pieces of many companies</Term>}
      {t >= FUND_AT && <Note o={vis(t, chunkAt("which are baskets") + 0.2, SCN[4][1] - 0.05)}>Customers choose to buy it. The bank may charge a fee for helping.</Note>}
    </Top>); } }
  // ---- 6. the big reveal
  { const o = vis(t, S(12) - 0.1, E(12) + 0.1); if (o > 0) els.push(<Top key="h6a" o={o} s={pop(t, S(12))}><Head size={78}>MILLIONS OF</Head><Head size={78} color={COL.cyan}>CUSTOMERS</Head></Top>); }
  { const o = vis(t, S(13) - 0.05, E(13) + 0.15); if (o > 0) els.push(<Top key="h6b" y={360} o={o} s={pop(t, S(13))}><Head size={150} color={COL.gold} glow="rgba(255,200,61,0.8)">$ BILLIONS</Head></Top>); }
  { const o = vis(t, S(14) - 0.05, E(14) + 0.1); if (o > 0) els.push(<Top key="h6c" o={o}>
      <Head size={60}>BANKS ALSO PAY</Head>
      <div style={{ display: "flex", gap: 14, marginTop: 14, flexWrap: "wrap", justifyContent: "center" }}>
        {[["− EXPENSES", "workers, buildings, apps", S(14) + 0.5], ["− LOSSES", "loans that aren't paid back", S(14) + 1.9]].map(([a, b, at]) => (
          <div key={a as string} style={{ opacity: ramp(t, at as number, (at as number) + 0.25), transform: `scale(${pop(t, at as number)})`, background: "rgba(127,29,29,0.88)", border: `3px solid ${COL.red}`, borderRadius: 16, padding: "8px 16px", fontFamily: I, color: "#fff" }}>
            <div style={{ fontFamily: F, fontSize: 40, color: "#ffb3bd" }}>{a}</div><div style={{ fontSize: 19, fontWeight: 800 }}>{b}</div></div>))}
      </div></Top>); }
  { const o = vis(t, S(15) - 0.05, TEEN_END); if (o > 0) els.push(<Top key="h6d" o={o} s={pop(t, S(15))}><Head size={62}>BANKS EARN MONEY</Head><Head size={62} color={COL.green}>USING DEPOSITS</Head></Top>); }
  { const o = vis(t, TEEN_END + 0.1, 61); if (o > 0) els.push(<Top key="h6e" o={o} s={pop(t, TEEN_END + 0.1)}><Head size={52}>ARE YOU MAKING THE MOST OF YOURS?</Head></Top>); }
  { const o = vis(t, 58.2, 61); if (o > 0) els.push(
    <div key="cta" style={{ position: "absolute", top: 820, left: 30, right: 30, textAlign: "center", opacity: o, transform: `scale(${pop(t, 58.2)})` }}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,#14b8a6,#0f766e)", borderRadius: 26, padding: "18px 26px", boxShadow: "0 14px 40px rgba(0,0,0,0.4)", border: "4px solid #fff" }}>
        <Head size={58}>FOLLOW TO LEARN</Head><Head size={58}>HOW MONEY WORKS<MoneyBag size={60} /></Head></div></div>); }

  // ---- cut flashes inside a part (none at the part boundaries, so the parts edit cleanly)
  const cuts = [SCN[1][0], SCN[3][0], SCN[5][0], SPLIT_AT, FUND_AT, TEEN_END].filter((c) => !PARTS.some(([a]) => Math.abs(a - c) < 0.02));
  let flash = 0;
  for (const c of cuts) if (t >= c && t < c + 0.25) flash = Math.max(flash, 1 - (t - c) / 0.25);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.35) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 72%, rgba(0,0,0,0.3) 100%)" }} />
      {els}
      <Caption t={t} />
      {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: 0.7 * flash }} />}
    </AbsoluteFill>
  );
};
