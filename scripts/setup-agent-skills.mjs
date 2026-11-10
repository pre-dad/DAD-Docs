#!/usr/bin/env node
// Explicit repo targets keep sibling/worktree layouts from changing installation scope.
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync,
  realpathSync, symlinkSync, unlinkSync, writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const sourceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const present = (path) => {
  try { return lstatSync(path); } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};
const git = (repo, ...args) => execFileSync("git", ["-C", repo, ...args], {
  encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
}).trim();

export function checkPack(root = sourceRoot) {
  const pack = join(root, "agent-skills");
  const manifest = JSON.parse(readFileSync(join(pack, "upstream.json"), "utf8"));
  if (manifest.version !== 1 || manifest.skills.length !== 4) throw new Error("Unsupported skill manifest");
  const names = new Set();
  for (const { name, implicit } of manifest.skills) {
    if (!/^dad-[a-z]+(?:-[a-z]+)*$/.test(name) || names.has(name) || typeof implicit !== "boolean") {
      throw new Error(`Invalid or duplicate skill: ${name}`);
    }
    names.add(name);
    const skill = join(pack, name);
    const text = readFileSync(join(skill, "SKILL.md"), "utf8");
    // The pack deliberately uses a small, dependency-free subset of frontmatter.
    const header = text.match(/^---\nname: ([^\n]+)\ndescription: ([^\n]+)\n---\n/);
    if (!header || header[1] !== name || !header[2].trim() || header[2].length > 1024) {
      throw new Error(`Invalid skill frontmatter: ${name}`);
    }
    const policy = join(skill, "agents", "openai.yaml");
    if (implicit) {
      if (existsSync(policy)) throw new Error(`Unexpected invocation policy: ${name}`);
    } else if (readFileSync(policy, "utf8").trim() !== "policy:\n  allow_implicit_invocation: false") {
      throw new Error(`Explicit invocation policy missing: ${name}`);
    }
    const walk = (dir) => {
      for (const item of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, item.name);
        if (item.isSymbolicLink()) throw new Error(`Unexpected symlink in pack: ${path}`);
        if (item.isDirectory()) walk(path);
        else if (item.name === "SKILL.md" && path !== join(skill, "SKILL.md")) {
          throw new Error(`Nested discoverable skill: ${path}`);
        }
      }
    };
    walk(skill);
  }
  const discovered = readdirSync(pack).filter((name) => existsSync(join(pack, name, "SKILL.md")));
  if (discovered.length !== names.size || discovered.some((name) => !names.has(name))) {
    throw new Error("Manifest does not match discoverable skills");
  }
  if (!existsSync(join(root, "conventions", "agent-workflow.md"))) throw new Error("Missing shared routing guidance");
  const retained = new Set();
  for (const upstream of manifest.upstream) {
    if (!/^https:\/\/github\.com\/[\w-]+\/[\w-]+$/.test(upstream.repository) ||
        !/^[a-f0-9]{40}$/.test(upstream.revision) || !upstream.files.length) {
      throw new Error("Invalid upstream provenance");
    }
    for (const file of upstream.files) {
      const path = resolve(root, file.path);
      if (isAbsolute(file.path) || isAbsolute(relative(pack, path)) ||
          relative(pack, path).split(/[\\/]/).includes("..") || retained.has(path)) {
        throw new Error(`Invalid retained path: ${file.path}`);
      }
      retained.add(path);
      const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
      if (digest !== file.sha256) throw new Error(`Upstream integrity mismatch: ${file.path}`);
    }
  }
  return manifest;
}

export function planSetup(repos, { root = sourceRoot, mode = "install" } = {}) {
  const manifest = checkPack(root);
  const plans = [];
  const seen = new Set();
  for (const input of repos) {
    const repo = realpathSync(resolve(input));
    if (seen.has(repo)) continue;
    seen.add(repo);
    if (realpathSync(git(repo, "rev-parse", "--show-toplevel")) !== repo) {
      throw new Error(`Select a repository root, not a subdirectory: ${input}`);
    }
    for (const path of [join(repo, ".agents"), join(repo, ".agents", "skills")]) {
      const stat = present(path);
      if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) {
        throw new Error(`Refusing non-directory or symlinked parent: ${path}`);
      }
    }
    const links = manifest.skills.map(({ name }) => {
      const path = join(repo, ".agents", "skills", name);
      const target = realpathSync(join(root, "agent-skills", name));
      const stat = present(path);
      if (git(repo, "ls-files", "--", `.agents/skills/${name}`)) {
        throw new Error(`Refusing tracked skill destination: ${path}`);
      }
      if (stat && (!stat.isSymbolicLink() || resolve(dirname(path), readlinkSync(path)) !== target)) {
        throw new Error(`Refusing existing skill or conflicting link: ${path}`);
      }
      if (mode === "check" && !stat) throw new Error(`Skill is not installed: ${path}`);
      return { path, target, exists: Boolean(stat) };
    });
    const exclude = resolve(repo, git(repo, "rev-parse", "--git-path", "info/exclude"));
    const excludeStat = present(exclude);
    if (excludeStat && (!excludeStat.isFile() || excludeStat.isSymbolicLink())) {
      throw new Error(`Refusing non-file or symlinked Git exclude: ${exclude}`);
    }
    if (mode === "check") {
      for (const link of links) {
        if (execFileSync("git", ["-C", repo, "check-ignore", "--", relative(repo, link.path)], {
          encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
        }).trim() === "") throw new Error(`Installed skill is not ignored: ${link.path}`);
      }
    }
    plans.push({ repo, links, exclude });
  }
  return plans;
}

export function applySetup(plans, { mode = "install", dryRun = false } = {}) {
  for (const plan of plans) {
    for (const link of plan.links) {
      console.log(`${mode}: ${link.path} -> ${link.target}`);
    }
    if (dryRun || mode === "check") continue;
    if (mode === "remove") {
      for (const link of plan.links) if (link.exists) unlinkSync(link.path);
      // Keep harmless exclusion entries: they may be shared by another worktree.
      continue;
    }
    const old = existsSync(plan.exclude) ? readFileSync(plan.exclude, "utf8") : "";
    const rules = plan.links.map((link) => `/.agents/skills/${link.path.split(/[\\/]/).at(-1)}`);
    const missing = rules.filter((rule) => !old.split(/\r?\n/).includes(rule));
    if (missing.length) {
      mkdirSync(dirname(plan.exclude), { recursive: true });
      writeFileSync(plan.exclude, `${old}${old && !old.endsWith("\n") ? "\n" : ""}${missing.join("\n")}\n`);
    }
    mkdirSync(join(plan.repo, ".agents", "skills"), { recursive: true });
    for (const link of plan.links) if (!link.exists) symlinkSync(link.target, link.path, "dir");
  }
}

export function main(args) {
  const repos = [];
  let mode = "install";
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--repo" && args[i + 1] && !args[i + 1].startsWith("--")) repos.push(args[++i]);
    else if (arg === "--dry-run") dryRun = true;
    else if ((arg === "--check" || arg === "--remove") && mode === "install") mode = arg.slice(2);
    else if (arg === "--help") {
      console.log("Usage: node scripts/setup-agent-skills.mjs --repo PATH [--repo PATH ...] [--dry-run | --check | --remove]");
      return;
    } else throw new Error(`Unknown, missing, or conflicting argument: ${arg}`);
  }
  if (!repos.length) throw new Error("At least one explicit --repo PATH is required; use --help");
  const plans = planSetup(repos, { mode });
  applySetup(plans, { mode, dryRun });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.argv.slice(2)); } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
