import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  appendFileSync, cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync,
  readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { applySetup, checkPack, planSetup, sourceRoot } from "./setup-agent-skills.mjs";

const git = (repo, ...args) => execFileSync("git", ["-C", repo, ...args], { encoding: "utf8" }).trim();
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "dad-skills-")));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const repo = join(root, "repo with spaces");
  mkdirSync(repo);
  git(repo, "init", "--quiet");
  return { root, repo };
}
const install = (repos, options = {}) => applySetup(planSetup(repos, options), options);
const skillPath = (repo, name = "dad-debug") => join(repo, ".agents", "skills", name);

test("install is idempotent, ignored, linked to complete resources, and removable without deleting other skills", (t) => {
  const { repo } = fixture(t);
  const exclude = join(repo, ".git", "info", "exclude");
  appendFileSync(exclude, "\n# existing user rule\nlocal-cache\n");
  const before = readFileSync(exclude, "utf8");
  install([repo]);
  const manifest = checkPack();
  for (const { name } of manifest.skills) {
    assert(lstatSync(skillPath(repo, name)).isSymbolicLink());
    assert.equal(realpathSync(skillPath(repo, name)), join(sourceRoot, "agent-skills", name));
    assert(readFileSync(join(skillPath(repo, name), "SKILL.md"), "utf8").includes(`name: ${name}`));
    assert.equal(git(repo, "check-ignore", `.agents/skills/${name}`), `.agents/skills/${name}`);
  }
  const first = readFileSync(exclude, "utf8");
  assert(first.startsWith(before));
  install([repo]);
  assert.equal(readFileSync(exclude, "utf8"), first);
  assert.equal(git(repo, "status", "--porcelain"), "");
  install([repo], { mode: "check" });
  mkdirSync(skillPath(repo, "other-skill"));
  writeFileSync(join(skillPath(repo, "other-skill"), "SKILL.md"), "keep me");
  install([repo], { mode: "remove" });
  for (const { name } of manifest.skills) assert(!existsSync(skillPath(repo, name)));
  assert.equal(readFileSync(join(skillPath(repo, "other-skill"), "SKILL.md"), "utf8"), "keep me");
  assert.equal(readFileSync(exclude, "utf8"), first);
});

test("dry run and failed multi-repo preflight leave every target unchanged", (t) => {
  const { repo, root } = fixture(t);
  const exclude = join(repo, ".git", "info", "exclude");
  const before = readFileSync(exclude, "utf8");
  install([repo], { dryRun: true });
  assert(!existsSync(join(repo, ".agents")));
  assert.equal(readFileSync(exclude, "utf8"), before);
  assert.throws(() => install([repo, root]), /Command failed/);
  assert(!existsSync(join(repo, ".agents")));
  assert.equal(readFileSync(exclude, "utf8"), before);
});

test("refuses directories, dangling/conflicting links, and symlinked parents", (t) => {
  const { repo, root } = fixture(t);
  mkdirSync(skillPath(repo), { recursive: true });
  assert.throws(() => install([repo]), /existing skill/);
  rmSync(skillPath(repo), { recursive: true });
  symlinkSync(join(root, "missing"), skillPath(repo));
  assert.throws(() => install([repo]), /conflicting link/);
  assert.throws(() => install([repo], { mode: "remove" }), /conflicting link/);
  unlinkSync(skillPath(repo));
  rmSync(join(repo, ".agents"), { recursive: true });
  const outside = join(root, "outside");
  mkdirSync(outside);
  symlinkSync(outside, join(repo, ".agents"));
  assert.throws(() => install([repo]), /symlinked parent/);
  assert(!existsSync(join(outside, "skills")));
});

test("rejects tracked destinations and subdirectory targets", (t) => {
  const { repo } = fixture(t);
  mkdirSync(skillPath(repo), { recursive: true });
  writeFileSync(join(skillPath(repo), "SKILL.md"), "existing tracked skill");
  git(repo, "add", ".agents");
  assert.throws(() => install([repo]), /tracked skill/);
  assert.throws(() => install([join(repo, ".agents")]), /repository root/);
});

test("check detects missing links and upstream integrity, invocation policy, and nested-skill drift", (t) => {
  const { repo, root } = fixture(t);
  assert.throws(() => install([repo], { mode: "check" }), /not installed/);
  const copy = join(root, "source");
  cpSync(join(sourceRoot, "agent-skills"), join(copy, "agent-skills"), { recursive: true });
  mkdirSync(join(copy, "conventions"));
  cpSync(join(sourceRoot, "conventions", "agent-workflow.md"), join(copy, "conventions", "agent-workflow.md"));
  checkPack(copy);
  const policy = join(copy, "agent-skills", "dad-design-review", "agents", "openai.yaml");
  const oldPolicy = readFileSync(policy, "utf8");
  writeFileSync(policy, "policy:\n  allow_implicit_invocation: true\n");
  assert.throws(() => checkPack(copy), /invocation policy/);
  writeFileSync(policy, oldPolicy);
  const nested = join(copy, "agent-skills", "dad-debug", "references", "SKILL.md");
  mkdirSync(join(copy, "agent-skills", "dad-debug", "references"));
  writeFileSync(nested, "unexpected nested skill");
  assert.throws(() => checkPack(copy), /Nested discoverable skill/);
  unlinkSync(nested);
  const manifest = checkPack(copy);
  const upstream = manifest.upstream.find((entry) => entry.repository.endsWith("security-audit-skill"));
  appendFileSync(join(copy, upstream.files[0].path), "\ntampered\n");
  assert.throws(() => checkPack(copy), /integrity mismatch/);
});

test("installs into Git worktrees with a .git file", (t) => {
  const { repo, root } = fixture(t);
  git(repo, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid", "commit", "--allow-empty", "-m", "fixture");
  const worktree = join(root, "worktree");
  git(repo, "worktree", "add", "--quiet", "-b", "fixture", worktree);
  assert(lstatSync(join(worktree, ".git")).isFile());
  install([worktree]);
  install([worktree], { mode: "check" });
  assert.equal(git(worktree, "status", "--porcelain"), "");
  assert(!existsSync(join(repo, ".agents")));
});

test("link checker does not recurse into installed links and still rejects broken document links", (t) => {
  const { repo } = fixture(t);
  writeFileSync(join(repo, "README.md"), "[Guide](guide.md)\n");
  writeFileSync(join(repo, "guide.md"), "# Guide\n");
  symlinkSync(repo, join(repo, "recursive-local-link"));
  const checker = join(sourceRoot, "scripts", "check-links.mjs");
  execFileSync(process.execPath, [checker, repo], { timeout: 5000 });
  writeFileSync(join(repo, "README.md"), "[Missing](missing.md)\n");
  assert.throws(() => execFileSync(process.execPath, [checker, repo], {
    timeout: 5000, stdio: "pipe",
  }), (error) => error.status === 1 && error.stderr.toString().includes("missing.md"));
});
