#!/usr/bin/env node
/**
 * Creative gate (guide section 2): ES and EN copy share one shape, contain no emojis,
 * and never describe the LED as a lamp, base glow or party feature.
 */
import { readFileSync } from "node:fs";

const root = new URL("../content/", import.meta.url);
const es = JSON.parse(readFileSync(new URL("es.json", root), "utf8"));
const en = JSON.parse(readFileSync(new URL("en.json", root), "utf8"));

const problems = [];

function shape(a, b, path = "") {
  if (Array.isArray(a) !== Array.isArray(b) || typeof a !== typeof b) return problems.push(`shape mismatch at ${path || "/"}`);
  if (a && typeof a === "object" && !Array.isArray(a)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
      if (!(k in a)) problems.push(`es missing ${path}.${k}`);
      else if (!(k in b)) problems.push(`en missing ${path}.${k}`);
      else shape(a[k], b[k], `${path}.${k}`);
    }
  }
}
shape(es, en);

const EMOJI = /\p{Extended_Pictographic}/u;
const BANNED = [/\blamp\b/i, /\bl[aá]mpara\b/i, /base glow/i, /party light/i, /\bneon\b/i, /\bne[oó]n\b/i, /\bglitch\b/i, /\bNFT\b/];

function scan(node, path, lang) {
  if (typeof node === "string") {
    if (EMOJI.test(node)) problems.push(`${lang}${path}: emoji`);
    for (const re of BANNED) if (re.test(node)) problems.push(`${lang}${path}: banned term ${re}`);
  } else if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) scan(v, `${path}.${k}`, lang);
  }
}
scan(es, "", "es");
scan(en, "", "en");
// Starter journal articles ship in the repo too, so they pass the same gate.
scan(JSON.parse(readFileSync(new URL("diario.json", root), "utf8")), "", "diario");

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("check-copy: clean");
