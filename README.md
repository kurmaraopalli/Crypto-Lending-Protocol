# 🏦 Custom Crypto Lending Protocol & Token

A decentralized, over-collateralized lending protocol built for personal testing and educational purposes. This project demonstrates how to mint a custom ERC-20 token from scratch and use it as collateral to borrow assets on a blockchain testnet.

## 🚀 Live Demo
The frontend interface for this project is hosted publicly via GitHub Pages:  
🔗 **[Insert Your GitHub Pages URL Here, e.g., https://github.io]**

---

## 🏗️ Architecture & Project Workflow

This project connects a React/Next.js web interface to smart contracts deployed on the Ethereum Sepolia Testnet.

```text
[Web UI via GitHub Pages] <---> [Crypto Wallet (MetaMask)] <---> [Sepolia Testnet Smart Contracts]
```

1. **Lenders** deposit assets into the liquidity pool to earn passive interest.
2. **Borrowers** lock up custom tokens (`MTK`) as collateral.
3. **Smart Contracts** safely calculate collateral ratios and issue loans automatically.

---

## 🪙 1. Custom Token Smart Contract (`MyTestToken.sol`)

This contract creates a custom ERC-20 token using the secure OpenZeppelin library. This token is used as the foundational collateral asset for our lending platform.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MyTestToken is ERC20 {
    constructor(uint256 initialSupply) ERC20("MyTestToken", "MTK") {
        // Mints the initial supply to the deployer wallet with 18 decimal places
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }
}
```

---

## 💻 2. Basic Lending Smart Contract Structure (`LendingPool.sol`)

A minimalist blueprint handling deposits, collateral locking, and basic borrowing logic.

```solidity
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
        IERC20(collateralToken).transferFrom(msg.sender, address(this), _amount);
        collateralBalances[msg.sender] += _amount;
    }

    // Basic mock borrow function (simulates lending asset back to user)
    function borrowAsset(uint256 _amount) external {
        // Simplified safety logic: Ensure user has locked collateral first
        require(collateralBalances[msg.sender] > 0, "No collateral deposited");
        borrowedBalances[msg.sender] += _amount;
        // Logic to transfer borrowed tokens to user goes here
    }
}
```

---

## 🛠️ Tech Stack & Tools

* **Smart Contracts:** Solidity, OpenZeppelin ERC-20 Standard.
* **Development Environment:** Remix IDE / Hardhat / Foundry.
* **Test Network:** Ethereum Sepolia Testnet.
* **Frontend Web App:** React / Next.js with Tailwind CSS.
* **Blockchain Bridge:** Ethers.js / Wagmi & RainbowKit (Wallet Connection).
* **Hosting Platform:** GitHub Pages.

---

## 🏃‍♂️ Local Deployment & Testing Instructions

### Step 1: Deploying the Contracts
1. Copy the contract codes above into [Remix IDE](https://ethereum.org).
2. Compile both contracts using Solidity Compiler version `0.8.20` or higher.
3. Switch your Remix Environment tab to **Injected Provider - MetaMask**. Ensure your wallet is set to the **Sepolia Test Network**.
4. Deploy `MyTestToken` first with a supply of `1000000`. Copy its deployed contract address.
5. Deploy `LendingPool`, pasting the token contract address into the constructor input.

### Step 2: Running the Frontend & GitHub Pages
1. Clone this repository locally: `git clone <your-repo-url>`
2. Install frontend dependencies: `npm install`
3. Open your configuration file and replace the placeholder variables with your new **Contract Addresses** and **ABIs**.
4. Test the frontend app locally: `npm run dev`
5. Deploy your frontend build straight to GitHub pages using the deployment script:
   ```bash
   npm run deploy
   ```

---

## 🔒 Security Practices Reminder
* **Never** check private keys, wallet seed phrases, or Alchemy/Infura API keys into GitHub.
* Keep all sensitive deployment keys safely isolated inside a local `.env` file.
* Always ensure your `.env` filename is explicitly written into your `.gitignore` file before committing code.

## 📄 License
This project is open-source software licensed under the [MIT License](LICENSE).
