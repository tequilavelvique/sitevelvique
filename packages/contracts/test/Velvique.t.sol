// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {VelviqueAccess} from "../src/VelviqueAccess.sol";
import {VelviqueCatalog} from "../src/VelviqueCatalog.sol";
import {VelviqueOrders, IVelviqueAccess, IVelviqueCatalog} from "../src/VelviqueOrders.sol";
import {VelviqueProvenance, IVelviqueOrdersForProvenance} from "../src/VelviqueProvenance.sol";

contract MockUSDC is ERC20, ERC20Permit {
    constructor() ERC20("USD Coin", "USDC") ERC20Permit("USD Coin") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }
}

contract VelviqueTest is Test {
    MockUSDC usdc;
    VelviqueAccess access;
    VelviqueCatalog catalog;
    VelviqueOrders orders;
    VelviqueProvenance prov;

    address admin = makeAddr("safe");
    address fulfiller = makeAddr("fulfiller");
    uint256 signerPk = 0xA11CE;
    address signer;
    uint256 buyerPk = 0xB0B;
    address buyer;

    uint128 constant PRICE = 120e6;

    function setUp() public {
        signer = vm.addr(signerPk);
        buyer = vm.addr(buyerPk);
        usdc = new MockUSDC();
        access = new VelviqueAccess(admin, signer, "");
        catalog = new VelviqueCatalog(admin);
        orders = new VelviqueOrders(
            admin, admin, IERC20(address(usdc)), IVelviqueAccess(address(access)), IVelviqueCatalog(address(catalog))
        );
        prov = new VelviqueProvenance(admin, fulfiller, IVelviqueOrdersForProvenance(address(orders)));

        vm.startPrank(admin);
        catalog.grantRole(catalog.ORDERS_ROLE(), address(orders));
        orders.grantRole(orders.FULFILLER_ROLE(), fulfiller);
        orders.grantRole(orders.PROVENANCE_ROLE(), address(prov));
        catalog.setSku(1, PRICE, 10, 3, 1, 0x1, true, "lens://sku1");
        catalog.setSku(2, 600e6, 0, 0, 3, 0x1, true, "lens://sku2");
        vm.stopPrank();

        usdc.mint(buyer, 10_000e6);
    }

    // ---------------------------------------------------------------- helpers

    function _voucher(address to, uint8 tier, bytes32 nonce, uint64 deadline)
        internal
        view
        returns (VelviqueAccess.Voucher memory v, bytes memory sig)
    {
        v = VelviqueAccess.Voucher(to, tier, nonce, deadline);
        bytes32 digest = access.hashVoucher(v);
        (uint8 vv, bytes32 r, bytes32 s) = vm.sign(signerPk, digest);
        sig = abi.encodePacked(r, s, vv);
    }

    function _pass(address who, uint8 tier) internal {
        (VelviqueAccess.Voucher memory v, bytes memory sig) =
            _voucher(who, tier, keccak256(abi.encode(who, tier)), uint64(block.timestamp + 1 days));
        vm.prank(who);
        access.redeem(v, sig);
    }

    function _params(uint256 sku, uint32 qty, uint256 maxTotal)
        internal
        view
        returns (VelviqueOrders.PurchaseParams memory)
    {
        return VelviqueOrders.PurchaseParams(
            sku, qty, 0, maxTotal, uint64(block.timestamp + 10 minutes), "lens://ship", keccak256("ct")
        );
    }

    function _buy(uint32 qty) internal returns (uint256 id) {
        vm.startPrank(buyer);
        usdc.approve(address(orders), type(uint256).max);
        id = orders.purchase(_params(1, qty, uint256(PRICE) * qty));
        vm.stopPrank();
    }

    // ---------------------------------------------------------------- access

    function test_redeem_mints_soulbound_pass() public {
        _pass(buyer, 1);
        assertEq(access.passOf(buyer), 1);
        vm.prank(buyer);
        vm.expectRevert(VelviqueAccess.Soulbound.selector);
        access.safeTransferFrom(buyer, address(1), 1, 1, "");
    }

    function test_open_voucher_any_redeemer_once() public {
        (VelviqueAccess.Voucher memory v, bytes memory sig) =
            _voucher(address(0), 1, bytes32("n1"), uint64(block.timestamp + 1));
        vm.prank(buyer);
        access.redeem(v, sig);
        vm.prank(makeAddr("other"));
        vm.expectRevert(VelviqueAccess.NonceUsed.selector);
        access.redeem(v, sig);
    }

    function test_redeem_rejects_expired_wrong_recipient_bad_sig() public {
        (VelviqueAccess.Voucher memory v, bytes memory sig) =
            _voucher(buyer, 1, bytes32("n2"), uint64(block.timestamp));
        vm.warp(block.timestamp + 1);
        vm.prank(buyer);
        vm.expectRevert(VelviqueAccess.Expired.selector);
        access.redeem(v, sig);

        (v, sig) = _voucher(buyer, 1, bytes32("n3"), uint64(block.timestamp + 1));
        vm.prank(makeAddr("thief"));
        vm.expectRevert(VelviqueAccess.WrongRecipient.selector);
        access.redeem(v, sig);

        v.tier = 3; // tampered after signing
        vm.prank(buyer);
        vm.expectRevert(VelviqueAccess.BadSignature.selector);
        access.redeem(v, sig);
    }

    function test_passOf_returns_highest_tier() public {
        _pass(buyer, 1);
        vm.prank(admin);
        access.grant(buyer, 3);
        assertEq(access.passOf(buyer), 3);
    }

    // ---------------------------------------------------------------- purchase

    function test_purchase_requires_pass() public {
        vm.startPrank(buyer);
        usdc.approve(address(orders), type(uint256).max);
        vm.expectRevert(VelviqueOrders.NoPass.selector);
        orders.purchase(_params(1, 1, PRICE));
        vm.stopPrank();
    }

    function test_purchase_tier_gate() public {
        _pass(buyer, 1);
        vm.startPrank(buyer);
        usdc.approve(address(orders), type(uint256).max);
        vm.expectRevert(abi.encodeWithSelector(VelviqueOrders.TierTooLow.selector, uint8(1), uint8(3)));
        orders.purchase(_params(2, 1, 600e6));
        vm.stopPrank();
    }

    function test_purchase_with_permit() public {
        _pass(buyer, 1);
        uint256 deadline = block.timestamp + 1 hours;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                buyer,
                address(orders),
                uint256(PRICE),
                usdc.nonces(buyer),
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked(hex"1901", usdc.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(buyerPk, digest);
        vm.prank(buyer);
        uint256 id = orders.purchaseWithPermit(_params(1, 1, PRICE), PRICE, deadline, v, r, s);
        assertEq(orders.ownerOf(id), buyer);
        assertEq(usdc.balanceOf(address(orders)), PRICE);
    }

    function test_stale_quote_and_price_moved() public {
        _pass(buyer, 1);
        vm.startPrank(buyer);
        usdc.approve(address(orders), type(uint256).max);
        VelviqueOrders.PurchaseParams memory p = _params(1, 1, PRICE);
        vm.warp(p.deadline + 1);
        vm.expectRevert(VelviqueOrders.QuoteExpired.selector);
        orders.purchase(p);
        vm.stopPrank();

        vm.prank(admin);
        catalog.setSku(1, PRICE + 1, 10, 3, 1, 0x1, true, "lens://sku1");
        p = _params(1, 1, PRICE);
        vm.prank(buyer);
        vm.expectRevert(abi.encodeWithSelector(VelviqueOrders.PriceMoved.selector, uint256(PRICE + 1), uint256(PRICE)));
        orders.purchase(p);
    }

    function test_region_and_wallet_limit() public {
        _pass(buyer, 1);
        vm.startPrank(buyer);
        usdc.approve(address(orders), type(uint256).max);
        VelviqueOrders.PurchaseParams memory p = _params(1, 1, PRICE);
        p.region = 1; // US not enabled on this SKU
        vm.expectRevert(VelviqueCatalog.RegionBlocked.selector);
        orders.purchase(p);
        vm.expectRevert(VelviqueCatalog.WalletLimit.selector);
        orders.purchase(_params(1, 4, uint256(PRICE) * 4));
        vm.stopPrank();
    }

    function test_receipt_is_soulbound() public {
        _pass(buyer, 1);
        uint256 id = _buy(1);
        vm.prank(buyer);
        vm.expectRevert(VelviqueOrders.Soulbound.selector);
        orders.transferFrom(buyer, address(1), id);
    }

    function test_ordersOf_newest_first() public {
        _pass(buyer, 1);
        uint256 a = _buy(1);
        uint256 b = _buy(1);
        (uint256[] memory ids,) = orders.ordersOf(buyer, 0, 10);
        assertEq(ids.length, 2);
        assertEq(ids[0], b);
        assertEq(ids[1], a);
    }

    // ---------------------------------------------------------------- state machine

    function test_full_lifecycle_and_claim() public {
        _pass(buyer, 1);
        uint256 id = _buy(2);
        vm.startPrank(fulfiller);
        orders.advance(id, VelviqueOrders.Status.Packing, "");
        bytes32[] memory serials = new bytes32[](2);
        serials[0] = keccak256("VQ-0001");
        serials[1] = keccak256("VQ-0002");
        prov.register(serials, id);
        orders.advance(id, VelviqueOrders.Status.Shipped, "lens://tracking");
        orders.advance(id, VelviqueOrders.Status.Delivered, "");
        vm.stopPrank();

        assertEq(orders.withdrawable(), uint256(PRICE) * 2);
        orders.sweep();
        assertEq(usdc.balanceOf(admin), uint256(PRICE) * 2);

        vm.prank(makeAddr("stranger"));
        vm.expectRevert(VelviqueProvenance.NotBuyer.selector);
        prov.claim("VQ-0001");

        vm.startPrank(buyer);
        prov.claim("VQ-0001");
        assertEq(uint8(orders.getOrder(id).status), uint8(VelviqueOrders.Status.Delivered));
        prov.claim("VQ-0002");
        vm.stopPrank();
        assertEq(uint8(orders.getOrder(id).status), uint8(VelviqueOrders.Status.Claimed));

        (bool registered, VelviqueProvenance.Bottle memory b) = prov.verify(keccak256("VQ-0001"));
        assertTrue(registered);
        assertEq(b.owner, buyer);
    }

    function test_claim_before_delivery_reverts() public {
        _pass(buyer, 1);
        uint256 id = _buy(1);
        bytes32[] memory serials = new bytes32[](1);
        serials[0] = keccak256("VQ-0009");
        vm.prank(fulfiller);
        prov.register(serials, id);
        vm.prank(buyer);
        vm.expectRevert(VelviqueProvenance.NotDelivered.selector);
        prov.claim("VQ-0009");
    }

    function test_bad_transitions() public {
        _pass(buyer, 1);
        uint256 id = _buy(1);
        vm.startPrank(fulfiller);
        vm.expectRevert(
            abi.encodeWithSelector(
                VelviqueOrders.BadTransition.selector, VelviqueOrders.Status.Paid, VelviqueOrders.Status.Shipped
            )
        );
        orders.advance(id, VelviqueOrders.Status.Shipped, "");
        orders.advance(id, VelviqueOrders.Status.Packing, "");
        orders.advance(id, VelviqueOrders.Status.Shipped, "");
        vm.expectRevert(
            abi.encodeWithSelector(
                VelviqueOrders.BadTransition.selector, VelviqueOrders.Status.Shipped, VelviqueOrders.Status.Refunded
            )
        );
        orders.refund(id, "");
        vm.stopPrank();
    }

    function test_only_fulfiller_advances() public {
        _pass(buyer, 1);
        uint256 id = _buy(1);
        vm.prank(buyer);
        vm.expectRevert();
        orders.advance(id, VelviqueOrders.Status.Packing, "");
    }

    // ---------------------------------------------------------------- fuzz

    function testFuzz_purchase_charges_exact_total(uint32 qty) public {
        qty = uint32(bound(qty, 1, 3));
        _pass(buyer, 1);
        uint256 before = usdc.balanceOf(buyer);
        uint256 id = _buy(qty);
        assertEq(before - usdc.balanceOf(buyer), uint256(PRICE) * qty);
        assertEq(orders.getOrder(id).amount, uint256(PRICE) * qty);
    }

    function testFuzz_refund_returns_everything_and_restocks(uint32 qty, bool packFirst) public {
        qty = uint32(bound(qty, 1, 3));
        _pass(buyer, 1);
        uint256 before = usdc.balanceOf(buyer);
        uint256 id = _buy(qty);
        vm.startPrank(fulfiller);
        if (packFirst) orders.advance(id, VelviqueOrders.Status.Packing, "");
        orders.refund(id, "");
        vm.stopPrank();
        assertEq(usdc.balanceOf(buyer), before);
        assertEq(catalog.getSku(1).sold, 0);
        assertEq(catalog.boughtBy(1, buyer), 0);
        assertEq(orders.withdrawable(), 0);
    }
}
