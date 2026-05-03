// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IENSRegistry {
    function owner(bytes32 node) external view returns (address);
}

/// @notice Minimal ENS resolver supporting addr(bytes32) — EIP-137 / EIP-2304.
contract AddrResolver {
    // interface IDs used by ethers.js EnsResolver
    bytes4 private constant ADDR_INTERFACE_ID      = 0x3b3b57de; // addr(bytes32)
    bytes4 private constant INTERFACE_META_ID       = 0x01ffc9a7; // supportsInterface

    IENSRegistry public immutable ens;

    mapping(bytes32 => address) private _addrs;

    event AddrChanged(bytes32 indexed node, address addr);

    constructor(address _ens) {
        ens = IENSRegistry(_ens);
    }

    modifier authorised(bytes32 node) {
        require(ens.owner(node) == msg.sender, "AddrResolver: not authorised");
        _;
    }

    function setAddr(bytes32 node, address _addr) external authorised(node) {
        _addrs[node] = _addr;
        emit AddrChanged(node, _addr);
    }

    function addr(bytes32 node) external view returns (address) {
        return _addrs[node];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == ADDR_INTERFACE_ID || interfaceId == INTERFACE_META_ID;
    }
}
