#!/usr/bin/env node
import { checkPack } from "./setup-agent-skills.mjs";

try {
  const manifest = checkPack();
  console.log(`Validated ${manifest.skills.length} skill entrypoints, invocation policies, and upstream file hashes.`);
  console.log("This is a structural check; it does not prove model routing or review quality.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
