// Overlay beats in seconds (overlay.tsx was written against the 3D version's scene module; same names here).
import { BT, SHOTS, yearsAt as yF, loanAt, valueAt, Y0 as Y0F, Y1 as Y1F } from "./story";
const s = (f: number) => f / 30;
export const B1_MEET = s(BT.meet), B2_DOWN = s(BT.down), B2_LOAN = s(BT.loan), B2_BACK = s(BT.back);
export const B3_PAY = s(BT.pay), B3_NOT = s(BT.not), B4_MORT = s(BT.mort), B4_TAX = s(BT.tax), B4_REP = s(BT.rep), B4_LEFT = s(BT.left), B4_WIPE = s(BT.wipe);
export const B5_PAY = s(BT.shrink), B5_RISE = s(BT.rise), B5_EQ = s(BT.eq), B5_DEF = s(BT.def), B6_GUAR = s(BT.guar), B6_SECRET = s(BT.secret);
/** hard cuts inside clips (a light flash marks them) */
export const C1_OUT = s(SHOTS[1].a), C2_OFFICE = s(SHOTS[4].a), C2_KEYS = s(SHOTS[5].a), C3_BILLS = s(SHOTS[7].a);
export const Y0 = s(Y0F), Y1 = s(Y1F);
export const yearsAt = (t: number) => yF(t * 30);
export { loanAt, valueAt };
