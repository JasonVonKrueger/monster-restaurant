import { PATIENCE_MS } from "../../../shared/constants.js";

// Milliseconds until the visiting monster gets sad (0 once it is), or null when
// it is not waiting. waitingSince is server time; small clock differences only
// shift the moment slightly.
export function msUntilSad(order, now = Date.now()) {
  if (!order?.waitingSince || order.status === "COMPLETE") return null;
  return Math.max(0, order.waitingSince + PATIENCE_MS - now);
}
