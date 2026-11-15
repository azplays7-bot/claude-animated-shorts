// On-screen text, story markers, the name reveal, captions (yellow keywords) and black frames for "The Boy Nobody Believed In".
import React from "react";
import { AbsoluteFill } from "remotion";
import { CHUNKS, COL, E, S, SCN, backOut, clamp, easeIn, easeOut, lerp, ramp, smooth } from "./timeline";
import { BLACK_IN, BLACK_OUT, M_CROWD, M_CUP, M_SHOT, SILENCE_AT, ERUPT_AT } from "./Scenes";

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
  if (c.text.includes("CRISTIANO")) return null;
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
  const marker = (key: string, txt: string, a: number, b: number) => { const o = vis(t, a, b); if (o > 0) els.push(
    <div key={key} style={{ position: "absolute", top: 96, left: 30, opacity: o, fontFamily: I, fontWeight: 800, fontSize: 24, letterSpacing: 3, color: "rgba(255,255,255,0.9)", textShadow: "0 2px 8px rgba(0,0,0,0.9)" }}>{txt}</div>); };
  const gold = "linear-gradient(180deg,#fff3c4 0%,#ffd166 45%,#b8860b 100%)";
  const goldText = (size: number): React.CSSProperties => ({ fontFamily: F, fontSize: size, lineHeight: 1.0, letterSpacing: 2, background: gold, WebkitBackgroundClip: "text", color: "transparent", filter: "drop-shadow(0 4px 0 rgba(0,0,0,0.6)) drop-shadow(0 0 24px rgba(255,200,80,0.55))" });
  // ---- 1
  marker("m1", "MADEIRA, PORTUGAL · 1990s", 1.2, 6.5);
  { const at = S(2) - 0.2, o = vis(t, at, BLACK_OUT - 0.05); if (o > 0) els.push(<Top key="guess" y={140} o={o} s={pop(t, at)}><Head size={64}>CAN YOU GUESS</Head><Head size={64}>WHO THIS BOY</Head><div style={goldText(84)}>BECAME?</div></Top>); }
  // ---- 2-4 story markers
  marker("m2", "AGE 8 · FUNCHAL, MADEIRA", SCN[1][0] + 0.2, SCN[1][1] - 0.1);
  marker("m3", "AGE 12 · MADEIRA → LISBON · ~600 MILES", SCN[2][0] + 0.2, SCN[2][1] - 0.1);
  marker("m4", "AGE 15 · A HEART CONDITION", SCN[3][0] + 0.2, SCN[3][1] - 0.1);
  { const at = S(12) - 0.4, o = vis(t, at, SCN[3][1] - 0.05); if (o > 0) els.push(<Top key="nogiveup" y={150} o={o} s={pop(t, at)}><Head size={72}>HE REFUSED</Head><div style={goldText(92)}>TO GIVE UP.</div></Top>); }
  // ---- 5 the rise
  { const o = vis(t, M_SHOT - 0.2, M_CUP + 3.5); if (o > 0) els.push(<div key="stats" style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, opacity: o }}>
      {[["5× BALLON D'OR", M_SHOT - 0.2], ["5× CHAMPIONS LEAGUE", M_CROWD - 0.3]].map(([x, at]) => <div key={x as string} style={{ opacity: ramp(t, at as number, (at as number) + 0.2), transform: `scale(${pop(t, at as number)})` }}><div style={goldText(70)}>{x}</div></div>)}</div>); }
  // ---- 6 the reveal
  { const o = vis(t, ERUPT_AT, 61, 0.15); if (o > 0) {
    const s = 1.25 - 0.25 * easeOut(ramp(t, ERUPT_AT, ERUPT_AT + 0.6));
    els.push(<div key="name" style={{ position: "absolute", top: 230, left: 0, right: 0, textAlign: "center", opacity: o, transform: `scale(${s})` }}>
      <div style={goldText(112)}>CRISTIANO</div><div style={goldText(112)}>RONALDO</div></div>); } }
  { const at = S(17), o = vis(t, at, 61); if (o > 0) els.push(<div key="final" style={{ position: "absolute", top: 520, left: 40, right: 40, textAlign: "center", opacity: o }}>
      <Head size={40}>THE WORLD SAW A POOR BOY.</Head><div style={{ marginTop: 6 }}><div style={goldText(46)}>HE SAW A FUTURE LEGEND.</div></div></div>); }
  { const o = vis(t, S(17), 61); if (o > 0) els.push(<div key="note" style={{ position: "absolute", bottom: 150, left: 30, right: 30, textAlign: "center", opacity: 0.85 * o, fontFamily: I, fontSize: 16, color: "#cbd5e1" }}>Based on his publicly reported life story. Some scenes are dramatized.</div>); }

  // black frames: the heartbeat opening, the hard cut at the end of scene 1, the fade at the very end
  const black = Math.max(t < BLACK_IN ? 1 : 1 - smooth(ramp(t, BLACK_IN, BLACK_IN + 0.25)), t >= BLACK_OUT && t < SCN[1][0] + 0.05 ? 1 : 0, smooth(ramp(t, 59.6, 59.98)));
  // a short dip to dark when the music stops, before the turn
  const hush = t >= SILENCE_AT && t < ERUPT_AT ? 0.25 * Math.sin(Math.PI * ramp(t, SILENCE_AT, ERUPT_AT)) : 0;
  const flash = t >= ERUPT_AT && t < ERUPT_AT + 0.25 ? 0.6 * (1 - (t - ERUPT_AT) / 0.25) : 0;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.55) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0) 24%, rgba(0,0,0,0) 64%, rgba(0,0,0,0.45) 100%)" }} />
      {els}
      <Caption t={t} />
      {hush > 0 && <AbsoluteFill style={{ background: "#000", opacity: hush }} />}
      {flash > 0 && <AbsoluteFill style={{ background: "#fff8e0", opacity: flash }} />}
      {black > 0 && <AbsoluteFill style={{ background: "#000", opacity: black }} />}
    </AbsoluteFill>
  );
};
