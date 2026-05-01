// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title ECDSA
 * @author Harshit Singla — "Secure Smart-Contract Permission & Key Management"
 * @notice Minimal ECDSA signature-recovery library with secp256k1 malleability
 *         protection (EIP-2).
 *
 * @dev Design rationale
 *  - We reject any signature whose `s` value lies in the upper half of the
 *    curve order.  This eliminates the well-known signature malleability issue
 *    where (r, s) and (r, n - s) are both valid for the same message, which
 *    could allow an attacker to replay a slightly modified but still valid
 *    signature.
 *  - We also reject `v` values other than 27 and 28.
 *  - A zero-address result from `ecrecover` is treated as an invalid
 *    signature (the precompile returns address(0) on failure).
 *
 * Verification annotations (referenced in the paper):
 *  VA-ECDSA-1  s must be in the lower half-order  (malleability guard)
 *  VA-ECDSA-2  v must be 27 or 28                  (canonical v)
 *  VA-ECDSA-3  recovered address must be non-zero   (precompile success)
 */
library ECDSA {
    // -----------------------------------------------------------------------
    //  Constants
    // -----------------------------------------------------------------------

    /**
     * @dev Half of the secp256k1 curve order.
     *      Any `s` value above this threshold is rejected to prevent
     *      signature malleability (EIP-2).
     *
     *      secp256k1 order n =
     *        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141
     *      n / 2 =
     *        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
     */
    uint256 internal constant _HALF_CURVE_ORDER =
        0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    // -----------------------------------------------------------------------
    //  Errors
    // -----------------------------------------------------------------------

    /// @dev The `s` component of the signature is in the upper half-order.
    error ECDSAInvalidSignatureS(uint256 s);

    /// @dev The `v` recovery identifier is not 27 or 28.
    error ECDSAInvalidSignatureV(uint8 v);

    /// @dev `ecrecover` returned the zero address (invalid signature).
    error ECDSAInvalidSignature();

    // -----------------------------------------------------------------------
    //  Internal functions
    // -----------------------------------------------------------------------

    /**
     * @notice Recover the signer address from a message digest and a
     *         (v, r, s) signature, with full malleability protection.
     *
     * @param digest  The 32-byte EIP-191 / EIP-712 hash that was signed.
     * @param v       Recovery identifier (27 or 28).
     * @param r       First 32 bytes of the signature.
     * @param s       Second 32 bytes of the signature.
     * @return signer The address that produced the signature.
     *
     * @custom:security
     *  VA-ECDSA-1  Reverts if s > _HALF_CURVE_ORDER.
     *  VA-ECDSA-2  Reverts if v is not 27 or 28.
     *  VA-ECDSA-3  Reverts if ecrecover returns address(0).
     */
    function recover(
        bytes32 digest,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal pure returns (address signer) {
        // --- VA-ECDSA-1: reject upper-half s values (malleability guard) ---
        if (uint256(s) > _HALF_CURVE_ORDER) {
            revert ECDSAInvalidSignatureS(uint256(s));
        }

        // --- VA-ECDSA-2: canonical v ---
        if (v != 27 && v != 28) {
            revert ECDSAInvalidSignatureV(v);
        }

        // --- Invoke ecrecover precompile ---
        signer = ecrecover(digest, v, r, s);

        // --- VA-ECDSA-3: ecrecover must succeed ---
        if (signer == address(0)) {
            revert ECDSAInvalidSignature();
        }
    }

    /**
     * @notice Convenience overload that accepts a packed 65-byte signature.
     *
     * @param digest    The 32-byte hash that was signed.
     * @param signature A 65-byte packed signature (r ++ s ++ v).
     * @return signer   The recovered address.
     *
     * @dev Layout of `signature` (65 bytes):
     *      [0 ..31]  r
     *      [32..63]  s
     *      [64]      v
     */
    function recover(
        bytes32 digest,
        bytes memory signature
    ) internal pure returns (address signer) {
        require(signature.length == 65, "ECDSA: invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        // solhint-disable-next-line no-inline-assembly
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        signer = recover(digest, v, r, s);
    }

    /**
     * @notice Prepend the standard Ethereum signed-message prefix and hash.
     *
     * @dev Produces the digest:
     *      keccak256("\x19Ethereum Signed Message:\n32" ++ hash)
     *
     * @param hash  The 32-byte application-specific hash.
     * @return      The prefixed hash ready for `recover`.
     */
    function toEthSignedMessageHash(
        bytes32 hash
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );
    }
}
