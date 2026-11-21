// Captions for "Sneaky Business Tricks #2: why fancy menus drop the $ sign": one word at a time in the middle of the frame, keywords in
// yellow with a small pop, plus a line of small print. Everything else lives on signs inside the 3D world.
import React from "react";
import WORDS from "./words.json";

type Word = { start: number; end: number; text: string; emph: boolean };
const LIST = WORDS as Word[];
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const backOut = (u: number) => { u = clamp(u); const c = 2.2; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };
const F = "Anton, Impact, sans-serif", I = "Inter, Arial, sans-serif";
const LEAD = 0.03;   // show the word a frame before it is heard

export const Overlay: React.FC<{ t: number }> = ({ t }) => {
  // the current word: the last one whose start has passed, held until the next starts (or 0.45 s after its end)
  let cur: Word | null = null;
  for (let i = 0; i < LIST.length; i++) {
    const w = LIST[i], next = LIST[i + 1];
    const until = next ? Math.min(next.start, w.end + 0.45) : w.end + 0.6;
    if (t >= w.start - LEAD && t < until - LEAD) { cur = w; break; }
  }
  const age = cur ? t - (cur.start - LEAD) : 0;
  const s = cur ? (cur.emph ? 0.6 + 0.4 * backOut(age / 0.16) : 0.85 + 0.15 * backOut(age / 0.12)) : 1;
  const long = cur && cur.text.length > 9;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {cur && (
        <div style={{ position: "absolute", top: 735, left: 0, right: 0, textAlign: "center", transform: `scale(${s})`, transformOrigin: "50% 50%" }}>
          <span style={{ fontFamily: F, fontSize: long ? 58 : cur.emph ? 76 : 66, letterSpacing: 1.5, color: cur.emph ? "#ffd23f" : "#ffffff",
            WebkitTextStroke: "7px #141018", paintOrder: "stroke fill", textShadow: "0 5px 0 rgba(0,0,0,0.45), 0 0 18px rgba(0,0,0,0.35)" }}>{cur.text}</span>
        </div>
      )}
      <div style={{ position: "absolute", bottom: 20, left: 30, right: 30, textAlign: "center", fontFamily: I, fontWeight: 400, fontSize: 12.5, lineHeight: 1.35,
        color: "rgba(255,255,255,0.82)", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}>
        Made-up places · study: Yang, Kimes &amp; Sessarego, Cornell (2009), ~200 diners at one restaurant · results may vary
      </div>
    </div>
  );
};
