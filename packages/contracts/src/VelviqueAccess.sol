// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {SignatureChecker} from "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";

/// @title VelviqueAccess
/// @notice Velvique membership: a soulbound ERC-1155. Token id = tier: 1 Invitado, 2 Socio, 3 Mayoreo.
/// Holding any tier is what opens members content; the brand controls access by granting, upgrading and revoking.
/// Paths in:
///  - `mintMembership` (MINTER_ROLE relayer): after the server verified the user's Coinbase identity
///    (linked socials + wallet ownership). One membership per identity, enforced here.
///  - `redeem` (EIP-712 voucher signed by SIGNER_ROLE): invitation links.
///  - `grant` (ADMIN_ROLE): upgrades and manual adds.
contract VelviqueAccess is ERC1155, AccessControl, EIP712 {
    bytes32 public constant SIGNER_ROLE = keccak256("SIGNER_ROLE");
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint8 public constant INVITADO = 1;
    uint8 public constant SOCIO = 2;
    uint8 public constant MAYOREO = 3;

    /// @dev `to == address(0)` makes an open link: whoever redeems it first receives the pass.
    struct Voucher {
        address to;
        uint8 tier;
        bytes32 nonce;
        uint64 deadline;
    }

    bytes32 private constant VOUCHER_TYPEHASH =
        keccak256("Voucher(address to,uint8 tier,bytes32 nonce,uint64 deadline)");

    mapping(bytes32 nonce => bool) public usedNonce;
    /// @notice Salted hash of the off-chain identity (Coinbase end user) -> the wallet that holds its membership.
    mapping(bytes32 identity => address) public memberOfIdentity;
    uint256 public memberCount;

    event PassMinted(address indexed holder, uint8 indexed tier, bytes32 indexed nonce);
    event PassRevoked(address indexed holder, uint8 indexed tier);
    /// @notice Wholesale or upgrade request. `uri` is a lens:// envelope readable only by the brand.
    event AccessRequested(address indexed requester, uint8 indexed tier, string uri, bytes32 contentHash);
    event MembershipMinted(address indexed member, bytes32 indexed identity, bytes32 inviteNonce);
    event IdentityReleased(bytes32 indexed identity, address indexed previous);

    error Soulbound();
    error BadTier();
    error Expired();
    error NonceUsed();
    error BadSignature();
    error WrongRecipient();
    error AlreadyHolder();
    error IdentityUsed();
    error BadIdentity();

    constructor(address admin, address signer, string memory uri_)
        ERC1155(uri_)
        EIP712("VelviqueAccess", "1")
    {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(SIGNER_ROLE, signer);
    }

    // ------------------------------------------------------------------ redeem

    function redeem(Voucher calldata v, bytes calldata sig) external {
        if (v.tier < INVITADO || v.tier > MAYOREO) revert BadTier();
        if (block.timestamp > v.deadline) revert Expired();
        if (usedNonce[v.nonce]) revert NonceUsed();
        if (v.to != address(0) && v.to != msg.sender) revert WrongRecipient();

        address signer = _recover(v, sig);
        if (signer == address(0) || !hasRole(SIGNER_ROLE, signer)) revert BadSignature();

        usedNonce[v.nonce] = true;
        _mintPass(msg.sender, v.tier, v.nonce);
    }

    /// @notice Membership on sign-up. The relayer calls this only after verifying the identity off-chain.
    /// Idempotent for the same identity and wallet; a second wallet for the same identity reverts.
    /// @param inviteNonce keccak256 of an invitation code when the drop is invite-only, else zero.
    function mintMembership(address to, bytes32 identity, bytes32 inviteNonce) external onlyRole(MINTER_ROLE) {
        if (identity == bytes32(0) || to == address(0)) revert BadIdentity();
        address bound = memberOfIdentity[identity];
        if (bound != address(0) && bound != to) revert IdentityUsed();
        if (inviteNonce != bytes32(0)) {
            if (usedNonce[inviteNonce]) revert NonceUsed();
            usedNonce[inviteNonce] = true;
        }
        memberOfIdentity[identity] = to;
        if (passOf(to) == 0) _mintPass(to, INVITADO, inviteNonce);
        emit MembershipMinted(to, identity, inviteNonce);
    }

    /// @notice Frees an identity so it can bind a new wallet (lost wallet, account recovery).
    function releaseIdentity(bytes32 identity) external onlyRole(ADMIN_ROLE) {
        emit IdentityReleased(identity, memberOfIdentity[identity]);
        delete memberOfIdentity[identity];
    }

    /// @notice Direct grant, used for upgrades (Socio, Mayoreo) and manual adds.
    function grant(address to, uint8 tier) external onlyRole(ADMIN_ROLE) {
        if (tier < INVITADO || tier > MAYOREO) revert BadTier();
        _mintPass(to, tier, bytes32(0));
    }

    function revoke(address holder, uint8 tier) external onlyRole(ADMIN_ROLE) {
        uint256 bal = balanceOf(holder, tier);
        if (bal == 0) return;
        _burn(holder, tier, bal);
        if (passOf(holder) == 0) memberCount--;
        emit PassRevoked(holder, tier);
    }

    function requestAccess(uint8 tier, string calldata uri_, bytes32 contentHash) external {
        if (tier < INVITADO || tier > MAYOREO) revert BadTier();
        emit AccessRequested(msg.sender, tier, uri_, contentHash);
    }

    // ------------------------------------------------------------------ views

    /// @notice Highest tier held, 0 when none.
    function passOf(address holder) public view returns (uint8) {
        for (uint8 t = MAYOREO; t >= INVITADO; t--) {
            if (balanceOf(holder, t) > 0) return t;
        }
        return 0;
    }

    function hashVoucher(Voucher calldata v) external view returns (bytes32) {
        return _hashTypedDataV4(_structHash(v));
    }

    // ------------------------------------------------------------------ internals

    function _mintPass(address to, uint8 tier, bytes32 nonce) internal {
        if (balanceOf(to, tier) > 0) revert AlreadyHolder();
        if (passOf(to) == 0) memberCount++;
        _mint(to, tier, 1, "");
        emit PassMinted(to, tier, nonce);
    }

    function _structHash(Voucher calldata v) internal pure returns (bytes32) {
        return keccak256(abi.encode(VOUCHER_TYPEHASH, v.to, v.tier, v.nonce, v.deadline));
    }

    /// @dev Supports EOA signers and ERC-1271 smart accounts (a Safe can hold SIGNER_ROLE).
    function _recover(Voucher calldata v, bytes calldata sig) internal view returns (address) {
        bytes32 digest = _hashTypedDataV4(_structHash(v));
        (address recovered,,) = _tryRecover(digest, sig);
        return recovered;
    }

    function _tryRecover(bytes32 digest, bytes calldata sig) internal view returns (address, bool, bool) {
        if (sig.length == 65) {
            bytes32 r = bytes32(sig[0:32]);
            bytes32 s = bytes32(sig[32:64]);
            uint8 v = uint8(sig[64]);
            address a = ecrecover(digest, v, r, s);
            if (a != address(0) && uint256(s) <= 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
                return (a, true, false);
            }
        }
        // ERC-1271 path: signature prefixed with the 20-byte signer address.
        if (sig.length > 20) {
            address claimed = address(bytes20(sig[0:20]));
            if (SignatureChecker.isValidERC1271SignatureNow(claimed, digest, sig[20:])) return (claimed, true, true);
        }
        return (address(0), false, false);
    }

    /// @dev Mint and burn only. Any wallet-to-wallet transfer reverts.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0) && to != address(0)) revert Soulbound();
        super._update(from, to, ids, values);
    }

    function setURI(string calldata uri_) external onlyRole(ADMIN_ROLE) {
        _setURI(uri_);
    }

    function supportsInterface(bytes4 id) public view override(ERC1155, AccessControl) returns (bool) {
        return super.supportsInterface(id);
    }
}
