// On-screen titles, cards, captions (yellow keywords) and the final card for "From empty shop to owner".
// Facts: franchise royalties are commonly ~4-8 % of gross sales (they vary by brand); US BLS Business Employment
// Dynamics: roughly half of new establishments are gone within 5 years; the FTC Franchise Rule requires the Franchise
// Disclosure Document at least 14 days before signing or paying. The $10 sale / $1 profit is an illustrative example.
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
  { const a = b("stay"), o = vis(t, a, b("bakery") + 0.05, 0.25); if (o > 0) els.push(<div key="lock" style={{ position: "absolute", top: 30, left: 0, right: 0, textAlign: "center", opacity: o,
      transform: `scale(${pop(t, a)})` }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: I, fontWeight: 800, fontSize: 22, color: "#fff", background: "rgba(10,10,20,0.78)", border: `2px solid ${COL.gold}`, borderRadius: 30, padding: "4px 16px 4px 8px" }}>
        <Lock open={false} size={34} />WHAT THIS SHOP BECOMES: <span style={{ color: COL.gold }}>END OF VIDEO</span></div></div>); }
  // ---- hook
  { const o = vis(t, 0.1, b("rosa") - 0.1); if (o > 0) els.push(<Top key="title" y={96} o={o} s={pop(t, 0.1)}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,rgba(232,96,138,0.95),rgba(122,31,64,0.95))", border: "4px solid #ffd76a", borderRadius: 22, padding: "10px 26px 12px" }}>
        <Head size={50}>HOW ONE SMALL SHOP</Head><Head size={70} color={COL.gold} glow="rgba(255,200,61,0.6)">CHANGES A LIFE 🔑</Head></div>
      {t > b("empty") + 1.0 && <div style={{ marginTop: 14, transform: `scale(${pop(t, b("empty") + 1.0)})` }}><Chip border={COL.gold} size={30}>Right now it's EMPTY…</Chip></div>}
    </Top>); }
  // ---- Rosa's 9-to-5
  { const a = b("rosa"), o = vis(t, a, b("owning") - 0.1); if (o > 0) els.push(<Top key="rosa" y={100} o={o} s={pop(t, a)}><Head size={76} color={COL.gold}>MEET ROSA</Head>
      {t > b("works") && <div style={{ marginTop: 10, transform: `scale(${pop(t, b("works"))})` }}><Chip border={COL.cyan} size={30}>Office job · 9 to 5 ⏰</Chip></div>}
      {t > b("someone") && <div style={{ marginTop: 10, transform: `scale(${pop(t, b("someone"))})` }}><Chip border={COL.red} bg="rgba(127,29,29,0.92)" size={28}>Her hours → SOMEONE ELSE'S profit</Chip></div>}
    </Top>); }
  // ---- owning flips it
  { const a = b("owning"), o = vis(t, a, b("franchise") - 0.1); if (o > 0) els.push(<Top key="own" y={110} o={o} s={pop(t, a)}>
      <Head size={56}>OWNING A BUSINESS</Head><Head size={96} color={COL.green} glow="rgba(43,217,107,0.6)">FLIPS IT 🔄</Head></Top>); }
  // ---- two paths
  { const a = b("franchise"), o = vis(t, a, b("math") - 0.1); if (o > 0) {
      const c2 = on(t, b("own"));
      els.push(<Panel key="paths" o={o} s={pop(t, a)} y={90} w={668}>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <Head size={30} color={COL.gold}>PATH 1</Head><Head size={40}>FRANCHISE 🏪</Head>
            <Tick on={on(t, b("brand"))} size={22}>Proven brand</Tick>
            <Tick on={on(t, b("brand") + 0.9)} size={22}>Playbook</Tick>
            <Tick on={on(t, b("fee"))} good={false} size={22}>Fee up front</Tick>
            <Tick on={on(t, b("royal"))} good={false} size={22}>Royalties ~4–8% of sales</Tick>
          </div>
          <div style={{ width: 3, background: "rgba(255,255,255,0.4)", opacity: c2 }} />
          <div style={{ flex: 1, opacity: c2 }}>
            <Head size={30} color={COL.gold}>PATH 2</Head><Head size={40}>OWN IDEA 💡</Head>
            <Tick on={on(t, b("cheaper"))} size={22}>Cheaper to start</Tick>
            <Tick on={on(t, b("all"))} good={false} size={22}>You build it all</Tick>
          </div>
        </div></Panel>);
    } }
  // ---- the math
  { const a = b("math"), o = vis(t, a, b("team") - 0.1); if (o > 0) els.push(<Card key="math" t={t} o={o} s={pop(t, a)} y={96} w={560} title="THE MATH 🧮" foot="example numbers" rows={[
      { at: b("sales"), label: "Sales (one order)", value: "$10", color: COL.green },
      { at: b("costs"), label: "Costs: supplies, rent, staff", value: "−$9", color: COL.red },
      { at: b("profit"), label: "Profit", value: "$1", color: COL.gold, strong: true, rule: true }]} />); }
  { const a = b("team"), o = vis(t, a, b("noteasy") - 0.1); if (o > 0) els.push(<Top key="team" y={100} o={o} s={pop(t, a)}>
      <Head size={88} color={COL.gold} glow="rgba(255,200,61,0.6)">TRAIN A TEAM</Head>
      {t > b("earns") && <div style={{ marginTop: 10, transform: `scale(${pop(t, b("earns"))})` }}><Chip border={COL.green} bg="rgba(6,78,59,0.92)" size={30}>The shop earns while you're away 💪</Chip></div>}
    </Top>); }
  // ---- not easy
  { const a = b("noteasy"), o = vis(t, a, b("small") - 0.1); if (o > 0) els.push(<Top key="hard" y={96} o={o} s={pop(t, a)}>
      <Head size={84} color={COL.red} glow="rgba(255,64,87,0.6)">IT'S NOT EASY</Head>
      {t > b("half") && <div style={{ marginTop: 12, transform: `scale(${pop(t, b("half"))})` }}><Chip border={COL.red} size={30}>~1 in 2 new businesses close within 5 years</Chip></div>}
    </Top>); }
  { const a = b("small"), o = vis(t, a, b("become") - 0.1); if (o > 0) els.push(<Panel key="smart" o={o} s={pop(t, a)} y={96} w={460}>
      <Head size={44}>THE SMART START</Head>
      <Tick on={on(t, b("small"))}>Start small</Tick>
      <Tick on={on(t, b("test"))}>Test the idea</Tick>
      <Tick on={on(t, b("read"))}>Read every contract</Tick>
    </Panel>); }
  // ---- the reveal
  { const a = b("become"), o = vis(t, a, b("bakery") - 0.02, 0.12); if (o > 0) {
      const dots = ".".repeat(1 + (Math.floor((t - a) * 3) % 3));
      els.push(<Top key="what" y={110} o={o} s={pop(t, a)}><Head size={64}>SO WHAT DID IT</Head><Head size={100} color={COL.pink} glow="rgba(255,122,168,0.6)">BECOME{dots}</Head></Top>);
    } }
  { const a = b("bakery"), o = vis(t, a, b("free") - 0.1); if (o > 0) els.push(<Top key="reveal" y={86} o={o} s={pop(t, a)}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontFamily: I, fontWeight: 800, fontSize: 24, color: "#fff", background: "rgba(6,78,59,0.9)", border: `2px solid ${COL.green}`, borderRadius: 30, padding: "4px 16px 4px 8px" }}>
        <Lock open size={36} />UNLOCKED</div>
      <div style={{ whiteSpace: "nowrap" }}><Head size={92} color={COL.gold} glow="rgba(255,200,61,0.85)">ROSA'S BAKERY 🥐</Head></div>
      {t > b("manager") && <div style={{ marginTop: 6, transform: `scale(${pop(t, b("manager"))})` }}><Chip border={COL.gold} size={28}>1 year later: her MANAGER runs it 🔑</Chip></div>}
      {t > b("shop2") && <div style={{ marginTop: 10, transform: `scale(${pop(t, b("shop2"))})` }}><Chip border={COL.green} bg="rgba(6,78,59,0.92)" size={36}>+ SHOP #2 🎉</Chip></div>}
    </Top>); }
  // ---- your step
  { const a = b("free"), o = vis(t, a, END + 0.05); if (o > 0) els.push(<Panel key="step" o={o} s={pop(t, a)} y={96} w={560}>
      <div style={{ textAlign: "center" }}><Head size={34} color={COL.green}>YOUR FIRST STEP (FREE)</Head>
        {t > b("problems") && <div style={{ fontFamily: I, fontWeight: 800, fontSize: 30, color: "#fff", marginTop: 6 }}>Write down <span style={{ color: COL.gold }}>3 problems</span><br />people pay to fix ✍️</div>}</div></Panel>); }
  { const a = END + 0.1, o = vis(t, a, 61, 0.3); if (o > 0) els.push(<div key="fin" style={{ position: "absolute", top: 120, left: 30, right: 30, textAlign: "center", opacity: o, transform: `scale(${pop(t, a)})` }}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,rgba(232,96,138,0.95),rgba(122,31,64,0.95))", border: "5px solid #ffd76a", borderRadius: 24, padding: "14px 30px" }}>
        <Head size={76}>START SMALL.</Head><Head size={84} color={COL.gold} glow="rgba(255,200,61,0.7)">START TONIGHT.</Head></div></div>); }
  // ---- small print
  els.push(<div key="src" style={{ position: "absolute", bottom: 40, left: 20, right: 20, textAlign: "center", fontFamily: I, fontWeight: 400, fontSize: 15, lineHeight: 1.3, color: "rgba(255,255,255,0.85)", textShadow: "0 2px 6px rgba(0,0,0,0.95)" }}>
    Illustrative story & numbers · Royalties vary by brand (often ~4–8% of sales) · ~half of new US businesses close within 5 yrs (BLS) · US franchises: you get the disclosure document (FDD) 14+ days before signing (FTC) · Not financial advice</div>);

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
