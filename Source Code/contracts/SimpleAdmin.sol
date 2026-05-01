// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleAdmin
 * @notice Minimal single-admin contract used as a gas-cost baseline.
 *         No access control patterns — just a single owner check.
 */
contract SimpleAdmin {
    address public admin;

    constructor() {
        admin = msg.sender;
    }

    function execute(address to, uint256 value, bytes calldata data) external {
        require(msg.sender == admin, "not admin");
        (bool success, ) = to.call{value: value}(data);
        require(success, "call failed");
    }

    function grantRole(address newAdmin) external {
        require(msg.sender == admin, "not admin");
        admin = newAdmin;
    }

    receive() external payable {}
}
