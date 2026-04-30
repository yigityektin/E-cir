// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal CREATE2 factory used to deploy ReputationHook at a
///         hook-flag-compliant address mined off-chain.
contract Create2Deployer {
    event Deployed(address indexed addr, bytes32 salt);

    function deploy(bytes32 salt, bytes memory bytecode) external payable returns (address addr) {
        assembly {
            addr := create2(callvalue(), add(bytecode, 0x20), mload(bytecode), salt)
        }
        require(addr != address(0), "Create2Deployer: failed");
        emit Deployed(addr, salt);
    }

    function computeAddress(bytes32 salt, bytes32 bytecodeHash) external view returns (address) {
        return address(
            uint160(uint256(keccak256(
                abi.encodePacked(bytes1(0xff), address(this), salt, bytecodeHash)
            )))
        );
    }
}
