// On-screen titles, money breakdowns, captions (yellow keywords), cut flashes and the final card for "How real estate can build wealth".
// Every number here is the script's worked example (see README.md): $250,000 house, $50,000 down, $200,000 loan at 6% for 30 years.
import React from "react";
import { AbsoluteFill } from "remotion";
import { CHUNKS, COL, SCN, backOut, clamp, easeOut, ramp, smooth } from "./otime";
import { B1_MEET, B2_BACK, B2_DOWN, B2_LOAN, B3_NOT, B3_PAY, B4_LEFT, B4_MORT, B4_REP, B4_TAX, B4_WIPE, B5_DEF, B5_EQ, B5_PAY, B5_RISE, B6_GUAR, B6_SECRET,
  C1_OUT, C2_KEYS, C2_OFFICE, C3_BILLS, Y0, Y1, loanAt, valueAt, yearsAt } from "./beats";

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
const Chip: React.FC<{ children: React.ReactNode; bg?: string; border?: string; size?: number }> = ({ children, bg = "rgba(10,18,40,0.86)", border = COL.cyan, size = 28 }) => (
  <div style={{ display: "inline-block", fontFamily: I, fontWeight: 800, fontSize: size, color: "#fff", background: bg, padding: "8px 18px", borderRadius: 14, border: `3px solid ${border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}>{children}</div>
);
const HouseIcon: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ verticalAlign: "middle" }}>
    <path d="M8 30 L32 9 L56 30" fill="none" stroke="#fff" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M15 27 L15 55 L49 55 L49 27 L32 13 Z" fill="#ffc83d" stroke="#8a5a0a" strokeWidth="2" />
    <rect x="27" y="38" width="10" height="17" fill="#1e3a8a" />
    <rect x="40" y="13" width="6" height="11" fill="#c2410c" />
  </svg>
);
const MoneyBag: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ verticalAlign: "middle" }}>
    <path d="M22 10 L42 10 L37 19 L27 19 Z" fill="#c98a1b" />
    <path d="M27 19 C10 28 8 56 32 57 C56 56 54 28 37 19 Z" fill="#e8a923" stroke="#8a5a0a" strokeWidth="2" />
    <rect x="24" y="17" width="16" height="4" rx="2" fill="#8a5a0a" />
    <text x="32" y="48" textAnchor="middle" fontFamily="Anton" fontSize="24" fill="#fff5d6">$</text>
  </svg>
);
/** a glass card with rows; each row slides in at its own time */
type Row = { at: number; label: string; value: string; color?: string; strong?: boolean; rule?: boolean };
const Card: React.FC<{ t: number; title?: string; rows: Row[]; o: number; s?: number; y?: number; w?: number }> = ({ t, title, rows, o, s = 1, y = 96, w = 600 }) => (
  <div style={{ position: "absolute", top: y, left: (720 - w) / 2, width: w, opacity: o, transform: `scale(${s})`, transformOrigin: "50% 0%",
    background: "rgba(8,16,36,0.84)", border: "3px solid rgba(255,255,255,0.85)", borderRadius: 22, padding: "14px 24px 12px", boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>
    {title && <div style={{ fontFamily: F, fontSize: 40, color: "#fff", textAlign: "center", letterSpacing: 1, marginBottom: 6 }}>{title}</div>}
    {rows.map((r, i) => {
      const u = easeOut(ramp(t, r.at, r.at + 0.3));
      if (u <= 0) return null;
      return <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", opacity: u, transform: `translateX(${(1 - u) * -24}px)`,
        borderTop: r.rule ? "2px solid rgba(255,255,255,0.5)" : "none", marginTop: r.rule ? 6 : 0, paddingTop: r.rule ? 6 : 2 }}>
        <span style={{ fontFamily: I, fontWeight: r.strong ? 800 : 600, fontSize: r.strong ? 30 : 27, color: "#e5e7eb" }}>{r.label}</span>
        <span style={{ fontFamily: F, fontSize: r.strong ? 46 : 38, color: r.color ?? "#fff", letterSpacing: 0.5 }}>{r.value}</span>
      </div>;
    })}
  </div>
);
/** big bold captions, keywords in yellow (CAPS words and amounts) */
const isKey = (w: string) => /\$|\d|%/.test(w) || (w.replace(/[^A-Za-z]/g, "").length >= 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
const Caption: React.FC<{ t: number }> = ({ t }) => {
  const i = CHUNKS.findIndex((c, k) => t >= c.start - 0.05 && t < (CHUNKS[k + 1] && CHUNKS[k + 1].scene === c.scene ? CHUNKS[k + 1].start - 0.05 : Math.min(c.end + 0.25, SCN[c.scene - 1][1] - 0.04)));
  if (i < 0) return null;
  const c = CHUNKS[i];
  const words = c.text.split(" ");
  const dur = Math.max(0.3, c.end - c.start);
  return (
    <div style={{ position: "absolute", bottom: 210, left: 26, right: 26, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 12px",
      transform: `scale(${0.9 + 0.1 * easeOut(ramp(t, c.start - 0.05, c.start + 0.12))})` }}>
      {words.map((w, k) => {
        const at = c.start + dur * (k / words.length);
        const on = t >= at - 0.03;
        return <span key={k} style={{ fontFamily: I, fontWeight: 800, fontSize: 48, lineHeight: 1.15, color: isKey(w) ? "#FFE14D" : "#ffffff",
          WebkitTextStroke: "2px rgba(0,0,0,0.9)", textShadow: "0 4px 0 rgba(0,0,0,0.7), 0 0 18px rgba(0,0,0,0.6)", opacity: on ? 1 : 0.35,
          transform: `translateY(${on ? 0 : 6}px)` }}>{w}</span>;
      })}
    </div>
  );
};

export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const els: React.ReactNode[] = [];
  // ---- 1: title, then "meet Alex"
  { const o = vis(t, 0.1, B1_MEET - 0.1); if (o > 0) els.push(<Top key="title" y={96} o={o} s={pop(t, 0.1)}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,rgba(14,116,144,0.92),rgba(8,47,73,0.92))", border: "4px solid #fff", borderRadius: 22, padding: "10px 26px 12px" }}>
        <Head size={50}>HOW REAL ESTATE</Head><Head size={74} color={COL.gold} glow="rgba(255,200,61,0.6)">BUILDS WEALTH <HouseIcon size={66} /></Head></div></Top>); }
  { const o = vis(t, B1_MEET, 9.92); if (o > 0) els.push(<Top key="alex" y={110} o={o} s={pop(t, B1_MEET)}>
      <Head size={78}>MEET ALEX, 25</Head><div style={{ marginTop: 8 }}><Chip border={COL.gold}>Regular job · big dream: financial freedom</Chip></div></Top>); }
  // ---- 2: the purchase
  { const o = vis(t, 10.15, 19.92); if (o > 0) els.push(<Card key="buy" t={t} o={o} s={pop(t, 10.15)} title="BUYING THE HOUSE" rows={[
      { at: 10.2, label: "House price", value: "$250,000" },
      { at: B2_DOWN, label: "Down payment (Alex)", value: "$50,000", color: COL.gold },
      { at: B2_LOAN, label: "Mortgage loan (bank)", value: "$200,000", color: "#86efac" },
      { at: B2_BACK, label: "Paid back", value: "MONTHLY", color: "#fca5a5", rule: true }]} />); }
  void C2_OFFICE; void C2_KEYS;
  // ---- 3: rent
  { const o = vis(t, B3_PAY, 29.92); if (o > 0) els.push(<Top key="rent" y={110} o={o} s={pop(t, B3_PAY)}>
      <Head size={56}>RENT FROM THE FAMILY</Head><Head size={96} color={COL.green} glow="rgba(43,217,107,0.6)">$1,800 / MONTH</Head></Top>); }
  { const o = vis(t, B3_NOT, 29.92); if (o > 0) els.push(<Top key="np" y={300} o={o} s={pop(t, B3_NOT)}><Chip border={COL.red} bg="rgba(127,29,29,0.9)" size={32}>…but it is NOT all profit</Chip></Top>); }
  void C3_BILLS;
  // ---- 4: the monthly math
  { const o = vis(t, 30.1, 39.92); if (o > 0) els.push(<Card key="math" t={t} o={o} s={pop(t, 30.1)} y={80} title="EVERY MONTH" rows={[
      { at: 30.15, label: "Rent", value: "$1,800", color: "#86efac" },
      { at: B4_MORT, label: "− Mortgage (principal + interest)", value: "$1,200", color: "#fca5a5" },
      { at: B4_TAX, label: "− Property taxes + insurance", value: "$250", color: "#fca5a5" },
      { at: B4_REP, label: "− Repairs + vacancy savings", value: "$200", color: "#fca5a5" },
      { at: B4_LEFT - 0.35, label: "Total expenses", value: "$1,650", rule: true },
      { at: B4_LEFT, label: "Cash flow", value: "+$150", color: COL.green, strong: true }]} />); }
  { const o = vis(t, B4_LEFT + 0.6, B4_WIPE - 0.05); if (o > 0) els.push(<Top key="pcf" y={540} o={o} s={pop(t, B4_LEFT + 0.6)}><Chip border={COL.green} size={30}>POSITIVE CASH FLOW</Chip></Top>); }
  { const o = vis(t, B4_WIPE, 39.92); if (o > 0) els.push(<Top key="wipe" y={540} o={o} s={pop(t, B4_WIPE)}><Chip border={COL.red} bg="rgba(127,29,29,0.9)" size={28}>One big repair or an empty month can erase it</Chip></Top>); }
  // ---- 5: five years later
  { const o = vis(t, 40.1, 49.92); if (o > 0) {
      const y = yearsAt(t), V = valueAt(y), L = loanAt(y);
      els.push(<div key="yr" style={{ position: "absolute", top: 70, left: 0, right: 0, textAlign: "center", opacity: o }}>
        <Chip border={COL.gold} size={30}>YEAR {Math.min(5, Math.floor(y + 1e-6))} {y >= 4.999 ? "" : "→"}</Chip></div>);
      els.push(<Card key="eq" t={t} o={o} s={pop(t, 40.1)} y={134} w={560} rows={[
        { at: 40.15, label: "Home value*", value: money(V), color: "#86efac" },
        { at: 40.15, label: "Loan balance", value: money(L), color: "#fca5a5" },
        { at: 40.15, label: "Alex's equity", value: money(V - L), color: COL.gold, strong: true, rule: true }]} />);
    } }
  { const o = vis(t, B5_DEF - 0.1, 49.92); if (o > 0) els.push(<Top key="def" y={400} o={o} s={pop(t, B5_DEF - 0.1)}>
      <div style={{ display: "inline-block", background: "rgba(120,80,0,0.9)", border: "4px solid #fde68a", borderRadius: 18, padding: "8px 20px" }}>
        <Head size={36} color="#fff7d6">EQUITY = HOME VALUE − LOAN BALANCE</Head></div></Top>); }
  { const o = vis(t, 40.2, 49.92); if (o > 0) els.push(<div key="fn" style={{ position: "absolute", bottom: 40, left: 24, right: 24, textAlign: "center", opacity: o, fontFamily: I, fontWeight: 400, fontSize: 18, color: "rgba(255,255,255,0.9)", textShadow: "0 2px 6px rgba(0,0,0,0.95)" }}>
      *Hypothetical: value +$50,000 over 5 years. Prices can also fall. Loan: $200,000, 6%, 30 years.</div>); }
  void Y0; void Y1; void B5_PAY; void B5_RISE; void B5_EQ;
  // ---- 6: the three engines, the warning, the final card
  { const o = vis(t, 50.15, B6_SECRET - 0.05); if (o > 0) els.push(<Top key="three" y={100} o={o} s={pop(t, 50.15)}>
      <Head size={52}>3 WAYS IT CAN BUILD WEALTH</Head>
      <div style={{ display: "flex", gap: 10, marginTop: 10, justifyContent: "center" }}>
        {[["RENT", 50.2], ["LOAN PAYOFF", 50.75], ["RISING VALUE", 51.35]].map(([s, a]) => <div key={s as string} style={{ transform: `scale(${pop(t, a as number)})` }}><Chip border={COL.gold} size={26}>{s}</Chip></div>)}
      </div>
      {t > B6_GUAR - 0.1 && <div style={{ marginTop: 12, transform: `scale(${pop(t, B6_GUAR - 0.1)})` }}><Chip border={COL.red} bg="rgba(127,29,29,0.9)" size={28}>NOTHING IS GUARANTEED</Chip></div>}
    </Top>); }
  { const a = B6_SECRET, o = vis(t, a, 61, 0.3); if (o > 0) els.push(<div key="fin" style={{ position: "absolute", top: 120, left: 30, right: 30, textAlign: "center", opacity: o, transform: `scale(${pop(t, a)})` }}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,rgba(14,116,144,0.94),rgba(8,47,73,0.94))", border: "5px solid #fff", borderRadius: 24, padding: "14px 30px" }}>
        <Head size={70}>BUY SMART.</Head><Head size={70} color="#bae6fd">RENT RESPONSIBLY.</Head><Head size={78} color={COL.gold} glow="rgba(255,200,61,0.7)">BUILD WEALTH.</Head>
        <div style={{ marginTop: 6 }}><HouseIcon size={64} /> <MoneyBag size={64} /></div></div></div>); }
  // ---- small print on every clip
  if (t < 40.05 || t > 49.95) els.push(<div key="src" style={{ position: "absolute", bottom: 46, left: 20, right: 20, textAlign: "center", fontFamily: I, fontWeight: 400, fontSize: 17, lineHeight: 1.3, color: "rgba(255,255,255,0.85)", textShadow: "0 2px 6px rgba(0,0,0,0.95)" }}>
    Simplified example for education · not financial advice · rent and home values are never guaranteed</div>);

  // flashes at each clip start and at the cuts inside a clip; each clip opens cleanly so it can be used alone
  const cuts = [10, 20, 30, 40, 50, C1_OUT, C2_OFFICE, C2_KEYS, C3_BILLS];
  let flash = 0;
  for (const c of cuts) if (t >= c && t < c + 0.2) flash = Math.max(flash, 1 - (t - c) / 0.2);
  const black = smooth(ramp(t, 59.5, 60));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 64%, rgba(0,0,0,0.45) 100%)" }} />
      {els}
      <Caption t={t} />
      {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: 0.4 * flash }} />}
      {black > 0 && <AbsoluteFill style={{ background: "#000", opacity: black }} />}
    </AbsoluteFill>
  );
};
