#!/usr/bin/env node
// Optional local probe: asks Codex to list skills without starting a model turn.
import { spawn } from "node:child_process";
import { mkdtempSync, realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { checkPack, sourceRoot } from "./setup-agent-skills.mjs";

const args = process.argv.slice(2);
const cwds = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] !== "--cwd" || !args[i + 1] || args[i + 1].startsWith("--")) {
    console.error("Usage: node scripts/check-agent-discovery.mjs --cwd PATH [--cwd PATH ...]");
    process.exit(1);
  }
  cwds.push(realpathSync(resolve(args[++i])));
}
if (!cwds.length) {
  console.error("At least one explicit --cwd PATH is required");
  process.exit(1);
}

const manifest = checkPack();
const temporaryHome = mkdtempSync(join(tmpdir(), "dad-codex-discovery-"));
const environment = Object.fromEntries(
  ["PATH", "HOME", "USER", "TMPDIR", "LANG", "LC_ALL", "SystemRoot", "USERPROFILE"]
    .filter((key) => process.env[key] !== undefined)
    .map((key) => [key, process.env[key]]),
);
const child = spawn("codex", ["app-server", "--stdio"], {
  cwd: cwds[0],
  env: { ...environment, CODEX_HOME: temporaryHome },
  stdio: ["pipe", "pipe", "ignore"],
});
const childClosed = new Promise((done) => child.once("close", done));
const lines = createInterface({ input: child.stdout });
const pending = new Map();
let nextId = 0;
let closed = false;
const rejectPending = (error) => {
  closed = true;
  for (const entry of pending.values()) entry.reject(error);
  pending.clear();
};
child.on("error", (error) => rejectPending(error));
child.on("exit", () => rejectPending(new Error("Codex app-server exited before completing discovery")));
child.stdin.on("error", (error) => rejectPending(error));
lines.on("line", (line) => {
  let message;
  try { message = JSON.parse(line); } catch { return; }
  const entry = pending.get(message.id);
  if (!entry) return;
  pending.delete(message.id);
  if (message.error) entry.reject(new Error(`Codex ${entry.method} failed: ${message.error.code}`));
  else entry.resolve(message.result);
});
const request = (method, params) => new Promise((resolveResult, reject) => {
  if (closed) { reject(new Error("Codex discovery connection is closed")); return; }
  const id = ++nextId;
  pending.set(id, { method, resolve: resolveResult, reject });
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
});
const timer = setTimeout(() => {
  rejectPending(new Error("Codex discovery exceeded 30 seconds"));
  child.kill("SIGKILL");
}, 30_000);

try {
  await request("initialize", {
    clientInfo: { name: "dad_skill_discovery", version: "1" },
    capabilities: { experimentalApi: true },
  });
  child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method: "initialized" })}\n`);
  const result = await request("skills/list", { cwds, forceReload: true });
  for (const cwd of cwds) {
    const entry = result.data?.find((item) => realpathSync(item.cwd) === cwd);
    if (!entry) throw new Error(`Codex returned no discovery result for ${cwd}`);
    for (const { name } of manifest.skills) {
      const matches = entry.skills.filter((skill) => skill.name === name);
      const expected = join(sourceRoot, "agent-skills", name, "SKILL.md");
      if (matches.length !== 1 || !matches[0].enabled || matches[0].scope !== "repo" ||
          realpathSync(matches[0].path) !== realpathSync(expected)) {
        throw new Error(`Expected exactly one enabled repo skill ${name} from this source at ${cwd}`);
      }
    }
    const extra = entry.skills.filter((skill) => skill.name === "security-audit");
    if (extra.some((skill) => realpathSync(skill.path).startsWith(sourceRoot))) {
      throw new Error(`Nested upstream skill was discovered at ${cwd}`);
    }
    console.log(`Codex discovered all four DAD skills at ${cwd}`);
    if (entry.errors.length) console.log(`${entry.errors.length} other skill-loading error(s); inspect your host separately.`);
  }
  console.log("Discovery only: no model turn, design review, or security audit was started.");
  console.log("Invocation policies are checked by check-agent-skills.mjs; skills/list does not expose them.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  clearTimeout(timer);
  lines.close();
  child.stdin.destroy();
  if (child.pid && child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
  }
  await childClosed;
  rmSync(temporaryHome, { recursive: true, force: true });
}
