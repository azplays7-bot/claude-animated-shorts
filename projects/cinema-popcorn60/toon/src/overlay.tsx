// On-screen titles, cards, captions (yellow keywords) and the final card for "Why theaters lose money on the movie".
// Facts: studios commonly take ~50-60 %+ of box office early in a run (film rental terms are negotiated per film and
// fall later in the run); AMC's 2024 10-K: admissions $2.56 B, food & beverage $1.62 B of $4.64 B revenue (~35 %);
// concession margins are commonly cited at ~80-85 %. The $15 ticket / $2 kept and the $9 tub / ~$1.50 cost are
// illustrative examples.
import React from "react";
import { AbsoluteFill } from "remotion";
import TM from "./timing.json";
import { BT } from "./story";

type ChunkT = { scene: number; start: number; end: number; text: string };
const CHUNKS = TM.chunks as ChunkT[];
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const ramp = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
const smooth = (u: number) => { u = clamp(u); return u * u * u * (u * (u * 6 - 15) + 10); };
const easeOut = (u: number) => 1 - Math.pow(1 - clamp(u), 3);
const backOut = (u: number) => { u = clamp(u); const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
const COL = { gold: "#ffc83d", green: "#2bd96b", red: "#ff4057", cyan: "#3fd8ff", pink: "#ff7aa8", orange: "#e8742c" };
const b = (k: keyof typeof BT) => BT[k] / 30;

const F = "Anton, Impact, sans-serif", I = "Inter, Arial, sans-serif";
const shadow = "0 4px 0 rgba(0,0,0,0.55), 0 0 22px rgba(0,0,0,0.45)";
const vis = (t: number, a: number, b: number, fade = 0.22) => clamp(Math.min((t - a) / fade, (b - t) / fade));
const pop = (t: number, a: number) => backOut(ramp(t, a, a + 0.32));
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
type Row = { at: number; label: string; value: string; color?: string; strong?: boolean; rule?: boolean };
const Card: React.FC<{ t: number; title?: string; rows: Row[]; o: number; s?: number; y?: number; w?: number; foot?: string }> = ({ t, title, rows, o, s = 1, y = 96, w = 600, foot }) => (
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
    {foot && <div style={{ fontFamily: I, fontWeight: 400, fontSize: 18, color: "rgba(229,231,235,0.85)", textAlign: "center", marginTop: 4 }}>{foot}</div>}
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
const Panel: React.FC<{ y?: number; w?: number; o: number; s?: number; children: React.ReactNode }> = ({ y = 96, w = 600, o, s = 1, children }) => (
  <div style={{ position: "absolute", top: y, left: (720 - w) / 2, width: w, opacity: o, transform: `scale(${s})`, transformOrigin: "50% 0%",
    background: "rgba(8,16,36,0.84)", border: "3px solid rgba(255,255,255,0.85)", borderRadius: 22, padding: "14px 22px 16px", boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>{children}</div>
);
const Tick: React.FC<{ on: number; good?: boolean; size?: number; children: React.ReactNode }> = ({ on, good = true, size = 28, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: on, transform: `translateX(${(1 - on) * -20}px)`, fontFamily: I, fontWeight: 800, fontSize: size, color: "#fff", marginTop: 6, textAlign: "left" }}>
    <span style={{ flex: "0 0 auto", display: "inline-block", width: 32, height: 32, borderRadius: 16, background: good ? COL.green : COL.red, color: good ? "#062" : "#fff", textAlign: "center", lineHeight: "32px", fontSize: 22 }}>{good ? "✓" : "✕"}</span>{children}</div>
);
const Lock: React.FC<{ open: boolean; size: number }> = ({ open, size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ verticalAlign: "middle" }}>
    <path d={open ? "M20 30 V20 C20 8 40 6 44 16" : "M20 30 V20 C20 6 44 6 44 20 V30"} fill="none" stroke="#e5e7eb" strokeWidth="7" strokeLinecap="round" />
    <rect x="12" y="28" width="40" height="30" rx="6" fill={open ? COL.green : COL.gold} stroke="#3a2a0a" strokeWidth="2" />
    <circle cx="32" cy="42" r="5" fill="#3a2a0a" />
  </svg>
);
const on = (t: number, a: number) => easeOut(ramp(t, a, a + 0.3));

export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const els: React.ReactNode[] = [];
  const END = BT.end / 30;
  // ---- the promise: a locked badge stays up until the reveal
  { const a = b("curtain"), o = vis(t, a, b("popcorn") + 0.05, 0.25); if (o > 0) els.push(<div key="lock" style={{ position: "absolute", top: 30, left: 0, right: 0, textAlign: "center", opacity: o,
      transform: `scale(${pop(t, a)})` }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: I, fontWeight: 800, fontSize: 22, color: "#fff", background: "rgba(10,10,20,0.78)", border: `2px solid ${COL.gold}`, borderRadius: 30, padding: "4px 16px 4px 8px" }}>
        <Lock open={false} size={34} />THE REAL MONEY MAKER: <span style={{ color: COL.gold }}>END OF VIDEO</span></div></div>); }
  // ---- hook
  { const o = vis(t, 0.1, b("curtain") - 0.1); if (o > 0) els.push(<Top key="title" y={96} o={o} s={pop(t, 0.1)}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,rgba(192,36,46,0.95),rgba(90,15,30,0.95))", border: "4px solid #ffd76a", borderRadius: 22, padding: "10px 26px 12px" }}>
        <Head size={50}>WHERE DOES YOUR</Head><Head size={74} color={COL.gold} glow="rgba(255,200,61,0.6)">$15 TICKET GO? 🎟️</Head></div>
      {t > b("little") && <div style={{ marginTop: 14, transform: `scale(${pop(t, b("little"))})` }}><Chip border={COL.red} size={30}>The theater keeps very little 😬</Chip></div>}
    </Top>); }
  // ---- the curtain
  { const a = b("curtain"), o = vis(t, a, b("studio") - 0.1); if (o > 0) els.push(<Top key="curt" y={100} o={o} s={pop(t, a)}>
      <Head size={58}>WHAT'S BEHIND</Head><Head size={88} color={COL.pink} glow="rgba(255,122,168,0.6)">THE CURTAIN? 🎭</Head>
      {t > b("stay") && <div style={{ marginTop: 10, transform: `scale(${pop(t, b("stay"))})` }}><Chip border={COL.gold} size={30}>Revealed at the end 👀</Chip></div>}
    </Top>); }
  // ---- where the $15 goes
  { const a = b("studio"), o = vis(t, a, b("survive") - 0.1); if (o > 0) els.push(<Card key="math" t={t} o={o} s={pop(t, a)} y={96} w={580} title="YOUR $15 TICKET 🎟️" foot="example numbers · splits vary by film" rows={[
      { at: b("studio"), label: "Ticket price", value: "$15", color: COL.green },
      { at: b("half"), label: "Studio's cut (often 50%+ early)", value: "−$8", color: COL.red },
      { at: b("rent"), label: "Rent + staff", value: "−$3", color: COL.red },
      { at: b("power"), label: "Power + screens", value: "−$2", color: COL.red },
      { at: b("keep"), label: "Theater keeps", value: "~$2", color: COL.gold, strong: true, rule: true }]} />); }
  // ---- how do they survive
  { const a = b("survive"), o = vis(t, a, b("profitable") - 0.1); if (o > 0) els.push(<Top key="surv" y={96} o={o} s={pop(t, a)}>
      <Head size={56}>SO HOW DO THEY</Head><Head size={92} color={COL.gold} glow="rgba(255,200,61,0.6)">SURVIVE? 🤔</Head>
      {t > b("hundreds") && <div style={{ marginTop: 10, transform: `scale(${pop(t, b("hundreds"))})` }}><Chip border={COL.orange} size={28}>Hundreds of hungry people · one lobby</Chip></div>}
      {t > b("allowed") && <div style={{ marginTop: 10, transform: `scale(${pop(t, b("allowed"))})` }}><Chip border={COL.red} bg="rgba(127,29,29,0.92)" size={30}>🚫 No outside food</Chip></div>}
    </Top>); }
  { const a = b("profitable"), o = vis(t, a, b("what") - 0.05, 0.15); if (o > 0) els.push(<Top key="prof" y={104} o={o} s={pop(t, a)}>
      <Head size={52}>THE MOST PROFITABLE</Head><Head size={68} color={COL.gold} glow="rgba(255,200,61,0.6)">THING IN THE BUILDING</Head></Top>); }
  // ---- the reveal
  { const a = b("what"), o = vis(t, a, b("popcorn") - 0.02, 0.12); if (o > 0) {
      const dots = ".".repeat(1 + (Math.floor((t - a) * 3) % 3));
      els.push(<Top key="what" y={110} o={o} s={pop(t, a)}><Head size={64}>BEHIND THE</Head><Head size={100} color={COL.pink} glow="rgba(255,122,168,0.6)">CURTAIN{dots}</Head></Top>);
    } }
  { const a = b("popcorn"), o = vis(t, a, b("getsin") - 0.1); if (o > 0) els.push(<Top key="reveal" y={86} o={o} s={pop(t, a)}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: I, fontWeight: 800, fontSize: 24, color: "#fff", background: "rgba(6,78,59,0.9)", border: `2px solid ${COL.green}`, borderRadius: 30, padding: "4px 16px 4px 8px" }}>
        <Lock open size={36} />UNLOCKED</div>
      <div style={{ whiteSpace: "nowrap" }}><Head size={118} color={COL.gold} glow="rgba(255,200,61,0.85)">POPCORN 🍿</Head></div>
    </Top>); }
  { const a = b("tub"), o = vis(t, a, b("getsin") - 0.1); if (o > 0) els.push(<Card key="pmath" t={t} o={o} s={pop(t, a)} y={262} w={520} title="THE POPCORN MATH" foot="example numbers" rows={[
      { at: b("tub"), label: "Price of a tub", value: "$9", color: COL.green },
      { at: b("tub") + 1.4, label: "Cost to make", value: "~$1.50", color: COL.red },
      { at: b("tub") + 2.3, label: "Kept", value: "~$7.50", color: COL.gold, strong: true, rule: true }]} />); }
  { const a = b("third"), o = vis(t, a, b("getsin") - 0.1); if (o > 0) els.push(<div key="third" style={{ position: "absolute", top: 560, left: 0, right: 0, textAlign: "center", opacity: o, transform: `scale(${pop(t, a)})` }}>
      <Chip border={COL.green} bg="rgba(6,78,59,0.92)" size={27}>Snacks ≈ ⅓ of sales · ~80%+ kept 💰</Chip></div>); }
  // ---- the lesson
  { const a = b("getsin"), o = vis(t, a, b("printers") - 0.1); if (o > 0) els.push(<Panel key="lesson" o={o} s={pop(t, a)} y={96} w={600}>
      <div style={{ textAlign: "center" }}>
        <div style={{ opacity: on(t, a) }}><Head size={46}>🎟️ TICKET = <span style={{ color: COL.cyan }}>GETS YOU IN</span></Head></div>
        <div style={{ opacity: on(t, b("bills")), marginTop: 8 }}><Head size={46}>🍿 POPCORN = <span style={{ color: COL.gold }}>PAYS THE BILLS</span></Head></div>
      </div></Panel>); }
  { const a = b("printers"), o = vis(t, a, END + 0.05); if (o > 0) els.push(<Panel key="every" o={o} s={pop(t, a)} y={96} w={560}>
      <Head size={38} color={COL.gold}>THE "POPCORN" IS EVERYWHERE</Head>
      <Tick on={on(t, b("printers"))} size={27}>Cheap printer → pricey INK 🖨️</Tick>
      <Tick on={on(t, b("consoles"))} size={27}>Cheap console → pricey GAMES 🎮</Tick>
      <Tick on={on(t, b("cheap"))} size={27}>Looks cheap? Find the popcorn 🔍</Tick>
    </Panel>); }
  { const a = END + 0.1, o = vis(t, a, 61, 0.3); if (o > 0) els.push(<div key="fin" style={{ position: "absolute", top: 120, left: 30, right: 30, textAlign: "center", opacity: o, transform: `scale(${pop(t, a)})` }}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,rgba(192,36,46,0.95),rgba(90,15,30,0.95))", border: "5px solid #ffd76a", borderRadius: 24, padding: "14px 30px" }}>
        <Head size={70}>FIND THE</Head><Head size={92} color={COL.gold} glow="rgba(255,200,61,0.7)">POPCORN 🍿</Head></div></div>); }
  // ---- small print
  els.push(<div key="src" style={{ position: "absolute", bottom: 40, left: 20, right: 20, textAlign: "center", fontFamily: I, fontWeight: 400, fontSize: 15, lineHeight: 1.3, color: "rgba(255,255,255,0.85)", textShadow: "0 2px 6px rgba(0,0,0,0.95)" }}>
    Example numbers · Studio share varies by film & week (often ~50–60%+ early in a run) · Food & drinks ≈ 35% of AMC's 2024 revenue (SEC 10-K) · Snack margins commonly cited ~80%+ · Not financial advice</div>);

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
