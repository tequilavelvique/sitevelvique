// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {VelviqueAccess} from "../src/VelviqueAccess.sol";

/// Membership path: relayer mints after off-chain identity checks; one membership per identity.
contract MembershipTest is Test {
    VelviqueAccess access;
    address admin = makeAddr("safe");
    address minter = makeAddr("relayer");
    address alice = makeAddr("alice");
    address aliceOtherWallet = makeAddr("alice2");
    bytes32 constant ID_ALICE = keccak256("salt:cdp-user-alice");

    function setUp() public {
        access = new VelviqueAccess(admin, makeAddr("signer"), "");
        bytes32 role = access.MINTER_ROLE();
        vm.prank(admin);
        access.grantRole(role, minter);
    }

    function test_mint_membership_gives_invitado_soulbound() public {
        vm.prank(minter);
        access.mintMembership(alice, ID_ALICE, bytes32(0));
        assertEq(access.passOf(alice), 1);
        assertEq(access.memberOfIdentity(ID_ALICE), alice);
        assertEq(access.memberCount(), 1);

        vm.prank(alice);
        vm.expectRevert(VelviqueAccess.Soulbound.selector);
        access.safeTransferFrom(alice, aliceOtherWallet, 1, 1, "");
    }

    function test_only_minter() public {
        vm.prank(alice);
        vm.expectRevert();
        access.mintMembership(alice, ID_ALICE, bytes32(0));
    }

    function test_idempotent_same_identity_same_wallet() public {
        vm.startPrank(minter);
        access.mintMembership(alice, ID_ALICE, bytes32(0));
        access.mintMembership(alice, ID_ALICE, bytes32(0));
        vm.stopPrank();
        assertEq(access.balanceOf(alice, 1), 1);
        assertEq(access.memberCount(), 1);
    }

    function test_one_membership_per_identity() public {
        vm.startPrank(minter);
        access.mintMembership(alice, ID_ALICE, bytes32(0));
        vm.expectRevert(VelviqueAccess.IdentityUsed.selector);
        access.mintMembership(aliceOtherWallet, ID_ALICE, bytes32(0));
        vm.stopPrank();
    }

    function test_release_identity_allows_new_wallet() public {
        vm.prank(minter);
        access.mintMembership(alice, ID_ALICE, bytes32(0));
        vm.prank(admin);
        access.releaseIdentity(ID_ALICE);
        vm.prank(minter);
        access.mintMembership(aliceOtherWallet, ID_ALICE, bytes32(0));
        assertEq(access.passOf(aliceOtherWallet), 1);
    }

    function test_invite_nonce_is_one_time() public {
        bytes32 code = keccak256("VQ-1AAA-BBBB-CCCC-DDDD");
        vm.startPrank(minter);
        access.mintMembership(alice, ID_ALICE, code);
        vm.expectRevert(VelviqueAccess.NonceUsed.selector);
        access.mintMembership(makeAddr("bob"), keccak256("salt:bob"), code);
        vm.stopPrank();
    }

    function test_revoke_and_upgrade_keep_count_right() public {
        vm.prank(minter);
        access.mintMembership(alice, ID_ALICE, bytes32(0));
        vm.startPrank(admin);
        access.grant(alice, 2);
        assertEq(access.passOf(alice), 2);
        assertEq(access.memberCount(), 1);
        access.revoke(alice, 1);
        assertEq(access.memberCount(), 1); // still Socio
        access.revoke(alice, 2);
        assertEq(access.memberCount(), 0);
        assertEq(access.passOf(alice), 0);
        access.revoke(alice, 2); // no-op, no underflow
        vm.stopPrank();
    }

    function test_rejects_zero_identity() public {
        vm.prank(minter);
        vm.expectRevert(VelviqueAccess.BadIdentity.selector);
        access.mintMembership(alice, bytes32(0), bytes32(0));
    }
}
