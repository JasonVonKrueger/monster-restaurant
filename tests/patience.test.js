import test from "node:test";
import assert from "node:assert/strict";
import { msUntilSad } from "../client/src/data/patience.js";
import { PATIENCE_MS } from "../shared/constants.js";

test("a monster gets sad only after waiting PATIENCE_MS without progress", () => {
  const order = { status: "PREPARING", waitingSince: 1000 };
  assert.equal(msUntilSad(order, 1000), PATIENCE_MS);
  assert.equal(msUntilSad(order, 1000 + PATIENCE_MS - 1), 1);
  assert.equal(msUntilSad(order, 1000 + PATIENCE_MS), 0);
  assert.equal(msUntilSad(order, 1000 + PATIENCE_MS * 5), 0);
  assert.equal(msUntilSad({ ...order, status: "COMPLETE" }, 99999999), null);
  assert.equal(msUntilSad(null), null);
});
