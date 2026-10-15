// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IVelviqueAccess {
    function passOf(address holder) external view returns (uint8);
}

interface IVelviqueCatalog {
    function recordSale(uint256 id, address buyer, uint32 qty, uint8 region) external returns (uint128 price, uint8 requiredTier);
    function releaseSale(uint256 id, address buyer, uint32 qty) external;
}

/// @title VelviqueOrders
/// @notice One soulbound ERC-721 receipt per order. USDC is escrowed here until delivery, then swept to the treasury Safe.
/// Shipping data never touches this contract in plain form: only a lens:// URI to an encrypted envelope and its sha256.
contract VelviqueOrders is ERC721, AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant FULFILLER_ROLE = keccak256("FULFILLER_ROLE");
    bytes32 public constant PROVENANCE_ROLE = keccak256("PROVENANCE_ROLE");

    enum Status {
        Placed,
        Paid,
        Packing,
        Shipped,
        Delivered,
        Claimed,
        Refunded
    }

    struct Order {
        address buyer;
        address payer;
        uint64 skuId;
        uint32 qty;
        uint8 region;
        Status status;
        uint64 createdBlock;
        uint64 createdAt;
        uint128 amount;
        string shippingURI;
        bytes32 shippingHash;
    }

    struct PurchaseParams {
        uint256 skuId;
        uint32 qty;
        uint8 region;
        uint256 maxTotal; // quote read from the catalog when the buyer signed
        uint64 deadline; // quote expiry
        string shippingURI;
        bytes32 shippingHash;
    }

    IERC20 public immutable usdc;
    IVelviqueAccess public immutable access;
    IVelviqueCatalog public immutable catalog;
    address public treasury;

    uint256 public orderCount;
    uint256 public withdrawable;
    mapping(uint256 id => Order) private _orders;
    mapping(address buyer => uint256[]) private _byBuyer;
    string private _base;

    event OrderPlaced(
        uint256 indexed orderId,
        address indexed buyer,
        uint256 indexed skuId,
        uint32 qty,
        uint128 amount,
        address payer,
        string shippingURI,
        bytes32 shippingHash
    );
    event OrderStatus(uint256 indexed orderId, Status indexed status, string proofURI);
    event Swept(address indexed treasury, uint256 amount);
    event TreasuryChanged(address indexed treasury);

    error Soulbound();
    error QuoteExpired();
    error PriceMoved(uint256 total, uint256 maxTotal);
    error NoPass();
    error TierTooLow(uint8 have, uint8 need);
    error BadTransition(Status from, Status to);
    error UnknownOrder();
    error EmptyShipping();

    constructor(address admin, address treasury_, IERC20 usdc_, IVelviqueAccess access_, IVelviqueCatalog catalog_)
        ERC721("Velvique Order", "VQORDER")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        treasury = treasury_;
        usdc = usdc_;
        access = access_;
        catalog = catalog_;
    }

    // ------------------------------------------------------------------ purchase

    /// @notice Caller approved USDC beforehand (or batched approve + purchase from a smart account).
    function purchase(PurchaseParams calldata p) external nonReentrant returns (uint256) {
        return _purchase(msg.sender, msg.sender, p);
    }

    /// @notice Single signature flow: USDC EIP-2612 permit + purchase.
    function purchaseWithPermit(
        PurchaseParams calldata p,
        uint256 permitValue,
        uint256 permitDeadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external nonReentrant returns (uint256) {
        // A front-run permit leaves a valid allowance behind; do not let it block the purchase.
        try IERC20Permit(address(usdc)).permit(msg.sender, address(this), permitValue, permitDeadline, v, r, s) {} catch {}
        return _purchase(msg.sender, msg.sender, p);
    }

    /// @notice Relayed flows (onramp, sponsor): msg.sender pays, `buyer` receives the receipt and must hold the pass.
    function purchaseFor(address buyer, PurchaseParams calldata p) external nonReentrant returns (uint256) {
        return _purchase(buyer, msg.sender, p);
    }

    function _purchase(address buyer, address payer, PurchaseParams calldata p) internal returns (uint256 id) {
        if (block.timestamp > p.deadline) revert QuoteExpired();
        if (bytes(p.shippingURI).length == 0 || p.shippingHash == bytes32(0)) revert EmptyShipping();

        uint8 tier = access.passOf(buyer);
        if (tier == 0) revert NoPass();

        (uint128 unit, uint8 need) = catalog.recordSale(p.skuId, buyer, p.qty, p.region);
        if (tier < need) revert TierTooLow(tier, need);

        uint256 total = uint256(unit) * p.qty;
        if (total > p.maxTotal) revert PriceMoved(total, p.maxTotal);

        usdc.safeTransferFrom(payer, address(this), total);

        id = ++orderCount;
        Order storage o = _orders[id];
        o.buyer = buyer;
        o.payer = payer;
        o.skuId = uint64(p.skuId);
        o.qty = p.qty;
        o.region = p.region;
        o.status = Status.Paid;
        o.createdBlock = uint64(block.number);
        o.createdAt = uint64(block.timestamp);
        o.amount = uint128(total);
        o.shippingURI = p.shippingURI;
        o.shippingHash = p.shippingHash;
        _byBuyer[buyer].push(id);

        _mint(buyer, id);
        emit OrderPlaced(id, buyer, p.skuId, p.qty, uint128(total), payer, p.shippingURI, p.shippingHash);
        emit OrderStatus(id, Status.Placed, "");
        emit OrderStatus(id, Status.Paid, "");
    }

    // ------------------------------------------------------------------ fulfillment

    /// @param proofURI lens:// to a public proof (carrier tracking, delivery photo). Never personal data.
    function advance(uint256 id, Status next, string calldata proofURI) external onlyRole(FULFILLER_ROLE) {
        Order storage o = _order(id);
        Status cur = o.status;
        bool ok = (cur == Status.Paid && next == Status.Packing) || (cur == Status.Packing && next == Status.Shipped)
            || (cur == Status.Shipped && next == Status.Delivered);
        if (!ok) revert BadTransition(cur, next);
        o.status = next;
        if (next == Status.Delivered) withdrawable += o.amount;
        emit OrderStatus(id, next, proofURI);
    }

    function markClaimed(uint256 id) external onlyRole(PROVENANCE_ROLE) {
        Order storage o = _order(id);
        if (o.status != Status.Delivered) revert BadTransition(o.status, Status.Claimed);
        o.status = Status.Claimed;
        emit OrderStatus(id, Status.Claimed, "");
    }

    /// @notice USDC back to the paying address, never to a card. Only before the order ships.
    function refund(uint256 id, string calldata reasonURI) external nonReentrant {
        if (!hasRole(ADMIN_ROLE, msg.sender) && !hasRole(FULFILLER_ROLE, msg.sender)) {
            revert AccessControlUnauthorizedAccount(msg.sender, FULFILLER_ROLE);
        }
        Order storage o = _order(id);
        if (o.status != Status.Paid && o.status != Status.Packing) revert BadTransition(o.status, Status.Refunded);
        o.status = Status.Refunded;
        catalog.releaseSale(o.skuId, o.buyer, o.qty);
        usdc.safeTransfer(o.payer, o.amount);
        emit OrderStatus(id, Status.Refunded, reasonURI);
    }

    /// @notice Anyone may push delivered proceeds to the Safe.
    function sweep() external nonReentrant {
        uint256 amt = withdrawable;
        withdrawable = 0;
        usdc.safeTransfer(treasury, amt);
        emit Swept(treasury, amt);
    }

    function setTreasury(address t) external onlyRole(ADMIN_ROLE) {
        treasury = t;
        emit TreasuryChanged(t);
    }

    function setBaseURI(string calldata b) external onlyRole(ADMIN_ROLE) {
        _base = b;
    }

    // ------------------------------------------------------------------ views

    function getOrder(uint256 id) external view returns (Order memory) {
        return _order(id);
    }

    function orderCountOf(address buyer) external view returns (uint256) {
        return _byBuyer[buyer].length;
    }

    /// @notice Newest first, paginated, so the web reads orders without an indexer.
    function ordersOf(address buyer, uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory ids, Order[] memory orders)
    {
        uint256[] storage all = _byBuyer[buyer];
        uint256 n = all.length;
        if (offset >= n) return (new uint256[](0), new Order[](0));
        uint256 count = n - offset < limit ? n - offset : limit;
        ids = new uint256[](count);
        orders = new Order[](count);
        for (uint256 i = 0; i < count; i++) {
            uint256 oid = all[n - 1 - offset - i];
            ids[i] = oid;
            orders[i] = _orders[oid];
        }
    }

    /// @notice Grove generic ACL hook: may `editor` edit or delete shipping envelopes?
    function isFulfiller(address editor) external view returns (bool) {
        return hasRole(FULFILLER_ROLE, editor);
    }

    // ------------------------------------------------------------------ internals

    function _order(uint256 id) internal view returns (Order storage o) {
        o = _orders[id];
        if (o.buyer == address(0)) revert UnknownOrder();
    }

    function _baseURI() internal view override returns (string memory) {
        return _base;
    }

    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0) && to != address(0)) revert Soulbound();
        return super._update(to, tokenId, auth);
    }

    function supportsInterface(bytes4 id) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(id);
    }
}
