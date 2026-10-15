#!/usr/bin/env node
/**
 * Frontend gate (guide section 8): no data persistence outside chain and Grove.
 * Greps every source file in apps/ and packages/ (except contracts) for forbidden storage,
 * database clients, Privy, and server-side file writes. Exit 1 on any hit.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const SCAN = ["apps", "packages/vault", "packages/pay", "content"];
const SKIP = new Set(["node_modules", ".next", "out", "dist"]);
const EXT = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const RULES = [
  [/\b(localStorage|sessionStorage|indexedDB)\b/, "browser persistence"],
  [/document\.cookie/, "cookie persistence"],
  [/from\s+["'](@prisma\/|prisma|drizzle-orm|mongoose|mongodb|pg|mysql2|redis|ioredis|@vercel\/kv|@vercel\/postgres|@upstash\/|@supabase\/|firebase)/, "database client"],
  [/from\s+["'](idb|idb-keyval|localforage|dexie)["']/, "browser database"],
  [/@privy-io\//, "Privy"],
  [/\b(writeFile|writeFileSync|appendFile|appendFileSync|createWriteStream)\b/, "server-side file write"],
];

const ALLOW = [/scripts\/check-no-persistence\.mjs$/, /eslint\.config\.mjs$/];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (EXT.test(name)) yield p;
  }
}

let hits = 0;
for (const base of SCAN) {
  let files;
  try {
    files = [...walk(join(ROOT, base))];
  } catch {
    continue;
  }
  for (const file of files) {
    const rel = relative(ROOT, file).replace(/\\/g, "/");
    if (ALLOW.some((r) => r.test(rel))) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return; // comments may name what is forbidden
      for (const [re, why] of RULES) {
        if (re.test(line)) {
          hits++;
          console.error(`${rel}:${i + 1}  ${why}: ${line.trim()}`);
        }
      }
    });
  }
}

if (hits) {
  console.error(`\n${hits} persistence violation(s). Chain and Grove only.`);
  process.exit(1);
}
console.log("check-no-persistence: clean");
