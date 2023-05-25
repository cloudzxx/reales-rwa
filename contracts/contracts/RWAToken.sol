// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RWAToken is ERC20, Ownable {
    mapping(address => bool) public whitelist;
    mapping(address => bool) public frozen;

    string public assetName;
    string public issuer;
    string public assetType;
    uint256 public maxSupply;

    event WhitelistUpdated(address indexed account, bool status);
    event FrozenStatusUpdated(address indexed account, bool status);
    event MaxSupplyUpdated(uint256 oldSupply, uint256 newSupply);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _assetName,
        string memory _issuer,
        string memory _assetType,
        uint256 _maxSupply
    ) ERC20(_name, _symbol) Ownable(msg.sender) {
        assetName = _assetName;
        issuer = _issuer;
        assetType = _assetType;
        maxSupply = _maxSupply;
        whitelist[msg.sender] = true;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= maxSupply, "Exceeds max supply");
        require(whitelist[to], "Recipient not whitelisted");
        require(!frozen[to], "Recipient is frozen");
        _mint(to, amount);
    }

    function addToWhitelist(address account) external onlyOwner {
        whitelist[account] = true;
        emit WhitelistUpdated(account, true);
    }

    function removeFromWhitelist(address account) external onlyOwner {
        whitelist[account] = false;
        emit WhitelistUpdated(account, false);
    }

    function freeze(address account) external onlyOwner {
        frozen[account] = true;
        emit FrozenStatusUpdated(account, true);
    }

    function unfreeze(address account) external onlyOwner {
        frozen[account] = false;
        emit FrozenStatusUpdated(account, false);
    }

    function setMaxSupply(uint256 _maxSupply) external onlyOwner {
        require(_maxSupply >= totalSupply(), "New max below current supply");
        emit MaxSupplyUpdated(maxSupply, _maxSupply);
        maxSupply = _maxSupply;
    }

    function getAssetInfo()
        external
        view
        returns (string memory, string memory, string memory, uint256)
    {
        return (assetName, issuer, assetType, maxSupply);
    }

    function _update(address from, address to, uint256 value) internal override {
        if (from != address(0)) {
            require(!frozen[from], "Sender is frozen");
            require(whitelist[from], "Sender not whitelisted");
        }
        if (to != address(0)) {
            require(!frozen[to], "Recipient is frozen");
            require(whitelist[to], "Recipient not whitelisted");
        }
        super._update(from, to, value);
    }
}
