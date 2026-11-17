// On-screen titles, stat cards, captions (yellow keywords) and the final card for "How casinos make money (and their one weakness)".
// Math: American roulette, 38 pockets, a straight-up bet pays 35 to 1 -> expected loss 2/38 = 5.26 % of every bet.
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

const Panel: React.FC<{ y?: number; w?: number; o: number; s?: number; children: React.ReactNode }> = ({ y = 96, w = 600, o, s = 1, children }) => (
  <div style={{ position: "absolute", top: y, left: (720 - w) / 2, width: w, opacity: o, transform: `scale(${s})`, transformOrigin: "50% 0%",
    background: "rgba(8,16,36,0.84)", border: "3px solid rgba(255,255,255,0.85)", borderRadius: 22, padding: "14px 24px 16px", boxShadow: "0 12px 30px rgba(0,0,0,0.45)" }}>{children}</div>
);
const Tick: React.FC<{ on: number; children: React.ReactNode }> = ({ on, children }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: on, transform: `translateX(${(1 - on) * -20}px)`, fontFamily: I, fontWeight: 800, fontSize: 30, color: "#fff", marginTop: 6 }}>
    <span style={{ display: "inline-block", width: 34, height: 34, borderRadius: 17, background: COL.green, color: "#062", textAlign: "center", lineHeight: "34px", fontSize: 24 }}>✓</span>{children}</div>
);

const Lock: React.FC<{ open: boolean; size: number }> = ({ open, size }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ verticalAlign: "middle" }}>
    <path d={open ? "M20 30 V20 C20 8 40 6 44 16" : "M20 30 V20 C20 6 44 6 44 20 V30"} fill="none" stroke="#e5e7eb" strokeWidth="7" strokeLinecap="round" />
    <rect x="12" y="28" width="40" height="30" rx="6" fill={open ? COL.green : COL.gold} stroke="#3a2a0a" strokeWidth="2" />
    <circle cx="32" cy="42" r="5" fill="#3a2a0a" />
  </svg>
);
const fmt = (v: number) => Math.round(v).toLocaleString("en-US");

export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  const els: React.ReactNode[] = [];
  const END = BT.end / 30;
  // ---- the promise: a locked badge stays up until the reveal
  { const a = b("stay"), o = vis(t, a, b("time") + 0.05, 0.25); if (o > 0) els.push(<div key="lock" style={{ position: "absolute", top: 30, left: 0, right: 0, textAlign: "center", opacity: o,
      transform: `scale(${pop(t, a)})` }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: I, fontWeight: 800, fontSize: 22, color: "#fff", background: "rgba(10,10,20,0.78)", border: `2px solid ${COL.gold}`, borderRadius: 30, padding: "4px 16px 4px 8px" }}>
        <Lock open={false} size={34} />THE CASINO'S WEAKNESS: <span style={{ color: COL.gold }}>END OF VIDEO</span></div></div>); }
  // ---- hook
  { const o = vis(t, 0.1, b("max") - 0.1); if (o > 0) els.push(<Top key="title" y={96} o={o} s={pop(t, 0.1)}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,rgba(91,47,122,0.95),rgba(45,26,62,0.95))", border: "4px solid #ffd76a", borderRadius: 22, padding: "10px 26px 12px" }}>
        <Head size={50}>HOW CASINOS REALLY</Head><Head size={76} color={COL.gold} glow="rgba(255,200,61,0.6)">MAKE MONEY 🎰</Head></div>
      {t > b("weak") + 0.4 && <div style={{ marginTop: 14, transform: `scale(${pop(t, b("weak") + 0.4)})` }}><Chip border={COL.red} bg="rgba(127,29,29,0.9)" size={32}>…and their ONE weakness</Chip></div>}
    </Top>); }
  // ---- Max and the wheel
  { const a = b("max"), o = vis(t, a, b("pockets") - 0.1); if (o > 0) els.push(<Top key="max" y={100} o={o} s={pop(t, a)}><Head size={76} color={COL.gold}>MEET MAX</Head>
      {t > b("roulette") && <div style={{ marginTop: 10, transform: `scale(${pop(t, b("roulette"))})` }}><Chip border={COL.green} size={30}>Tonight: ROULETTE</Chip></div>}</Top>); }
  { const a = b("pockets"), o = vis(t, a, b("bet") - 0.1); if (o > 0) els.push(<Panel key="wheel" o={o} s={pop(t, a)} y={96} w={560}>
      <div style={{ textAlign: "center" }}><Head size={36}>AMERICAN ROULETTE</Head><Head size={84} color={COL.gold}>38 POCKETS</Head>
        {t > b("zeros") && <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 8 }}>
          {[["1 – 36", "rgba(150,20,30,0.95)", b("zeros")], ["0", "rgba(20,120,60,0.95)", b("zeros") + 0.75], ["00", "rgba(20,120,60,0.95)", b("zeros") + 1.15]].map(([l, bg, at], k) =>
            t > (at as number) && <div key={k} style={{ transform: `scale(${pop(t, at as number)})` }}><Chip bg={bg as string} border="#fff" size={34}>{l as string}</Chip></div>)}
        </div>}</div></Panel>); }
  // ---- the $38 bet
  { const a = b("bet"), o = vis(t, a, b("edge") - 0.1); if (o > 0) els.push(<Card key="bet" t={t} o={o} s={pop(t, a)} y={96} w={560} title="$1 ON EVERY NUMBER" rows={[
      { at: b("t38"), label: "You bet", value: "$38", color: "#fff" },
      { at: b("pays"), label: "Winner pays 35 to 1", value: "+$35", color: COL.green },
      { at: b("back36"), label: "You get back ($35 + your $1)", value: "$36", color: COL.green },
      { at: b("keeps"), label: "Casino keeps", value: "$2", color: COL.gold, strong: true, rule: true }]} />); }
  { const a = b("every"), o = vis(t, a, b("edge") - 0.1); if (o > 0) els.push(<div key="every" style={{ position: "absolute", top: 520, left: 0, right: 0, textAlign: "center", opacity: o, transform: `scale(${pop(t, a)})` }}>
      <Chip border={COL.gold} bg="rgba(127,29,29,0.92)" size={40}>EVERY SPIN 🔁</Chip></div>); }
  // ---- house edge
  { const a = b("edge"), o = vis(t, a, b("room") - 0.1); if (o > 0) els.push(<Top key="edge" y={96} o={o} s={pop(t, a)}>
      <Head size={92} color={COL.gold} glow="rgba(255,200,61,0.6)">HOUSE EDGE</Head>
      <div style={{ marginTop: 8 }}><Chip border={COL.gold} size={30}>$2 ÷ $38 ≈ 5.3% of every bet</Chip></div>
      {t > b("slots") - 0.1 && <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
        {[["🎰 SLOTS", 0], ["🃏 BLACKJACK", 0.45], ["🎲 CRAPS", 0.9]].map(([l, d], k) => t > b("slots") + (d as number) &&
          <div key={k} style={{ transform: `scale(${pop(t, b("slots") + (d as number))})` }}><Chip border={COL.red} size={26}>{l as string}</Chip></div>)}</div>}
      {t > b("payouts") && <div style={{ marginTop: 12, transform: `scale(${pop(t, b("payouts"))})` }}><Chip border={COL.green} bg="rgba(6,78,59,0.92)" size={28}>Each one: an edge built into the payouts</Chip></div>}
    </Top>); }
  // ---- the room
  { const a = b("room"), o = vis(t, a, b("night") - 0.1); if (o > 0) els.push(<Panel key="room" o={o} s={pop(t, a)} y={96} w={500}>
      <Head size={44}>THE ROOM HELPS</Head>
      <Tick on={easeOut(ramp(t, b("chips"), b("chips") + 0.3))}>Chips, not cash</Tick>
      <Tick on={easeOut(ramp(t, b("drinks"), b("drinks") + 0.3))}>Free drinks keep you seated</Tick>
      <Tick on={easeOut(ramp(t, b("clocks"), b("clocks") + 0.3))}>Few clocks (in many casinos)</Tick>
    </Panel>); }
  // ---- one night vs millions of bets
  { const a = b("night"), o = vis(t, a, b("what") - 0.1); if (o > 0) {
      const m = b("millions"), u = smooth(ramp(t, m + 0.2, b("what") - 0.5));
      els.push(<Top key="night" y={96} o={o} s={pop(t, a)}>
        <Chip border={COL.green} bg="rgba(6,78,59,0.92)" size={34}>ONE NIGHT: anyone can win 🍀</Chip>
        {t > m && <div style={{ marginTop: 14, transform: `scale(${pop(t, m)})`, width: 580, background: "rgba(8,16,36,0.86)", border: "3px solid rgba(255,255,255,0.85)", borderRadius: 22, padding: "12px 22px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><span style={{ fontFamily: I, fontWeight: 800, fontSize: 28, color: "#e5e7eb" }}>$1 bets</span>
            <span style={{ fontFamily: F, fontSize: 52, color: "#fff" }}>{fmt(1_000_000 * u)}</span></div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", borderTop: "2px solid rgba(255,255,255,0.4)", marginTop: 6, paddingTop: 6 }}>
            <span style={{ fontFamily: I, fontWeight: 800, fontSize: 28, color: "#e5e7eb" }}>House keeps (expected)</span>
            <span style={{ fontFamily: F, fontSize: 52, color: COL.gold }}>≈ ${fmt(52_632 * u)}</span></div></div>}
        {t > b("math") && <div style={{ marginTop: 12, transform: `scale(${pop(t, b("math"))})` }}><Chip border={COL.gold} bg="rgba(127,29,29,0.92)" size={34}>The MATH always wins</Chip></div>}
      </Top>);
    } }
  // ---- the reveal
  { const a = b("what"), o = vis(t, a, b("time") - 0.02, 0.12); if (o > 0) {
      const dots = ".".repeat(1 + (Math.floor((t - a) * 3) % 3));
      els.push(<Top key="what" y={110} o={o} s={pop(t, a)}><Head size={70}>SO WHAT'S THE</Head><Head size={96} color={COL.red} glow="rgba(255,64,87,0.6)">WEAKNESS{dots}</Head></Top>);
    } }
  { const a = b("time"), o = vis(t, a, b("walks") - 0.1); if (o > 0) els.push(<Top key="time" y={88} o={o} s={pop(t, a)}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: I, fontWeight: 800, fontSize: 24, color: "#fff", background: "rgba(6,78,59,0.9)", border: `2px solid ${COL.green}`, borderRadius: 30, padding: "4px 16px 4px 8px" }}>
        <Lock open size={36} />UNLOCKED</div>
      <Head size={170} color={COL.gold} glow="rgba(255,200,61,0.85)">TIME ⏱</Head>
      {t > b("keep") && <div style={{ transform: `scale(${pop(t, b("keep"))})` }}><Chip border={COL.gold} size={30}>The edge needs you to KEEP PLAYING</Chip></div>}
      {t > b("up") && <div style={{ marginTop: 10, transform: `scale(${pop(t, b("up"))})` }}><Chip border={COL.green} bg="rgba(6,78,59,0.92)" size={34}>Max: +$50</Chip></div>}
    </Top>); }
  { const a = b("walks"), o = vis(t, a, END + 0.05); if (o > 0) els.push(<Top key="walk" y={96} o={o} s={pop(t, a)}>
      <Head size={96} color={COL.green} glow="rgba(43,217,107,0.6)">HE WALKS 🚪</Head>
      {t > b("house") && <div style={{ marginTop: 10, transform: `scale(${pop(t, b("house"))})` }}><Chip border={COL.gold} size={30}>Money that LEFT can't be won back</Chip></div>}
    </Top>); }
  { const a = END + 0.1, o = vis(t, a, 61, 0.3); if (o > 0) els.push(<div key="fin" style={{ position: "absolute", top: 120, left: 30, right: 30, textAlign: "center", opacity: o, transform: `scale(${pop(t, a)})` }}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,rgba(91,47,122,0.95),rgba(45,26,62,0.95))", border: "5px solid #ffd76a", borderRadius: 24, padding: "14px 30px" }}>
        <Head size={66}>THE EDGE NEEDS TIME.</Head><Head size={80} color={COL.gold} glow="rgba(255,200,61,0.7)">KNOW WHEN TO WALK.</Head></div></div>); }
  // ---- small print
  els.push(<div key="src" style={{ position: "absolute", bottom: 46, left: 20, right: 20, textAlign: "center", fontFamily: I, fontWeight: 400, fontSize: 16, lineHeight: 1.3, color: "rgba(255,255,255,0.85)", textShadow: "0 2px 6px rgba(0,0,0,0.95)" }}>
    Math: American roulette (38 pockets, 35-to-1 payout) · Every bet keeps its house edge; walking away doesn't change the odds · Gambling is risky; 18+/21+ where legal · Not financial advice</div>);

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
