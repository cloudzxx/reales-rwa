// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RWAToken is ERC1155, ERC1155Supply, Ownable {
    struct AssetConfig {
        string name;
        string issuer;
        string assetType;
        uint256 maxSupply;
        bool exists;
    }

    mapping(address => bool) public whitelist;
    mapping(address => bool) public frozen;
    mapping(uint256 => AssetConfig) public assets;
    uint256[] public assetIds;

    event WhitelistUpdated(address indexed account, bool status);
    event FrozenStatusUpdated(address indexed account, bool status);
    event AssetCreated(uint256 indexed tokenId, string name, uint256 maxSupply);

    constructor() ERC1155("") Ownable(msg.sender) {
        whitelist[msg.sender] = true;
    }

    function createAsset(
        uint256 tokenId,
        string memory name,
        string memory issuer,
        string memory assetType,
        string memory uri,
        uint256 maxSupply_
    ) external onlyOwner {
        require(!assets[tokenId].exists, "Asset already exists");
        require(maxSupply_ > 0, "Max supply must be > 0");
        require(bytes(name).length > 0, "Name required");

        assets[tokenId] = AssetConfig(name, issuer, assetType, maxSupply_, true);
        assetIds.push(tokenId);

        if (bytes(uri).length > 0) {
            _setURI(uri);
        }

        emit AssetCreated(tokenId, name, maxSupply_);
    }

    function mint(address to, uint256 tokenId, uint256 amount, bytes memory data) external onlyOwner {
        require(assets[tokenId].exists, "Asset does not exist");
        require(whitelist[to], "Recipient not whitelisted");
        require(!frozen[to], "Recipient is frozen");
        require(totalSupply(tokenId) + amount <= assets[tokenId].maxSupply, "Exceeds max supply");
        _mint(to, tokenId, amount, data);
    }

    function mintBatch(address to, uint256[] memory tokenIds, uint256[] memory amounts, bytes memory data) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(assets[tokenIds[i]].exists, "Asset does not exist");
            require(whitelist[to], "Recipient not whitelisted");
            require(!frozen[to], "Recipient is frozen");
            require(totalSupply(tokenIds[i]) + amounts[i] <= assets[tokenIds[i]].maxSupply, "Exceeds max supply");
        }
        _mintBatch(to, tokenIds, amounts, data);
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

    function renounceOwnership() public override onlyOwner {
        revert("Cannot renounce ownership");
    }

    function setAssetMaxSupply(uint256 tokenId, uint256 newMaxSupply) external onlyOwner {
        require(assets[tokenId].exists, "Asset does not exist");
        require(newMaxSupply >= totalSupply(tokenId), "New max below current supply");
        assets[tokenId].maxSupply = newMaxSupply;
    }

    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override(ERC1155, ERC1155Supply) {
        for (uint256 i = 0; i < ids.length; i++) {
            if (from != address(0)) {
                require(!frozen[from], "Sender is frozen");
                require(whitelist[from], "Sender not whitelisted");
            }
            if (to != address(0)) {
                require(!frozen[to], "Recipient is frozen");
                require(whitelist[to], "Recipient not whitelisted");
            }
        }
        super._update(from, to, ids, values);
    }
}
