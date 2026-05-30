// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RWAToken is ERC20, Ownable {
    // 记录地址是否被批准持有/转账代币
    mapping(address => bool) public whitelist;
    // 记录地址是否被冻结（禁止所有转账）
    mapping(address => bool) public frozen;

    // 链上元数据：描述该代币对应的真实资产信息
    string public assetName;
    string public issuer;
    string public assetType;
    // 最大供应量：铸造总量不能超过此上限
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
        require(_maxSupply > 0, "Max supply must be > 0");
        maxSupply = _maxSupply;
    // 构造函数自动将部署者加入白名单，确保部署后可以立即铸造和转账
        whitelist[msg.sender] = true;
    }

    // Owner 专用：向 `to` 地址铸造 `amount` 个代币
    // 受白名单、冻结状态和供应上限三重约束
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= maxSupply, "Exceeds max supply");
        require(whitelist[to], "Recipient not whitelisted");
        require(!frozen[to], "Recipient is frozen");
        _mint(to, amount);
    }

    // 白名单管理：仅 Owner 可以添加或移除地址
    function addToWhitelist(address account) external onlyOwner {
        whitelist[account] = true;
        emit WhitelistUpdated(account, true);
    }

    function removeFromWhitelist(address account) external onlyOwner {
        whitelist[account] = false;
        emit WhitelistUpdated(account, false);
    }

    // 冻结管理：被冻结的地址无法发送或接收任何代币
    function freeze(address account) external onlyOwner {
        frozen[account] = true;
        emit FrozenStatusUpdated(account, true);
    }

    function unfreeze(address account) external onlyOwner {
        frozen[account] = false;
        emit FrozenStatusUpdated(account, false);
    }

    // 禁止主动放弃所有权——RWA 合约的所有权不可转让
    function renounceOwnership() public override onlyOwner {
        revert("Cannot renounce ownership");
    }

    // Owner 专用：更新最大供应量（不能低于当前已铸造总数）
    function setMaxSupply(uint256 _maxSupply) external onlyOwner {
        require(_maxSupply >= totalSupply(), "New max below current supply");
        uint256 oldSupply = maxSupply;
        maxSupply = _maxSupply;
        emit MaxSupplyUpdated(oldSupply, _maxSupply);
    }

    // 一次调用返回完整的链上资产元数据
    function getAssetInfo()
        external
        view
        returns (string memory, string memory, string memory, uint256)
    {
        return (assetName, issuer, assetType, maxSupply);
    }

    // 重写 ERC20 内部的 _update 钩子，注入合规检查
    // 铸造时 from==0，销毁时 to==0，跳过对应的检查
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
