// On-screen titles, fact cards, claim counter, captions (yellow keywords) and cut flashes for the Kimchi video.
import React from "react";
import { AbsoluteFill } from "remotion";
import { CHUNKS, COL, E, S, SCN, backOut, clamp, easeIn, easeOut, lerp, ramp, smooth } from "./timeline";
import { CRASH_AT, GRAPH_AT, STAT_AT, SURGE_AT, WATCH_AT } from "./Scenes";

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
  const note = (key: string, txt: string, o: number, bottom = 210) => els.push(<div key={key} style={{ position: "absolute", bottom, left: 30, right: 30, textAlign: "center", opacity: o, fontFamily: I, fontSize: 19, color: "rgba(255,255,255,0.92)", textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}>{txt}</div>);
  // ---- 1: hook title, then the name tag
  { const o = vis(t, 0.15, 3.3); if (o > 0) els.push(<Top key="title" y={110} o={o} s={pop(t, 0.15)}><Head size={60}>THE CRYPTO TRADER WHO</Head><Head size={84} color={COL.gold} glow="rgba(255,200,61,0.6)">SHOCKED THE INTERNET</Head></Top>); }
  { const at = S(1) + 2.0, o = vis(t, at, 9.9); if (o > 0) els.push(<Top key="name" y={120} o={o} s={pop(t, at)}>
      <div style={{ background: "rgba(127,29,29,0.9)", border: "4px solid #fff", borderRadius: 18, padding: "6px 26px" }}><Head size={96}>KIMCHI</Head></div>
      <div style={{ marginTop: 10 }}><Chip>Pseudonymous Solana memecoin trader</Chip></div></Top>); }
  // ---- 2: memecoins + the hypothetical $100
  { const o = vis(t, 10.2, GRAPH_AT); if (o > 0) els.push(<Top key="meme" o={o}><Term term="MEMECOIN" o={o} color={COL.gold}>a crypto coin driven by internet hype and jokes, not by a business</Term></Top>); }
  { const o = vis(t, GRAPH_AT + 0.1, 19.95); if (o > 0) {
    const up = easeOut(ramp(t, GRAPH_AT + 0.3, CRASH_AT - 0.2)), down = easeIn(ramp(t, CRASH_AT + 0.6, CRASH_AT + 1.4));
    const v = down > 0 ? 500 - 420 * down : 100 + 400 * up;
    els.push(<Top key="hyp" y={96} o={o}><Head size={46}>A HYPOTHETICAL $100 BET</Head>
      <div style={{ marginTop: 8, transform: `scale(${1 + 0.06 * Math.sin(t * 10) * (down > 0 && down < 1 ? 1 : 0)})` }}><Head size={110} color={down > 0 ? COL.red : COL.green} glow={down > 0 ? "rgba(255,64,87,0.6)" : "rgba(43,217,107,0.6)"}>${Math.round(v)}</Head></div>
      {down >= 1 && <Chip bg="rgba(127,29,29,0.88)" border={COL.red}>−84% FROM THE TOP</Chip>}</Top>);
    note("hypn", "Example numbers, not Kimchi's trades.", o); } }
  // ---- 3: the launch
  { const o = vis(t, 20.15, SURGE_AT); if (o > 0) els.push(<div key="brk" style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", opacity: o, transform: `scale(${pop(t, 20.15)})` }}>
      <div style={{ display: "inline-block", background: "#dc2626", padding: "6px 22px", borderRadius: 10, fontFamily: F, fontSize: 56, color: "#fff", letterSpacing: 3, opacity: 0.75 + 0.25 * Math.sin(t * 9) }}>● BREAKING</div></div>); }
  { const o = vis(t, SURGE_AT + 0.2, 29.95); if (o > 0) els.push(<Top key="peak" o={o}>
      <Chip>$TRUMP launched Jan 17–18, 2025</Chip>
      <div style={{ marginTop: 10, opacity: ramp(t, SURGE_AT + 1.0, SURGE_AT + 1.3), transform: `scale(${pop(t, SURGE_AT + 1.0)})` }}><Head size={72} color={COL.green} glow="rgba(43,217,107,0.6)">PEAK ≈ $73</Head><Chip border={COL.green}>Jan 19, 2025, two days later</Chip></div></Top>); }
  // ---- 4: the claim
  { const o = vis(t, 30.15, 39.95); if (o > 0) {
    const steps = ["$100,000", "$1,000,000", "$10,000,000", "$40,000,000"];
    const k = Math.min(3, Math.floor(ramp(t, 30.4, S(8) - 0.3) * 4));
    els.push(<div key="claim" style={{ position: "absolute", top: 120, left: 0, right: 0, textAlign: "center", opacity: o }}>
      <div style={{ fontFamily: I, fontWeight: 800, fontSize: 26, color: "#bbf7d0", letterSpacing: 2 }}>REPORTED CLAIM</div>
      <div key={k} style={{ transform: `scale(${pop(t, 30.4 + k * (S(8) - 0.3 - 30.4) / 4)})` }}><Head size={k === 3 ? 112 : 92} color={k === 3 ? COL.gold : COL.green} glow={k === 3 ? "rgba(255,200,61,0.8)" : "rgba(43,217,107,0.6)"}>{steps[k]}</Head></div>
      {t > S(8) && <div style={{ marginTop: 8, transform: `scale(${pop(t, S(8))})` }}><Chip bg="rgba(127,29,29,0.9)" border={COL.red}>NOT INDEPENDENTLY VERIFIED</Chip></div>}
    </div>);
    note("cl", "Reported profit claim — not independently verified. Numbers illustrate the claim, not his real account.", o); } }
  // ---- 5: reality
  { const o = vis(t, 40.1, STAT_AT); if (o > 0) els.push(<div key="sp" style={{ position: "absolute", top: 200, left: 0, right: 0, display: "flex", opacity: o }}>
      <div style={{ flex: 1, textAlign: "center" }}><Head size={66} color={COL.green}>PROFIT</Head></div>
      <div style={{ flex: 1, textAlign: "center" }}><Head size={66} color={COL.red}>LOSS</Head></div></div>); }
  { const o = vis(t, STAT_AT + 0.1, WATCH_AT + 0.6); if (o > 0) els.push(<Top key="98" y={110} o={o} s={pop(t, STAT_AT + 0.1)}>
      <Head size={52}>$TRUMP FROM ITS PEAK</Head><Head size={150} color={COL.red} glow="rgba(255,64,87,0.7)">≈ −98%</Head><Chip>by mid-2026</Chip></Top>); }
  { const o = vis(t, WATCH_AT + 0.6, 49.95); if (o > 0) els.push(<Top key="risk" o={o} s={pop(t, WATCH_AT + 0.6)}><Head size={60} color={COL.red}>CRYPTO TRADING IS</Head><Head size={80}>EXTREMELY RISKY</Head></Top>); }
  // ---- 6: the lesson
  { const o = vis(t, 52.8, 56.0); if (o > 0) els.push(<div key="lesson" style={{ position: "absolute", top: 120, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: o }}>
      {[["RESEARCH", S(14)], ["RISK MANAGEMENT", S(14) + 0.9], ["KNOW WHEN TO WALK AWAY", S(14) + 1.9]].map(([x, at]) => <div key={x as string} style={{ opacity: ramp(t, at as number, (at as number) + 0.2), transform: `scale(${pop(t, at as number)})` }}><Chip border={COL.green}>✓ {x}</Chip></div>)}</div>); }
  { const o = vis(t, 56.0, 61); if (o > 0) els.push(<Top key="q" y={110} o={o} s={pop(t, 56.0)}><Head size={56}>WOULD YOU RISK $100</Head><Head size={56}>FOR A CHANCE AT</Head><Head size={80} color={COL.gold} glow="rgba(255,200,61,0.7)">$1,000,000?</Head></Top>); }
  { const o = vis(t, 57.8, 61); if (o > 0) els.push(<div key="cta" style={{ position: "absolute", top: 560, left: 30, right: 30, textAlign: "center", opacity: o, transform: `scale(${pop(t, 57.8)})` }}>
      <div style={{ display: "inline-block", background: "linear-gradient(180deg,#22c55e,#15803d)", border: "5px solid #fff", borderRadius: 24, padding: "12px 24px" }}>
        <Head size={44}>FOLLOW FOR MORE INCREDIBLE</Head><Head size={58} color="#fde68a">MONEY STORIES</Head></div></div>); }
  { const o = vis(t, 56.0, 61); if (o > 0) note("nfa", "Not financial advice. Kimchi's $40M claim is unverified.", o, 200); }

  const cuts = [3.0 * 0.75, 3.0, 10, GRAPH_AT, 20, SURGE_AT, 30, 40, STAT_AT, WATCH_AT, 50];
  let flash = 0;
  for (const c of cuts) if (t >= c && t < c + 0.18) flash = Math.max(flash, 1 - (t - c) / 0.18);
  const fadeIn = 1 - smooth(ramp(t, 0, 0.25));
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.45) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 62%, rgba(0,0,0,0.38) 100%)" }} />
      {els}
      <Caption t={t} />
      {flash > 0 && <AbsoluteFill style={{ background: "#fff", opacity: 0.5 * flash }} />}
      {fadeIn > 0 && <AbsoluteFill style={{ background: "#000", opacity: fadeIn }} />}
    </AbsoluteFill>
  );
};
