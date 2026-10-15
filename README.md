# Velvique

Invitation-only añejo cristalino. The site is **The Morning After**: the night reconstructed from its evidence, lit only by the bottle's LED and the camera flash. Commerce runs on Base with no database; private data lives encrypted on Grove.

All media (photos, video, the bottle GLB, logo, icons, share card) is served from Grove links in the code; the repo holds no media files.

## Layout

```
apps/web                Next.js 16 App Router (TS strict)
  app/                  routes: / la-botella el-after diario[/slug] eventos[/slug] miembros acceso admin
                                tienda pedido/[id] verificar[/serial] mayoreo ar
  app/api/              members (me, mint, open), revalidate,
                        voucher, onramp, swap, paymaster (contracts mode)
  components/reactbits/ React Bits sources, vendored as shipped (3 marked patches)
  components/bits/      brand wrappers around React Bits
  components/           chrome, providers, motion, journal, events, members, admin, pages
  scene/                procedural bottle, LED label, selective bloom, device tiers, GLB export for AR
  lib/                  env, chain (wagmi/AppKit config, server reads, sponsored calls), content loader, invite codes
packages/contracts      Hardhat 3: Access, Catalog, Orders, Provenance + typed ABIs (not wired to the web yet)
packages/vault          Grove client + ACLs, CMS schemas (@velvique/vault/cms), envelope + staging vault
packages/pay            quotes, USDC permit, rails A/B/C/D (@velvique/pay, @velvique/pay/server)
content                 ES/EN copy, regions, tokens, media slot defaults (@velvique/content)
scripts                 check-no-persistence, check-copy, invite (code | qr | link), members-keygen, fulfillment-keygen
```

## Run

```sh
npm install
cp apps/web/.env.example apps/web/.env.local   # every value optional for a first look
npm run dev                                     # http://localhost:3000
```

Membership is onchain (VelviqueAccess ERC-1155). Commerce addresses stay out for now; store, order and
verify pages say the catalog is not on this network yet.

### Membership (first run)

1. Coinbase CDP Portal: create a project, enable Embedded Wallets with Google / Apple / X, allowlist the site
   origin. Put `NEXT_PUBLIC_CDP_PROJECT_ID`, `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET` in `.env.local`.
   Reown Cloud: `NEXT_PUBLIC_REOWN_PROJECT_ID` (WalletConnect door).
2. `node scripts/members-keygen.mjs` (after `npm install` it also prints the relayer address).
3. Deploy the membership contract and give the relayer MINTER_ROLE:
   fill `packages/contracts/ignition/membership.json`, then
   `npm run deploy:membership:sepolia -w @velvique/contracts`. Set `NEXT_PUBLIC_ACCESS_ADDRESS`, fund the relayer.
4. `/miembros`: socials -> Coinbase smart wallet, or WalletConnect -> sign; link a social; the membership
   mints automatically (relayer pays gas). Invite-only drops: `NEXT_PUBLIC_MEMBERSHIP_INVITE_ONLY=1` +
   `node scripts/invite.mjs qr`.

### Grove content (first run)

1. `NEXT_PUBLIC_ADMIN_ADDRESSES` = your admin EOA. Open `/admin`, connect it, **Create manifest**,
   paste the URI into `NEXT_PUBLIC_GROVE_SITE_URI`, restart.
2. Publish articles, events, archive photos and media slots. Each save is a Grove edit signed by the admin
   wallet; the site refetches right away (`/api/revalidate`).

### Contracts

```sh
cd packages/contracts && npx hardhat test     # 25 Solidity tests incl. membership + fuzz
```

Guardrails: `npm run lint`, `npm run check:persistence`, `npm run check:copy`.

## Where things live (no database)

| Fact | Lives in |
| --- | --- |
| Who may buy | `VelviqueAccess` pass (soulbound ERC-1155) |
| What is for sale, price, stock, regions | `VelviqueCatalog` |
| Orders, payment, status history | `VelviqueOrders` struct + `OrderStatus` events |
| Shipping address | encrypted envelope on Grove; only URI + sha256 onchain; deleted after delivery |
| Bottle authenticity | `VelviqueProvenance` |
| Copy and media defaults | `content/` seed, overridable from the Grove manifest |
| Articles, events, flash archive, media | Grove site manifest + one JSON per article/event, edited by the admin wallet |
| Members-only bodies, event addresses | sealed envelopes on Grove; only the server's members key opens them |
| Who is a member | VelviqueAccess ERC-1155 holders (soulbound); one membership per Coinbase identity, onchain |
| Identity and linked socials | Coinbase CDP end user (socials, SIWE wallets, smart wallet), verified server-side per request |
| Language, region, age answer | React state, gone on reload |
