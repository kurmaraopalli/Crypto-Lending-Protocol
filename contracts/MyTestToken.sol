// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyTestToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("MyTestToken", "MTK") {
        // Mints the initial supply to the deployer wallet with 18 decimal places
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
}
