// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title RWAToken — 双链 RWA 代币化合约（EVM 端）
/// @notice 基于 ERC1155 的多资产标准，支持同一合约内管理多个不动产代币。
///         每笔转账受合规约束：白名单准入 + 冻结保护 + 供应上限。
/// @dev 继承 ERC1155 (多代币标准)、ERC1155Supply (供应量追踪)、Ownable (权限控制)。
contract RWAToken is ERC1155, ERC1155Supply, Ownable {
    /// @notice 单个资产（tokenId）的链上配置。
    struct AssetConfig {
        string name;          // 资产名称，如 "Shanghai Pudong Office Tower"
        string issuer;        // 发行方名称，如 "RealEstate Corp"
        string assetType;     // 资产类别，如 "Commercial Real Estate"
        uint256 maxSupply;    // 最大供应量（wei 单位）
        bool exists;          // 该 tokenId 是否已初始化
    }

    /// @notice 白名单映射：记录地址是否被允许持有/转账 RWA 代币。
    mapping(address => bool) public whitelist;

    /// @notice 冻结映射：被冻结的地址无法发送或接收任何 RWA 代币。
    mapping(address => bool) public frozen;

    /// @notice 资产配置映射：tokenId → 资产元数据。
    mapping(uint256 => AssetConfig) public assets;

    /// @notice 已注册的资产 ID 列表，用于前端遍历。
    uint256[] public assetIds;

    event WhitelistUpdated(address indexed account, bool status);
    event FrozenStatusUpdated(address indexed account, bool status);
    event AssetCreated(uint256 indexed tokenId, string name, uint256 maxSupply);

    /// @notice 部署合约。部署者自动加入白名单。
    /// @dev ERC1155 的 URI 为空，部署后通过 createAsset 的 uri 参数设置。
    constructor() ERC1155("") Ownable(msg.sender) {
        whitelist[msg.sender] = true;
    }

    /// @notice 创建一种新资产。只有 Owner 可调用。
    /// @param tokenId 唯一资产 ID（调用方自行指定，不可重复）
    /// @param name 资产名称
    /// @param issuer 发行方
    /// @param assetType 资产类别
    /// @param uri 元数据 URI（可选，留空则沿用上一次的值）
    /// @param maxSupply_ 最大供应量（wei 单位）
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

    /// @notice 向指定地址铸造指定资产的代币。只有 Owner 可调用。
    /// @param to 接收地址（必须在白名单内且未被冻结）
    /// @param tokenId 资产 ID
    /// @param amount 铸造数量（wei 单位）
    /// @param data 额外数据（可传入空字节）
    function mint(address to, uint256 tokenId, uint256 amount, bytes memory data) external onlyOwner {
        require(assets[tokenId].exists, "Asset does not exist");
        require(whitelist[to], "Recipient not whitelisted");
        require(!frozen[to], "Recipient is frozen");
        require(totalSupply(tokenId) + amount <= assets[tokenId].maxSupply, "Exceeds max supply");
        _mint(to, tokenId, amount, data);
    }

    /// @notice 批量铸造多种资产。只有 Owner 可调用。
    /// @param to 接收地址
    /// @param tokenIds 资产 ID 数组
    /// @param amounts 对应数量数组
    /// @param data 额外数据
    function mintBatch(
        address to,
        uint256[] memory tokenIds,
        uint256[] memory amounts,
        bytes memory data
    ) external onlyOwner {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            require(assets[tokenIds[i]].exists, "Asset does not exist");
            require(whitelist[to], "Recipient not whitelisted");
            require(!frozen[to], "Recipient is frozen");
            require(totalSupply(tokenIds[i]) + amounts[i] <= assets[tokenIds[i]].maxSupply, "Exceeds max supply");
        }
        _mintBatch(to, tokenIds, amounts, data);
    }

    /// @notice 将地址加入白名单。只有 Owner 可调用。
    /// @param account 目标地址
    function addToWhitelist(address account) external onlyOwner {
        whitelist[account] = true;
        emit WhitelistUpdated(account, true);
    }

    /// @notice 将地址移出白名单。只有 Owner 可调用。
    /// @param account 目标地址
    function removeFromWhitelist(address account) external onlyOwner {
        whitelist[account] = false;
        emit WhitelistUpdated(account, false);
    }

    /// @notice 冻结指定地址。冻结后无法发送或接收任何 RWA 代币。
    /// @param account 目标地址
    function freeze(address account) external onlyOwner {
        frozen[account] = true;
        emit FrozenStatusUpdated(account, true);
    }

    /// @notice 解冻指定地址。
    /// @param account 目标地址
    function unfreeze(address account) external onlyOwner {
        frozen[account] = false;
        emit FrozenStatusUpdated(account, false);
    }

    /// @notice 禁止主动放弃所有权。RWA 合约的所有权不可转让。
    function renounceOwnership() public override onlyOwner {
        revert("Cannot renounce ownership");
    }

    /// @notice 更新指定资产的最大供应量。不能低于当前已铸造总数。
    /// @param tokenId 资产 ID
    /// @param newMaxSupply 新的最大供应量
    function setAssetMaxSupply(uint256 tokenId, uint256 newMaxSupply) external onlyOwner {
        require(assets[tokenId].exists, "Asset does not exist");
        require(newMaxSupply >= totalSupply(tokenId), "New max below current supply");
        assets[tokenId].maxSupply = newMaxSupply;
    }

    /// @notice ERC1155 内部转账钩子。每次转账前校验合规约束。
    /// @dev 铸造时 from == address(0)，销毁时 to == address(0)，跳过对应检查。
    ///     批量转账时遍历所有 id，任一不通过即整体回滚。
    /// @param from 发送方
    /// @param to 接收方
    /// @param ids 资产 ID 数组
    /// @param values 对应数量数组
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
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
