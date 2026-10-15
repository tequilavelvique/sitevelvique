# @velvique/contracts

Owner: Contracts agent. Spec: guide sections 5 and 6. Toolchain: **Hardhat 3** (viem toolbox, Ignition).

Contract addresses are intentionally **not** wired into the web app yet. The site runs without them
(members access uses the Grove registry). This package is ready for when we deploy.

| Contract | Role |
| --- | --- |
| `VelviqueAccess` | ERC-1155 soulbound passes (1 Invitado, 2 Socio, 3 Mayoreo). EIP-712 vouchers. |
| `VelviqueCatalog` | SKUs: USDC price, cap, per-wallet limit, tier, region mask, metadata URI. |
| `VelviqueOrders` | ERC-721 soulbound receipts, USDC escrow, status machine, refunds, sweep to Safe. |
| `VelviqueProvenance` | Bottle serial hash to order, digital twin claim after delivery. |

```sh
npm install
npx hardhat build
npx hardhat test              # Solidity tests (test/*.t.sol, forge-std) + node tests
npx hardhat test --coverage
npx hardhat keystore set DEPLOYER_PRIVATE_KEY      # or env vars
npx hardhat ignition deploy ignition/modules/Velvique.ts --network baseSepolia --parameters ignition/parameters.json
```

`abi/index.ts` is the typed ABI the web consumes; keep it in sync with `src/*.sol`.
