// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/// @notice Minimal EIP-137 ENS Registry.
contract ENSRegistry {
    struct Record {
        address owner;
        address resolver;
        uint64  ttl;
    }

    mapping(bytes32 => Record) private _records;

    event NewOwner(bytes32 indexed node, bytes32 indexed label, address owner);
    event Transfer(bytes32 indexed node, address owner);
    event NewResolver(bytes32 indexed node, address resolver);
    event NewTTL(bytes32 indexed node, uint64 ttl);

    constructor() {
        _records[bytes32(0)].owner = msg.sender;
    }

    modifier authorised(bytes32 node) {
        require(_records[node].owner == msg.sender, "ENSRegistry: not authorised");
        _;
    }

    function setOwner(bytes32 node, address _owner) external authorised(node) {
        _records[node].owner = _owner;
        emit Transfer(node, _owner);
    }

    function setSubnodeOwner(bytes32 node, bytes32 label, address _owner)
        external authorised(node) returns (bytes32 subnode)
    {
        subnode = keccak256(abi.encodePacked(node, label));
        _records[subnode].owner = _owner;
        emit NewOwner(node, label, _owner);
    }

    function setResolver(bytes32 node, address _resolver) external authorised(node) {
        _records[node].resolver = _resolver;
        emit NewResolver(node, _resolver);
    }

    function setTTL(bytes32 node, uint64 _ttl) external authorised(node) {
        _records[node].ttl = _ttl;
        emit NewTTL(node, _ttl);
    }

    function owner(bytes32 node) external view returns (address) {
        return _records[node].owner;
    }

    function resolver(bytes32 node) external view returns (address) {
        return _records[node].resolver;
    }

    function ttl(bytes32 node) external view returns (uint64) {
        return _records[node].ttl;
    }

    function recordExists(bytes32 node) external view returns (bool) {
        return _records[node].owner != address(0);
    }
}
