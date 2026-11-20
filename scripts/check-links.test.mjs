import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(new URL("./check-links.mjs", import.meta.url));

function docs(t, files) {
  const root = mkdtempSync(join(tmpdir(), "dad-links-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, name), text);
  return root;
}
const run = (root) => {
  try {
    return { status: 0, out: execFileSync(process.execPath, [checker, root], { timeout: 5000, stdio: "pipe" }).toString() };
  } catch (error) {
    return { status: error.status, out: error.stderr.toString() };
  }
};

test("accepts resolving files and anchors, including duplicate-heading and punctuated slugs", (t) => {
  const root = docs(t, {
    "a.md": "[g](guide.md) [s](guide.md#setup) [s1](guide.md#setup-1) [p](guide.md#what-is-this) [self](#top)\n# Top\n",
    "guide.md": "# Setup\n## Setup\n## What is `this`?\n",
  });
  assert.equal(run(root).status, 0);
});

test("rejects a missing file", (t) => {
  const result = run(docs(t, { "a.md": "[x](missing.md)\n" }));
  assert.equal(result.status, 1);
  assert(result.out.includes("missing.md"));
});

test("rejects a missing anchor and a third duplicate-heading suffix", (t) => {
  const missing = run(docs(t, { "a.md": "[x](guide.md#nope)\n", "guide.md": "# Setup\n" }));
  assert.equal(missing.status, 1);
  assert(missing.out.includes("#nope"));
  const suffix = run(docs(t, { "a.md": "[x](guide.md#setup-2)\n", "guide.md": "# Setup\n## Setup\n" }));
  assert.equal(suffix.status, 1);
});

test("ignores links in fenced blocks (backtick, tilde, indented) and inline code", (t) => {
  const root = docs(t, {
    "a.md": [
      "```md", "[a](missing.md)", "```",
      "~~~", "[b](missing.md)", "~~~",
      "  ```", "[c](missing.md)", "  ```",
      "Use `[d](missing.md)` literally.",
      "",
    ].join("\n"),
  });
  assert.equal(run(root).status, 0);
});

test("a heading inside a fence is not an anchor, and links after a fence are checked", (t) => {
  const root = docs(t, {
    "a.md": "[x](guide.md#fenced)\n",
    "guide.md": "```\n# Fenced\n```\n",
  });
  assert.equal(run(root).status, 1);
  const after = docs(t, { "a.md": "```\nx\n```\n[y](missing.md)\n" });
  assert.equal(run(after).status, 1);
});

test("does not recurse into symlinks", (t) => {
  const root = docs(t, { "a.md": "[g](a.md)\n" });
  symlinkSync(root, join(root, "loop"));
  assert.equal(run(root).status, 0);
});
