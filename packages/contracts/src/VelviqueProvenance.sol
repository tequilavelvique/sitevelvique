// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IVelviqueOrdersForProvenance {
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

    function getOrder(uint256 id) external view returns (Order memory);
    function markClaimed(uint256 id) external;
}

/// @title VelviqueProvenance
/// @notice The label QR carries a serial. Its keccak256 is registered here at packing time, bound to the order.
/// After delivery, the buyer claims the bottle's digital twin; anyone can verify.
contract VelviqueProvenance is AccessControl {
    bytes32 public constant FULFILLER_ROLE = keccak256("FULFILLER_ROLE");

    struct Bottle {
        uint256 orderId;
        address owner; // zero until claimed
        uint64 registeredAt;
        uint64 claimedAt;
    }

    IVelviqueOrdersForProvenance public immutable orders;
    mapping(bytes32 serialHash => Bottle) private _bottles;
    mapping(uint256 orderId => uint32) public registeredFor;
    mapping(uint256 orderId => uint32) public claimedFor;

    event BottleRegistered(bytes32 indexed serialHash, uint256 indexed orderId);
    event BottleClaimed(bytes32 indexed serialHash, uint256 indexed orderId, address indexed owner);

    error AlreadyRegistered();
    error UnknownBottle();
    error AlreadyClaimed();
    error NotBuyer();
    error NotDelivered();
    error TooMany();

    constructor(address admin, address fulfiller, IVelviqueOrdersForProvenance orders_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(FULFILLER_ROLE, fulfiller);
        orders = orders_;
    }

    function register(bytes32[] calldata serialHashes, uint256 orderId) external onlyRole(FULFILLER_ROLE) {
        IVelviqueOrdersForProvenance.Order memory o = orders.getOrder(orderId);
        if (registeredFor[orderId] + serialHashes.length > o.qty) revert TooMany();
        for (uint256 i = 0; i < serialHashes.length; i++) {
            bytes32 h = serialHashes[i];
            if (_bottles[h].registeredAt != 0) revert AlreadyRegistered();
            _bottles[h] = Bottle(orderId, address(0), uint64(block.timestamp), 0);
            emit BottleRegistered(h, orderId);
        }
        registeredFor[orderId] += uint32(serialHashes.length);
    }

    /// @param serial the plain serial printed on the card and encoded in the QR.
    function claim(string calldata serial) external {
        bytes32 h = keccak256(bytes(serial));
        Bottle storage b = _bottles[h];
        if (b.registeredAt == 0) revert UnknownBottle();
        if (b.owner != address(0)) revert AlreadyClaimed();

        IVelviqueOrdersForProvenance.Order memory o = orders.getOrder(b.orderId);
        if (o.buyer != msg.sender) revert NotBuyer();
        if (o.status != IVelviqueOrdersForProvenance.Status.Delivered && o.status != IVelviqueOrdersForProvenance.Status.Claimed) {
            revert NotDelivered();
        }

        b.owner = msg.sender;
        b.claimedAt = uint64(block.timestamp);
        uint32 c = ++claimedFor[b.orderId];
        // The order flips to Claimed once every bottle in it has been claimed.
        if (c == o.qty && o.status == IVelviqueOrdersForProvenance.Status.Delivered) orders.markClaimed(b.orderId);
        emit BottleClaimed(h, b.orderId, msg.sender);
    }

    function verify(bytes32 serialHash) external view returns (bool registered, Bottle memory bottle) {
        bottle = _bottles[serialHash];
        registered = bottle.registeredAt != 0;
    }
}
