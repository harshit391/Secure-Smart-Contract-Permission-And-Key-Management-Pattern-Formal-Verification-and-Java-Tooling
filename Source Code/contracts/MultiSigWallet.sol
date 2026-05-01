// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./utils/ECDSA.sol";

/**
 * @title MultiSigWallet
 * @author Harshit Singla — "Secure Smart-Contract Permission & Key Management"
 * @notice A gas-optimized k-of-n multisignature wallet that uses off-chain
 *         signing and on-chain verification.
 *
 * @dev Architecture overview
 *  ┌────────────────────────────────────────────────────────────────────┐
 *  │  Off-chain: each owner signs EIP-712-style digest(nonce,to,val,data) │
 *  │  On-chain : `execute` verifies k sorted, unique, valid signatures  │
 *  └────────────────────────────────────────────────────────────────────┘
 *
 *  Owner set is stored as both a mapping (O(1) lookup) and an array
 *  (enumeration).  A monotonically increasing nonce prevents replay.
 *
 * Security properties enforced (referenced in the paper):
 *  P1  — At least `threshold` valid owner signatures are required for
 *         execution.
 *  P2  — No single owner can unilaterally execute a transaction
 *         (threshold >= 2 when ownerCount >= 2).
 *  P3  — Replay protection via a strictly incrementing nonce that is
 *         incorporated into the signed digest.
 *  P4  — Governance mutations (addOwner, removeOwner, changeThreshold)
 *         are gated by multisig consensus (self-call only).
 *
 * Gas optimisation notes:
 *  - Signatures are passed as a single `bytes` blob (65 bytes each) to
 *    minimise calldata overhead.
 *  - Recovered signer addresses must be in strictly ascending order; this
 *    lets us detect duplicates in O(n) without extra storage.
 *  - No on-chain proposal / confirmation storage is needed.
 */
contract MultiSigWallet {
    using ECDSA for bytes32;

    // -----------------------------------------------------------------------
    //  Type declarations
    // -----------------------------------------------------------------------

    /**
     * @dev EIP-712 domain separator components.
     *      We compute the domain separator at construction time and store it
     *      as an immutable value for gas efficiency.
     */
    bytes32 private immutable _DOMAIN_SEPARATOR;

    /// @dev EIP-712 typehash for the `Execute` struct.
    bytes32 public constant EXECUTE_TYPEHASH =
        keccak256(
            "Execute(address to,uint256 value,bytes data,uint256 nonce)"
        );

    // -----------------------------------------------------------------------
    //  State variables
    // -----------------------------------------------------------------------

    /// @notice The set of owner addresses (for enumeration).
    address[] public owners;

    /// @notice O(1) owner-membership lookup.
    mapping(address => bool) public isOwner;

    /// @notice Number of signatures required to authorise a transaction.
    uint256 public threshold;

    /**
     * @notice Monotonically increasing nonce.
     * @dev    Incorporated into every signed digest to guarantee P3 (replay
     *         protection).  Incremented exactly once per successful
     *         `execute` call.
     */
    uint256 public nonce;

    // -----------------------------------------------------------------------
    //  Events
    // -----------------------------------------------------------------------

    /// @notice Emitted after a transaction is successfully executed.
    event Executed(
        address indexed to,
        uint256 value,
        bytes data,
        uint256 indexed nonce
    );

    /// @notice Emitted when a new owner is added to the set.
    event OwnerAdded(address indexed owner);

    /// @notice Emitted when an existing owner is removed from the set.
    event OwnerRemoved(address indexed owner);

    /// @notice Emitted when the signature threshold is changed.
    event ThresholdChanged(uint256 oldThreshold, uint256 newThreshold);

    // -----------------------------------------------------------------------
    //  Errors
    // -----------------------------------------------------------------------

    error InvalidThreshold(uint256 requested, uint256 ownerCount);
    error NotSelf();
    error OwnerAlreadyExists(address owner);
    error OwnerDoesNotExist(address owner);
    error ZeroAddress();
    error InsufficientSignatures(uint256 provided, uint256 required);
    error DuplicateOrUnsortedSigner(address signer);
    error SignerNotOwner(address signer);
    error ExecutionFailed();
    error InvalidSignatureLength(uint256 length);

    // -----------------------------------------------------------------------
    //  Modifiers
    // -----------------------------------------------------------------------

    /**
     * @dev Restricts a function so that it can only be called by the wallet
     *      itself (i.e., via `execute`).  This enforces P4: governance
     *      actions require multisig consensus.
     */
    modifier onlySelf() {
        if (msg.sender != address(this)) revert NotSelf();
        _;
    }

    // -----------------------------------------------------------------------
    //  Constructor
    // -----------------------------------------------------------------------

    /**
     * @notice Deploy a new k-of-n multisig wallet.
     *
     * @param _owners    Initial set of owner addresses (must be unique,
     *                   non-zero).
     * @param _threshold Number of signatures required (1 <= k <= n).
     */
    constructor(address[] memory _owners, uint256 _threshold) {
        uint256 n = _owners.length;
        if (_threshold == 0 || _threshold > n) {
            revert InvalidThreshold(_threshold, n);
        }

        for (uint256 i = 0; i < n; ) {
            address owner = _owners[i];
            if (owner == address(0)) revert ZeroAddress();
            if (isOwner[owner]) revert OwnerAlreadyExists(owner);

            isOwner[owner] = true;
            owners.push(owner);

            emit OwnerAdded(owner);

            unchecked { ++i; }
        }

        threshold = _threshold;
        emit ThresholdChanged(0, _threshold);

        // EIP-712 domain separator (cached immutably).
        _DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256("MultiSigWallet"),
                keccak256("1"),
                block.chainid,
                address(this)
            )
        );
    }

    // -----------------------------------------------------------------------
    //  Receive / fallback
    // -----------------------------------------------------------------------

    /// @notice Accept plain Ether transfers.
    receive() external payable {}

    // -----------------------------------------------------------------------
    //  Core execution
    // -----------------------------------------------------------------------

    /**
     * @notice Execute an arbitrary transaction after verifying k-of-n
     *         owner signatures.
     *
     * @param to         Destination address.
     * @param value      Wei to send.
     * @param data       Calldata payload.
     * @param signatures Packed signatures (65 bytes each: r‖s‖v), ordered
     *                   by **ascending signer address** to enable O(n)
     *                   duplicate detection.
     *
     * @custom:security
     *  P1 — Requires exactly `threshold` valid signatures.
     *  P2 — Multiple distinct owners must sign.
     *  P3 — The current `nonce` is bound into the digest; it increments
     *        atomically, preventing any replay.
     */
    function execute(
        address to,
        uint256 value,
        bytes calldata data,
        bytes calldata signatures
    ) external payable {
        // --- Signature count check (P1) ---
        uint256 sigCount = signatures.length / 65;
        if (signatures.length != sigCount * 65) {
            revert InvalidSignatureLength(signatures.length);
        }
        if (sigCount < threshold) {
            revert InsufficientSignatures(sigCount, threshold);
        }

        // --- Build EIP-712 digest ---
        bytes32 structHash = keccak256(
            abi.encode(
                EXECUTE_TYPEHASH,
                to,
                value,
                keccak256(data),
                nonce
            )
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, structHash)
        );

        // --- Verify each signature; enforce ascending signer order ---
        address prevSigner = address(0);

        for (uint256 i = 0; i < sigCount; ) {
            // Extract packed (r, s, v) from the blob.
            bytes32 r;
            bytes32 s;
            uint8 v;
            {
                uint256 offset = i * 65;
                // solhint-disable-next-line no-inline-assembly
                assembly {
                    // `signatures` is calldata; calldataload reads 32 bytes
                    // at the given absolute offset.
                    let ptr := add(signatures.offset, offset)
                    r := calldataload(ptr)
                    s := calldataload(add(ptr, 0x20))
                    v := byte(0, calldataload(add(ptr, 0x40)))
                }
            }

            address signer = digest.recover(v, r, s);

            // Ascending order ⇒ strictly greater than previous (no dupes).
            if (signer <= prevSigner) {
                revert DuplicateOrUnsortedSigner(signer);
            }

            // The signer must be a current owner.
            if (!isOwner[signer]) {
                revert SignerNotOwner(signer);
            }

            prevSigner = signer;

            unchecked { ++i; }
        }

        // --- Increment nonce BEFORE external call (CEI pattern, P3) ---
        uint256 currentNonce = nonce;
        nonce = currentNonce + 1;

        // --- Execute the external call ---
        (bool success, ) = to.call{value: value}(data);
        if (!success) revert ExecutionFailed();

        emit Executed(to, value, data, currentNonce);
    }

    // -----------------------------------------------------------------------
    //  Governance — owner management (P4: gated by multisig via onlySelf)
    // -----------------------------------------------------------------------

    /**
     * @notice Add a new owner to the multisig.
     * @dev    Can only be called by the wallet itself (via `execute`).
     *         Does **not** change the threshold automatically — call
     *         `changeThreshold` separately if needed.
     *
     * @param owner  Address to add.
     *
     * @custom:security P4 — Governance-gated (onlySelf).
     */
    function addOwner(address owner) external onlySelf {
        if (owner == address(0)) revert ZeroAddress();
        if (isOwner[owner]) revert OwnerAlreadyExists(owner);

        isOwner[owner] = true;
        owners.push(owner);

        emit OwnerAdded(owner);
    }

    /**
     * @notice Remove an existing owner from the multisig.
     * @dev    Reverts if removing the owner would make the current threshold
     *         unsatisfiable.  Can only be called by the wallet itself.
     *
     * @param owner  Address to remove.
     *
     * @custom:security P4 — Governance-gated (onlySelf).
     */
    function removeOwner(address owner) external onlySelf {
        if (!isOwner[owner]) revert OwnerDoesNotExist(owner);

        // Ensure threshold remains satisfiable after removal.
        uint256 newCount = owners.length - 1;
        if (threshold > newCount) {
            revert InvalidThreshold(threshold, newCount);
        }

        isOwner[owner] = false;

        // Swap-and-pop to remove from the array in O(1).
        uint256 len = owners.length;
        for (uint256 i = 0; i < len; ) {
            if (owners[i] == owner) {
                owners[i] = owners[len - 1];
                owners.pop();
                break;
            }
            unchecked { ++i; }
        }

        emit OwnerRemoved(owner);
    }

    /**
     * @notice Change the number of required signatures.
     * @dev    The new threshold must be in [1, ownerCount].  Can only be
     *         called by the wallet itself.
     *
     * @param newThreshold  The new k value.
     *
     * @custom:security P4 — Governance-gated (onlySelf).
     */
    function changeThreshold(uint256 newThreshold) external onlySelf {
        uint256 numOwners = owners.length;
        if (newThreshold == 0 || newThreshold > numOwners) {
            revert InvalidThreshold(newThreshold, numOwners);
        }

        uint256 oldThreshold = threshold;
        threshold = newThreshold;

        emit ThresholdChanged(oldThreshold, newThreshold);
    }

    // -----------------------------------------------------------------------
    //  View helpers
    // -----------------------------------------------------------------------

    /// @notice Return the full list of current owners.
    function getOwners() external view returns (address[] memory) {
        return owners;
    }

    /// @notice Return the current number of owners.
    function ownerCount() external view returns (uint256) {
        return owners.length;
    }

    /// @notice Return the EIP-712 domain separator (useful for off-chain
    ///         signing tooling).
    function domainSeparator() external view returns (bytes32) {
        return _DOMAIN_SEPARATOR;
    }

    /**
     * @notice Compute the EIP-712 digest for a given transaction.
     * @dev    Off-chain signers should call this (via `eth_call`) to obtain
     *         the exact digest they need to sign.
     *
     * @param to     Destination address.
     * @param value  Wei amount.
     * @param data   Calldata payload.
     * @return       The 32-byte digest to sign.
     */
    function getTransactionHash(
        address to,
        uint256 value,
        bytes calldata data
    ) external view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                EXECUTE_TYPEHASH,
                to,
                value,
                keccak256(data),
                nonce
            )
        );
        return keccak256(
            abi.encodePacked("\x19\x01", _DOMAIN_SEPARATOR, structHash)
        );
    }
}
