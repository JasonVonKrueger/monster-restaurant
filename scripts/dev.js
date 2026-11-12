import { spawn } from "node:child_process";
const children = [
  spawn(process.execPath, ["--watch", "server/src/index.js"], {
    stdio: "inherit",
  }),
  spawn("npm", ["run", "dev", "-w", "client"], { stdio: "inherit" }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill("SIGTERM"));
  process.exitCode = code;
}
children.forEach((child) => {
  child.on("error", () => stop(1));
  child.on("exit", (code) => stop(code || 0));
});
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
