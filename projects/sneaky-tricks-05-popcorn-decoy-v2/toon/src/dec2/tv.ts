// Part 5 (detailed style): what Tony's dining-room TV shows. The classroom magazine test (Ariely, MIT students,
// an Economist offer): two options -> 68% web only / 32% print + web; add the print-only decoy at the same price ->
// 16% / 0% / 84%. Then the caveats (one small classroom test; decoys don't always work) and the example popcorn board.
import { ANTON, INTER, canvas, rr, text } from "../look/kit";
import { boardTex } from "./street";

export type TvState =
  | { kind: "title" }
  | { kind: "mag"; three: number; hi: number; u: number; nobody: boolean }
  | { kind: "small" }
  | { kind: "dont" }
  | { kind: "example" };

const W = 1600, H = 900;
const bg = (g: CanvasRenderingContext2D, title: string, sub: string) => {
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#14213d"); gr.addColorStop(1, "#0b1224"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  g.strokeStyle = "rgba(120,170,255,0.08)"; g.lineWidth = 2; for (let x = 0; x < W; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
  g.fillStyle = "#2f6fd6"; g.fillRect(0, 0, W, 120); text(g, title, W / 2, 64, 84, "#ffffff");
  if (sub) text(g, sub, W / 2, 168, 44, "#9fc0ff", INTER);
};
const card = (g: CanvasRenderingContext2D, x: number, y: number, w: number, label: string, price: string, hi: boolean, alpha = 1, pct = -1, nobody = false) => {
  g.save(); g.globalAlpha = alpha;
  g.fillStyle = hi ? "#ffc928" : "#f6f3ea"; rr(g, x, y, w, 250, 26); g.fill();
  g.strokeStyle = hi ? "#ffffff" : "#c8c2b4"; g.lineWidth = 8; rr(g, x, y, w, 250, 26); g.stroke();
  text(g, label, x + w / 2, y + 70, label.length > 10 ? 52 : 60, "#1b1b22");
  text(g, price, x + w / 2, y + 170, 110, label === "WEB ONLY" ? "#1f9a4a" : "#d8262e");
  if (pct >= 0) {
    // result bar under the card
    const bh = 300 * (pct / 100);
    g.fillStyle = "rgba(255,255,255,0.12)"; rr(g, x + w / 2 - 70, y + 290, 140, 300, 16); g.fill();
    g.fillStyle = pct > 50 ? "#5fe37a" : "#ff6a6a"; rr(g, x + w / 2 - 70, y + 590 - bh, 140, Math.max(6, bh), 16); g.fill();
    text(g, `${Math.round(pct)}%`, x + w / 2, y + 560 - bh - 30, 74, "#ffffff");
  }
  if (nobody) { g.save(); g.translate(x + w / 2, y + 125); g.rotate(-0.2); g.strokeStyle = "#ff3a4a"; g.lineWidth = 12; rr(g, -150, -55, 300, 110, 16); g.stroke(); text(g, "NOBODY", 0, 4, 76, "#ff3a4a"); g.restore(); }
  g.restore();
};
export const tvTex = (s: TvState) => canvas(W, H, (g) => {
  if (s.kind === "title") {
    bg(g, "A FAMOUS CLASSROOM TEST", "");
    text(g, "MAGAZINE DEAL", W / 2, 420, 170, "#ffc928");
    text(g, "web only  vs  print + web", W / 2, 590, 64, "#e8eef8", INTER);
    // little classroom icon: desks + students
    for (let k = 0; k < 6; k++) { const x = 380 + k * 170; g.fillStyle = "#2f6fd6"; g.fillRect(x - 50, 760, 100, 18); g.fillStyle = ["#1aa3a6", "#7a4fb0", "#e08a18", "#d8262e", "#1f9a4a", "#2b5fb4"][k]; g.beginPath(); g.ellipse(x, 730, 28, 34, 0, 0, 7); g.fill(); g.fillStyle = "#f1c7a2"; g.beginPath(); g.arc(x, 680, 26, 0, 7); g.fill(); }
    return;
  }
  if (s.kind === "mag") {
    bg(g, "WHICH DEAL WOULD YOU PICK?", s.three > 0 ? "same students, one new option" : "a classroom of students");
    const three = s.three;
    const w = 400, gap = 70;
    if (three <= 0) {
      const x0 = W / 2 - w - gap / 2;
      card(g, x0, 230, w, "WEB ONLY", "$60", s.hi === 0, 1, s.u > 0 ? 68 * s.u : -1);
      card(g, x0 + w + gap, 230, w, "PRINT + WEB", "$125", s.hi === 2, 1, s.u > 0 ? 32 * s.u : -1);
    } else {
      const xs = [100, 600, 1100].map((x, i) => (i === 0 ? x : x));
      const slide = Math.min(1, three);
      card(g, xs[0], 230, w, "WEB ONLY", "$60", s.hi === 0, 1, s.u > 0 ? 68 + (16 - 68) * s.u : -1);
      card(g, xs[1], 230 + (1 - slide) * 80, w, "PRINT ONLY", "$125", s.hi === 1, slide, s.u > 0 ? 0 : -1, s.nobody);
      card(g, xs[2], 230, w, "PRINT + WEB", "$125", s.hi === 2, 1, s.u > 0 ? 32 + (84 - 32) * s.u : -1);
      if (slide < 1) { g.save(); g.globalAlpha = 1 - slide; text(g, "NEW!", xs[1] + w / 2, 200, 80, "#ffc928"); g.restore(); }
    }
    return;
  }
  if (s.kind === "small") {
    bg(g, "HOLD ON", "");
    g.fillStyle = "#f6f3ea"; rr(g, 300, 250, 1000, 420, 30); g.fill();
    text(g, "SMALL TEST", W / 2, 380, 150, "#1b1b22");
    text(g, "1 CLASSROOM", W / 2, 540, 96, "#d8262e");
    return;
  }
  if (s.kind === "dont") {
    bg(g, "LATER STUDIES", "");
    text(g, "DECOYS DON'T", W / 2, 400, 170, "#ffffff");
    text(g, "ALWAYS WORK", W / 2, 590, 170, "#ffc928");
    return;
  }
  // example prices: the popcorn board, small
  const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#14213d"); gr.addColorStop(1, "#0b1224"); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const b = boardTex({ med: 1, hi: -1, steal: false, only1: false, notSale: false, decoy: 0, example: true }).image as HTMLCanvasElement;
  g.drawImage(b, W / 2 - 300, 40, 600, 800);
  text(g, "JUST AN EXAMPLE", 260, 450, 64, "#9fc0ff", ANTON);
  text(g, "JUST AN EXAMPLE", W - 260, 450, 64, "#9fc0ff", ANTON);
});
