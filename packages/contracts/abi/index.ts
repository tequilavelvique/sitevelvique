import { parseAbi } from "viem";

/**
 * Typed ABIs, hand-kept in sync with src/*.sol (Contracts agent owns both).
 * Gate: after `forge build`, diff these against out/*.json; any drift fails review.
 */

export const accessAbi = parseAbi([
  "struct Voucher { address to; uint8 tier; bytes32 nonce; uint64 deadline; }",
  "function redeem(Voucher v, bytes sig)",
  "function passOf(address holder) view returns (uint8)",
  "function usedNonce(bytes32 nonce) view returns (bool)",
  "function balanceOf(address account, uint256 id) view returns (uint256)",
  "function requestAccess(uint8 tier, string uri, bytes32 contentHash)",
  "function grant(address to, uint8 tier)",
  "function revoke(address holder, uint8 tier)",
  "function mintMembership(address to, bytes32 identity, bytes32 inviteNonce)",
  "function releaseIdentity(bytes32 identity)",
  "function memberOfIdentity(bytes32 identity) view returns (address)",
  "function memberCount() view returns (uint256)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "event PassMinted(address indexed holder, uint8 indexed tier, bytes32 indexed nonce)",
  "event MembershipMinted(address indexed member, bytes32 indexed identity, bytes32 inviteNonce)",
  "event IdentityReleased(bytes32 indexed identity, address indexed previous)",
  "event PassRevoked(address indexed holder, uint8 indexed tier)",
  "event AccessRequested(address indexed requester, uint8 indexed tier, string uri, bytes32 contentHash)",
  "error Soulbound()",
  "error BadTier()",
  "error Expired()",
  "error NonceUsed()",
  "error BadSignature()",
  "error WrongRecipient()",
  "error AlreadyHolder()",
  "error IdentityUsed()",
  "error BadIdentity()",
]);

/** keccak256 role ids, as in the contracts. */
export const ROLES = {
  ADMIN: "0xa49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775",
  MINTER: "0x9f2df0fed2c77648de5860a4cc508cd0818c85b8b8a1ab4ceeef8d981c8956a6",
} as const;

export const catalogAbi = parseAbi([
  "struct Sku { uint128 price; uint32 supplyCap; uint32 sold; uint16 perWallet; uint8 requiredTier; uint32 regionMask; bool active; string metadataURI; }",
  "struct SkuView { uint256 id; Sku sku; }",
  "function skuCount() view returns (uint256)",
  "function getSku(uint256 id) view returns (Sku)",
  "function listSkus(uint256 offset, uint256 limit) view returns (SkuView[])",
  "function boughtBy(uint256 id, address buyer) view returns (uint32)",
  "event SkuUpdated(uint256 indexed id, uint128 price, uint32 supplyCap, uint8 requiredTier, uint32 regionMask, bool active, string metadataURI)",
  "error UnknownSku()",
  "error Inactive()",
  "error SoldOut()",
  "error WalletLimit()",
  "error RegionBlocked()",
  "error ZeroQty()",
]);

export const ordersAbi = parseAbi([
  "struct Order { address buyer; address payer; uint64 skuId; uint32 qty; uint8 region; uint8 status; uint64 createdBlock; uint64 createdAt; uint128 amount; string shippingURI; bytes32 shippingHash; }",
  "struct PurchaseParams { uint256 skuId; uint32 qty; uint8 region; uint256 maxTotal; uint64 deadline; string shippingURI; bytes32 shippingHash; }",
  "function purchase(PurchaseParams p) returns (uint256)",
  "function purchaseWithPermit(PurchaseParams p, uint256 permitValue, uint256 permitDeadline, uint8 v, bytes32 r, bytes32 s) returns (uint256)",
  "function purchaseFor(address buyer, PurchaseParams p) returns (uint256)",
  "function advance(uint256 id, uint8 next, string proofURI)",
  "function refund(uint256 id, string reasonURI)",
  "function sweep()",
  "function getOrder(uint256 id) view returns (Order)",
  "function orderCount() view returns (uint256)",
  "function orderCountOf(address buyer) view returns (uint256)",
  "function ordersOf(address buyer, uint256 offset, uint256 limit) view returns (uint256[] ids, Order[] orders)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function isFulfiller(address editor) view returns (bool)",
  "event OrderPlaced(uint256 indexed orderId, address indexed buyer, uint256 indexed skuId, uint32 qty, uint128 amount, address payer, string shippingURI, bytes32 shippingHash)",
  "event OrderStatus(uint256 indexed orderId, uint8 indexed status, string proofURI)",
  "error Soulbound()",
  "error QuoteExpired()",
  "error PriceMoved(uint256 total, uint256 maxTotal)",
  "error NoPass()",
  "error TierTooLow(uint8 have, uint8 need)",
  "error BadTransition(uint8 from, uint8 to)",
  "error UnknownOrder()",
  "error EmptyShipping()",
]);

export const provenanceAbi = parseAbi([
  "struct Bottle { uint256 orderId; address owner; uint64 registeredAt; uint64 claimedAt; }",
  "function register(bytes32[] serialHashes, uint256 orderId)",
  "function claim(string serial)",
  "function verify(bytes32 serialHash) view returns (bool registered, Bottle bottle)",
  "event BottleRegistered(bytes32 indexed serialHash, uint256 indexed orderId)",
  "event BottleClaimed(bytes32 indexed serialHash, uint256 indexed orderId, address indexed owner)",
  "error AlreadyRegistered()",
  "error UnknownBottle()",
  "error AlreadyClaimed()",
  "error NotBuyer()",
  "error NotDelivered()",
  "error TooMany()",
]);

export const usdcAbi = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function nonces(address owner) view returns (uint256)",
  "function name() view returns (string)",
  "function version() view returns (string)",
  "function decimals() view returns (uint8)",
  "event Transfer(address indexed from, address indexed to, uint256 value)",
]);

/** Mirrors VelviqueOrders.Status. */
export const OrderStatus = {
  Placed: 0,
  Paid: 1,
  Packing: 2,
  Shipped: 3,
  Delivered: 4,
  Claimed: 5,
  Refunded: 6,
} as const;
export type OrderStatusCode = (typeof OrderStatus)[keyof typeof OrderStatus];

export const Tier = { None: 0, Invitado: 1, Socio: 2, Mayoreo: 3 } as const;
export type TierCode = (typeof Tier)[keyof typeof Tier];

/** EIP-712 domain + types for VelviqueAccess vouchers; shared by the signing route and the client. */
export const voucherTypes = {
  Voucher: [
    { name: "to", type: "address" },
    { name: "tier", type: "uint8" },
    { name: "nonce", type: "bytes32" },
    { name: "deadline", type: "uint64" },
  ],
} as const;

export const voucherDomain = (chainId: number, verifyingContract: `0x${string}`) =>
  ({ name: "VelviqueAccess", version: "1", chainId, verifyingContract }) as const;
