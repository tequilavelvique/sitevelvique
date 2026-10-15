import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

/**
 * Deploys Access, Catalog, Orders, Provenance and wires roles.
 * Admin roles are granted to the treasury Safe; the deployer renounces its own afterwards
 * once the Safe has confirmed it can act (a renounce step is deliberately left out until then).
 */
export default buildModule("Velvique", (m) => {
  const deployer = m.getAccount(0);
  const treasury = m.getParameter<string>("treasury");
  const voucherSigner = m.getParameter<string>("voucherSigner");
  const fulfiller = m.getParameter<string>("fulfiller");
  const usdc = m.getParameter<string>("usdc");

  const access = m.contract("VelviqueAccess", [deployer, voucherSigner, ""]);
  const catalog = m.contract("VelviqueCatalog", [deployer]);
  const orders = m.contract("VelviqueOrders", [deployer, treasury, usdc, access, catalog]);
  const provenance = m.contract("VelviqueProvenance", [deployer, fulfiller, orders]);

  const ORDERS_ROLE = m.staticCall(catalog, "ORDERS_ROLE", [], 0, { id: "ordersRole" });
  const FULFILLER_ROLE = m.staticCall(orders, "FULFILLER_ROLE", [], 0, { id: "fulfillerRole" });
  const PROVENANCE_ROLE = m.staticCall(orders, "PROVENANCE_ROLE", [], 0, { id: "provenanceRole" });

  m.call(catalog, "grantRole", [ORDERS_ROLE, orders], { id: "catalog_orders" });
  m.call(orders, "grantRole", [FULFILLER_ROLE, fulfiller], { id: "orders_fulfiller" });
  m.call(orders, "grantRole", [PROVENANCE_ROLE, provenance], { id: "orders_provenance" });

  const ADMIN = "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775"; // keccak256("ADMIN_ROLE")
  const ROOT = "0x0000000000000000000000000000000000000000000000000000000000000000";
  for (const [name, c] of [
    ["access", access],
    ["catalog", catalog],
    ["orders", orders],
  ] as const) {
    m.call(c, "grantRole", [ADMIN, treasury], { id: `${name}_admin_safe` });
    m.call(c, "grantRole", [ROOT, treasury], { id: `${name}_root_safe` });
  }
  m.call(provenance, "grantRole", [ROOT, treasury], { id: "provenance_root_safe" });

  return { access, catalog, orders, provenance };
});
