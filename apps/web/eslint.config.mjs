import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Hard rules from the guide, enforced in lint (and again by scripts/check-no-persistence.mjs):
 * no browser persistence for data, no database clients, no Privy.
 */
const persistence = ["localStorage", "sessionStorage", "indexedDB"];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "no-restricted-globals": ["error", ...persistence.map((name) => ({ name, message: "No browser persistence. Chain or Grove only." }))],
      "no-restricted-properties": [
        "error",
        ...persistence.flatMap((property) => [
          { object: "window", property, message: "No browser persistence. Chain or Grove only." },
          { object: "globalThis", property, message: "No browser persistence. Chain or Grove only." },
        ]),
        { object: "document", property: "cookie", message: "No cookies for data." },
      ],
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@privy-io/*"], message: "No Privy. Identity is the wallet." },
            { group: ["@prisma/*", "prisma", "drizzle-orm", "drizzle-orm/*", "mongoose", "mongodb", "pg", "mysql2", "redis", "ioredis", "@vercel/kv", "@vercel/postgres", "@upstash/*", "@supabase/*", "firebase", "firebase/*"], message: "No database. Contract state and Grove only." },
            { group: ["idb", "idb-keyval", "localforage", "dexie"], message: "No browser persistence." },
          ],
        },
      ],
    },
  },
  // Vendored React Bits stays byte-for-byte upstream (AGENTS.md), so it is not linted against our rules.
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "components/reactbits/**"]),
]);
