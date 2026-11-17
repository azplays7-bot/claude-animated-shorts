// On-screen titles, stat cards, captions (yellow keywords) and the final card for "How McDonald's makes money from real estate".
// Figures: McDonald's 2024 Form 10-K (franchised revenues: rents $10.0 B, royalties $5.6 B; ~95 % of 43,477 restaurants franchised), rounded.
import React from "react";
import { AbsoluteFill } from "remotion";
import TM from "./timing.json";
import { BT, RENT_B, ROY_B } from "./story";

type ChunkT = { scene: number; start: number; end: number; text: string };
const CHUNKS = TM.chunks as ChunkT[];
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const smooth = (u: number) => { u = clamp(u); return u * u * u * (u * (u * 6 - 15) + 10); };
const easeOut = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
const backOut = (u: number) => { u = clamp(u); const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
const COL = { gold: "#ffc83d", green: "#2bd96b", red: "#ff4057", cyan: "#3fd8ff", blue: "#3a9bd6", orange: "#e8742c" };
const b = (k: keyof typeof BT) => BT[k] / 30;

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
  const i = CHUNKS.findIndex((c, k) => t >= c.start - 0.05 && t < (CHUNKS[k + 1] && CHUNKS[k + 1].scene === c.scene ? CHUNKS[k + 1].start - 0.05 : c.end + 0.3));
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

const Burger: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ verticalAlign: "middle" }}>
    <path d="M8 30 C8 12 56 12 56 30 Z" fill="#e9a447" stroke="#7a4a12" strokeWidth="2" />
    <rect x="6" y="30" width="52" height="5" rx="2" fill="#5cbf4a" />
    <rect x="7" y="35" width="50" height="9" rx="3" fill="#6b3a22" />
    <path d="M9 44 L55 44 L51 53 L13 53 Z" fill="#e9a447" stroke="#7a4a12" strokeWidth="2" />
  </svg>
);
/** donut: share of restaurants franchised */
const Donut: React.FC<{ u: number; size: number }> = ({ u, size }) => {
  const r = 40, c = 2 * Math.PI * r, k = 0.95 * u;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="16" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={COL.gold} strokeWidth="16" strokeDasharray={`${c * k} ${c}`} transform="rotate(-90 50 50)" />
      <text x="50" y="57" textAnchor="middle" fontFamily="Anton" fontSize="24" fill="#fff">{Math.round(95 * u)}%</text>
    </svg>
  );
};
/** horizontal bars: 2024 franchise rent vs royalties */
const Bars: React.FC<{ t: number; a: number }> = ({ t, a }) => {
  const u = smooth(ramp(t, a + 0.4, a + 1.8));
  const row = (label: string, v: number, col: string) => (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: I, fontWeight: 800, fontSize: 26, color: "#e5e7eb" }}><span>{label}</span><span style={{ fontFamily: F, fontSize: 40, color: col }}>≈ ${(v * u).toFixed(1)}B</span></div>
      <div style={{ height: 26, background: "rgba(255,255,255,0.15)", borderRadius: 13, overflow: "hidden" }}><div style={{ width: `${(v / RENT_B) * 100 * u}%`, height: "100%", background: col, borderRadius: 13 }} /></div>
    </div>
  );
  return <>{row("Franchise RENT", RENT_B, COL.gold)}{row("Royalties", ROY_B, COL.blue)}</>;
};
const Panel: React.FC<{ y?: number; w?: number; o: number; s?: number; children: React.ReactNode }> = ({ y = 96, w = 600, o, s = 1, children }) => (
  <div style={{ position: "absolute", top: y, left: (720 - w) / 2, width: w, opacity: o, transform: `scale(${s})`, transformOrigin: "50% 0%",
    background: "rgba(8,16,36,0.84)", border: "3px solid rgba(255,255,255,0.85)", borderRadius: 22, padding: "14px 24px 16px", boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>{children}</div>
);
const Tick: React.FC<{ on: number; children: React.ReactNode }> = ({ on, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: on, transform: `translateX(${(1 - on) * -20}px)`, fontFamily: I, fontWeight: 800, fontSize: 30, color: "#fff", marginTop: 6 }}>
    <span style={{ display: "inline-block", width: 34, height: 34, borderRadius: 17, background: COL.green, color: "#062", textAlign: "center", lineHeight: "34px", fontSize: 24 }}>✓</span>{children}</div>
);

export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const els: React.ReactNode[] = [];
  const END = b("landlords");
  // ---- hook
  { const o = vis(t, 0.1, b("re") - 0.05); if (o > 0) els.push(<Top key="title" y={92} o={o} s={pop(t, 0.1)}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,rgba(194,65,12,0.94),rgba(124,45,18,0.94))", border: "4px solid #fff", borderRadius: 22, padding: "10px 26px 12px" }}>
        <Head size={46}>HOW McDONALD'S REALLY</Head><Head size={72} color={COL.gold} glow="rgba(255,200,61,0.6)">MAKES MONEY <Burger size={60} /></Head></div>
      {t > b("huge") && <div style={{ marginTop: 14, transform: `scale(${pop(t, b("huge"))})` }}><Chip border={COL.gold} size={30}>Hint: it's not the burgers</Chip></div>}
    </Top>); }
  { const a = b("re"), o = vis(t, a - 0.05, b("p95") - 0.1); if (o > 0) els.push(<Top key="re" y={130} o={o} s={pop(t, a)}>
      <Head size={120} color={COL.gold} glow="rgba(255,200,61,0.8)">REAL ESTATE</Head></Top>); }
  // ---- franchising
  { const a = b("p95"), o = vis(t, a, b("kitchen") - 0.1); if (o > 0) els.push(<Panel key="fr" o={o} s={pop(t, a)} y={90} w={560}>
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <Donut u={smooth(ramp(t, a + 0.1, a + 1.6))} size={170} />
        <div><Head size={44}>FRANCHISED</Head>
          <div style={{ fontFamily: I, fontWeight: 600, fontSize: 24, color: "#e5e7eb", marginTop: 4 }}>of ~43,000 restaurants<br />worldwide (end of 2024)</div></div>
      </div>
      {t > b("fran") && <div style={{ marginTop: 10, textAlign: "center", opacity: easeOut(ramp(t, b("fran"), b("fran") + 0.3)) }}><Chip border={COL.gold} size={24}>Franchisee = an independent owner</Chip></div>}
    </Panel>); }
  { const a = b("sam"), o = vis(t, a, b("kitchen") - 0.1); if (o > 0) els.push(<Top key="sam" y={420} o={o} s={pop(t, a)}><Head size={70} color={COL.gold}>MEET SAM</Head></Top>); }
  { const a = b("kitchen"), o = vis(t, a, b("twist") - 0.1); if (o > 0) els.push(<Panel key="job" o={o} s={pop(t, a)} y={96} w={520}>
      <Head size={42}>SAM'S JOB</Head>
      <Tick on={easeOut(ramp(t, a + 0.1, a + 0.4))}>Runs the kitchen</Tick>
      <Tick on={easeOut(ramp(t, a + 1.1, a + 1.4))}>Hires the staff</Tick>
      <Tick on={easeOut(ramp(t, b("flips"), b("flips") + 0.3))}>Flips the burgers</Tick>
    </Panel>); }
  // ---- the twist
  { const a = b("twist"), o = vis(t, a, b("slice") - 0.1); if (o > 0) els.push(<Top key="tw" y={96} o={o} s={pop(t, a)}>
      <Head size={84} color={COL.gold} glow="rgba(255,200,61,0.6)">THE TWIST</Head>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10, alignItems: "center" }}>
        {t > b("owns") && <div style={{ transform: `scale(${pop(t, b("owns"))})` }}><Chip border={COL.cyan} size={27}>McDonald's often owns the BUILDING</Chip></div>}
        {t > b("land") && <div style={{ transform: `scale(${pop(t, b("land"))})` }}><Chip border={COL.gold} size={27}>…and much of the LAND (or a long lease)</Chip></div>}
        {t > b("rent") && <div style={{ transform: `scale(${pop(t, b("rent"))})` }}><Chip border={COL.green} bg="rgba(6,78,59,0.92)" size={32}>Sam pays RENT every month</Chip></div>}
      </div></Top>); }
  // ---- how Sam pays + the 2024 numbers
  { const a = b("slice"), o = vis(t, a, b("y2024") - 0.1); if (o > 0) els.push(<Card key="pay" t={t} o={o} s={pop(t, a)} y={96} title="WHAT SAM PAYS" rows={[
      { at: a + 0.1, label: "Rent", value: "% OF SALES", color: COL.gold },
      { at: b("min"), label: "…with a minimum", value: "MIN. RENT", color: "#fde68a" },
      { at: b("roy"), label: "Royalty", value: "% OF SALES", color: "#93c5fd", rule: true }]} />); }
  { const a = b("y2024"), o = vis(t, a, b("bad") - 0.1); if (o > 0) els.push(<Panel key="num" o={o} s={pop(t, a)} y={90} w={600}>
      <Head size={40}>FRANCHISE REVENUE · 2024</Head>
      <Bars t={t} a={a} />
      {t > b("double") && <div style={{ marginTop: 12, textAlign: "center", transform: `scale(${pop(t, b("double"))})` }}><Chip border={COL.gold} size={28}>Rent ≈ 1.8× royalties</Chip></div>}
    </Panel>); }
  // ---- bad year
  { const a = b("bad"), o = vis(t, a, b("notjust") - 0.1); if (o > 0) {
      els.push(<Top key="bad" y={100} o={o} s={pop(t, a)}><Chip border={COL.red} bg="rgba(127,29,29,0.9)" size={34}>BAD SALES YEAR? 📉</Chip>
        {t > b("coming") && <div style={{ marginTop: 12, transform: `scale(${pop(t, b("coming"))})` }}><Chip border={COL.green} bg="rgba(6,78,59,0.92)" size={34}>RENT STILL DUE 📬</Chip></div>}
        {t > b("rise") && <div style={{ marginTop: 12, transform: `scale(${pop(t, b("rise"))})` }}><Chip border={COL.gold} size={26}>Busy corners can rise in value (not guaranteed)</Chip></div>}
      </Top>);
    } }
  // ---- ending
  { const a = b("notjust"), o = vis(t, a, END - 0.05); if (o > 0) els.push(<Top key="nj" y={100} o={o} s={pop(t, a)}>
      <Head size={64}>NOT JUST BURGERS</Head>
      {t > b("exec") && <div style={{ marginTop: 16, transform: `scale(${pop(t, b("exec"))})`, background: "rgba(8,16,36,0.86)", border: "3px solid #fde68a", borderRadius: 20, padding: "14px 22px", maxWidth: 600 }}>
        <div style={{ fontFamily: F, fontSize: 46, color: "#fff7d6", lineHeight: 1.1 }}>“We are in the real estate business.”</div>
        <div style={{ fontFamily: I, fontWeight: 600, fontSize: 20, color: "#e5e7eb", marginTop: 8 }}>— Harry J. Sonneborn, early McDonald's executive (as widely quoted)</div></div>}
    </Top>); }
  { const a = END, o = vis(t, a, 61, 0.3); if (o > 0) els.push(<div key="fin" style={{ position: "absolute", top: 120, left: 30, right: 30, textAlign: "center", opacity: o, transform: `scale(${pop(t, a)})` }}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,rgba(194,65,12,0.94),rgba(124,45,18,0.94))", border: "5px solid #fff", borderRadius: 24, padding: "14px 30px" }}>
        <Head size={64}>BURGERS PAY THE BILLS.</Head><Head size={78} color={COL.gold} glow="rgba(255,200,61,0.7)">LAND BUILDS THE EMPIRE.</Head>
        <div style={{ marginTop: 6 }}><Burger size={64} /> <HouseIcon size={64} /></div></div></div>); }
  // ---- small print
  els.push(<div key="src" style={{ position: "absolute", bottom: 46, left: 20, right: 20, textAlign: "center", fontFamily: I, fontWeight: 400, fontSize: 16, lineHeight: 1.3, color: "rgba(255,255,255,0.85)", textShadow: "0 2px 6px rgba(0,0,0,0.95)" }}>
    Figures: McDonald's 2024 annual report (10-K), rounded · Simplified for education · Not affiliated with McDonald's · Not financial advice</div>);
  void MoneyBag;

  const black = smooth(ramp(t, 59.5, 60));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 58%, rgba(0,0,0,0.42) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0) 64%, rgba(0,0,0,0.45) 100%)" }} />
      {els}
      <Caption t={t} />
      {black > 0 && <AbsoluteFill style={{ background: "#000", opacity: black }} />}
    </AbsoluteFill>
  );
};
