// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title VelviqueCatalog
/// @notice SKUs live here so price, supply and eligibility are verifiable. Metadata (name, media) is a lens:// URI.
contract VelviqueCatalog is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ORDERS_ROLE = keccak256("ORDERS_ROLE");

    struct Sku {
        uint128 price; // USDC, 6 decimals, per unit
        uint32 supplyCap; // 0 = uncapped
        uint32 sold;
        uint16 perWallet; // 0 = unlimited
        uint8 requiredTier; // 1 Invitado, 2 Socio, 3 Mayoreo
        uint32 regionMask; // bit i set = ships to region i (see content REGIONS.bit)
        bool active;
        string metadataURI; // lens://...
    }

    struct SkuView {
        uint256 id;
        Sku sku;
    }

    uint256[] private _ids;
    mapping(uint256 id => Sku) private _skus;
    mapping(uint256 id => bool) private _exists;
    mapping(uint256 id => mapping(address buyer => uint32)) public boughtBy;

    event SkuUpdated(uint256 indexed id, uint128 price, uint32 supplyCap, uint8 requiredTier, uint32 regionMask, bool active, string metadataURI);

    error UnknownSku();
    error Inactive();
    error SoldOut();
    error WalletLimit();
    error RegionBlocked();
    error ZeroQty();

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
    }

    function setSku(
        uint256 id,
        uint128 price,
        uint32 supplyCap,
        uint16 perWallet,
        uint8 requiredTier,
        uint32 regionMask,
        bool active,
        string calldata metadataURI
    ) external onlyRole(ADMIN_ROLE) {
        Sku storage s = _skus[id];
        if (!_exists[id]) {
            _exists[id] = true;
            _ids.push(id);
        }
        s.price = price;
        s.supplyCap = supplyCap;
        s.perWallet = perWallet;
        s.requiredTier = requiredTier;
        s.regionMask = regionMask;
        s.active = active;
        s.metadataURI = metadataURI;
        emit SkuUpdated(id, price, supplyCap, requiredTier, regionMask, active, metadataURI);
    }

    /// @notice Called by VelviqueOrders inside a purchase. Returns the unit price to charge.
    function recordSale(uint256 id, address buyer, uint32 qty, uint8 region) external onlyRole(ORDERS_ROLE) returns (uint128 price, uint8 requiredTier) {
        if (qty == 0) revert ZeroQty();
        if (!_exists[id]) revert UnknownSku();
        Sku storage s = _skus[id];
        if (!s.active) revert Inactive();
        if (region >= 32 || (s.regionMask & (uint32(1) << region)) == 0) revert RegionBlocked();
        if (s.supplyCap != 0 && s.sold + qty > s.supplyCap) revert SoldOut();
        uint32 already = boughtBy[id][buyer];
        if (s.perWallet != 0 && already + qty > s.perWallet) revert WalletLimit();
        s.sold += qty;
        boughtBy[id][buyer] = already + qty;
        return (s.price, s.requiredTier);
    }

    /// @notice Returns stock to the SKU when an order is refunded.
    function releaseSale(uint256 id, address buyer, uint32 qty) external onlyRole(ORDERS_ROLE) {
        Sku storage s = _skus[id];
        s.sold -= qty;
        boughtBy[id][buyer] -= qty;
    }

    // ------------------------------------------------------------------ views

    function skuCount() external view returns (uint256) {
        return _ids.length;
    }

    function getSku(uint256 id) external view returns (Sku memory) {
        if (!_exists[id]) revert UnknownSku();
        return _skus[id];
    }

    function listSkus(uint256 offset, uint256 limit) external view returns (SkuView[] memory out) {
        uint256 n = _ids.length;
        if (offset >= n) return new SkuView[](0);
        uint256 end = offset + limit > n ? n : offset + limit;
        out = new SkuView[](end - offset);
        for (uint256 i = offset; i < end; i++) {
            uint256 id = _ids[i];
            out[i - offset] = SkuView(id, _skus[id]);
        }
    }
}
