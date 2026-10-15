import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Membership only: deploys VelviqueAccess (soulbound ERC-1155) and gives the server relayer MINTER_ROLE.
 * Commerce contracts (Catalog, Orders, Provenance) stay out until the client says go; Velvique.ts deploys those.
 *
 *   npx hardhat ignition deploy ignition/modules/Membership.ts --network baseSepolia --parameters ignition/membership.json
 *
 * Then set NEXT_PUBLIC_ACCESS_ADDRESS in apps/web and fund the relayer (MEMBERSHIP_MINTER_KEY) with a little Base ETH.
 * Admin roles go to the Safe; the deployer keeps them only until the Safe confirms it can act.
 */
export default buildModule("Membership", (m) => {
  const deployer = m.getAccount(0);
  const safe = m.getParameter<string>("safe");
  const relayer = m.getParameter<string>("relayer");
  const voucherSigner = m.getParameter<string>("voucherSigner");
  const metadataUri = m.getParameter<string>("metadataUri", "");

  const access = m.contract("VelviqueAccess", [deployer, voucherSigner, metadataUri]);

  const MINTER = "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6"; // keccak256("MINTER_ROLE")
  const ADMIN = "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"; // keccak256("ADMIN_ROLE")
  const ROOT = "0x0000000000000000000000000000000000000000000000000000000000000000";

  m.call(access, "grantRole", [MINTER, relayer], { id: "minter_relayer" });
  m.call(access, "grantRole", [ADMIN, safe], { id: "admin_safe" });
  m.call(access, "grantRole", [ROOT, safe], { id: "root_safe" });

  return { access };
});
