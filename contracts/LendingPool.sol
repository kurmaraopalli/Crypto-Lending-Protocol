// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract LendingPool {
    address public collateralToken; // Address of your custom MTK token
    mapping(address => uint256) public collateralBalances;
    mapping(address => uint256) public borrowedBalances;

    constructor(address _collateralToken) {
        collateralToken = _collateralToken;
    }

    // Lock custom MTK tokens into the contract as collateral
    function depositCollateral(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        require(IERC20(collateralToken).transferFrom(msg.sender, address(this), _amount), "Collateral transfer failed");
        collateralBalances[msg.sender] += _amount;
    }

    // Basic mock borrow function (simulates lending asset back to user)
    function borrowAsset(uint256 _amount) external {
        require(_amount > 0, "Amount must be greater than 0");
        // Over-collateralization check: User can borrow up to 50% of their deposited collateral
        uint256 maxBorrow = collateralBalances[msg.sender] / 2;
        require(borrowedBalances[msg.sender] + _amount <= maxBorrow, "Insufficient collateral (must be 200% collateralized)");
        
        borrowedBalances[msg.sender] += _amount;
        // Logic to transfer borrowed tokens to user goes here
    }
}
