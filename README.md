# 🏦 Custom Crypto Lending Protocol & Token

A decentralized, over-collateralized lending protocol built for personal testing and educational purposes. This project demonstrates how to mint a custom ERC-20 token from scratch and use it as collateral to borrow assets on a blockchain testnet.

## 🚀 Live Demo
The frontend interface for this project is hosted publicly via GitHub Pages:  
🔗 **[Insert Your GitHub Pages URL Here, e.g., https://github.io]**

---

## 🔒 Introduction to Cryptography & Its Uses

Cryptography is the science and practice of securing communication and data from adversaries. In blockchain networks like Ethereum, cryptography is the foundation that enables trustless, decentralized security.

### Core Concepts
1. **Symmetric Cryptography**: Uses a single shared key to both encrypt and decrypt data (e.g., AES).
2. **Asymmetric (Public-Key) Cryptography**: Uses a mathematically linked key pair:
   * **Public Key**: Accessible to anyone, used to encrypt data or verify a signature (akin to a bank account number).
   * **Private Key**: Kept strictly secret, used to decrypt data or generate a signature (akin to a digital signature/password).
3. **Cryptographic Hash Functions**: One-way mathematical functions (like SHA-256 or Keccak-256) that convert any input into a unique, fixed-size string of characters. They are preimage resistant, second-preimage resistant, and collision resistant.

### Key Uses in Blockchain & Lending Protocols
* **Digital Signatures**: When you interact with this Lending Protocol via MetaMask, you use your private key to sign a transaction. The network uses your public key to verify that you authorized the action without ever revealing your private key.
* **Address Generation**: Blockchain addresses (like your Ethereum wallet address) are cryptographically derived from your public key.
* **Block Integrity (Hashing)**: Transactions are hashed and grouped into blocks. Each block references the previous block's hash, forming an immutable chain of data.
* **Key Derivation (Mnemonic Phrases)**: User wallets generate a master seed phrase that cryptographically derives all accounts and private keys.

---


## 🏗️ Architecture & Project Workflow

This project connects a React/Next.js web interface to smart contracts deployed on the Ethereum Sepolia Testnet.

```mermaid
graph TD
    classDef actor fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e40af;
    classDef client fill:#ecfeff,stroke:#06b6d4,stroke-width:2px,color:#155e75;
    classDef wallet fill:#faf5ff,stroke:#a855f7,stroke-width:2px,color:#6b21a8;
    classDef contract fill:#fff1f2,stroke:#f43f5e,stroke-width:2px,color:#9f1239;
    classDef token fill:#f0fdf4,stroke:#22c55e,stroke-width:2px,color:#166534;
    classDef network fill:#fffbeb,stroke:#f59e0b,stroke-width:2px,color:#78350f;

    subgraph Actors ["Users & Actors"]
        Lender["Lender<br/>(Liquidity Provider)"]:::actor
        Borrower["Borrower<br/>(Collateral Depositor)"]:::actor
    end

    subgraph Client_Layer ["Frontend Client Layer"]
        ReactUI["Next.js Web UI<br/>(GitHub Pages)"]:::client
        Bridge["Ethers.js / Wagmi & RainbowKit<br/>(dApp Bridge)"]:::client
        Wallet["MetaMask / Crypto Wallet<br/>(Transaction Signer)"]:::wallet
    end

    subgraph Blockchain_Layer ["Ethereum Sepolia Testnet"]
        subgraph Smart_Contracts ["Smart Contracts"]
            LP["LendingPool.sol<br/>(Lending Pool Contract)"]:::contract
            MTK["MyTestToken.sol<br/>(Custom ERC-20 Collateral)"]:::token
        end
    end

    %% User interactions with UI
    Lender -->|1. Deposits Liquidity| ReactUI
    Borrower -->|2. Deposits Collateral & Borrows| ReactUI

    %% UI to Wallet
    ReactUI -->|Triggers UI Events| Bridge
    Bridge -->|Requests Signature| Wallet

    %% Wallet to Blockchain
    Wallet -->|3. Broadcasts Transactions| LP
    Wallet -->|Approve Token Allowance| MTK

    %% Inter-Contract Workflow
    LP -->|Reads Balances / Checks Allowance| MTK
    LP -->|depositCollateral() -> transferFrom| MTK
    LP -.->|Updates collateralBalances Mapping| LP
    LP -.->|Updates borrowedBalances Mapping| LP
```


1. **Lenders** deposit assets into the liquidity pool to earn passive interest.
2. **Borrowers** lock up custom tokens (`MTK`) as collateral.
3. **Smart Contracts** safely calculate collateral ratios and issue loans automatically.

---

## 📖 How to Use the Application

Follow these steps to interact with the dApp (whether on the live demo or running locally):

### Step 1: Connect MetaMask Wallet
1. Open the application in your browser.
2. Click **Connect Wallet** (powered by RainbowKit/Wagmi).
3. Approve the connection in MetaMask and make sure your network is set to the **Ethereum Sepolia Testnet**.

### Step 2: Mint or Acquire `MTK` Collateral Tokens
1. Ensure you have some custom `MTK` tokens in your wallet (minted during deployment or via a Mint button on the UI).
2. Ensure you also have test **Sepolia ETH** in your wallet to cover transaction gas fees (you can obtain this from a Sepolia ETH faucet).

### Step 3: Approve & Deposit Collateral
1. Navigate to the **Deposit Collateral** section of the dApp.
2. Enter the amount of `MTK` tokens you want to lock up as collateral.
3. Click **Approve** to authorize the `LendingPool` contract to transfer your tokens (confirm this approval in MetaMask).
4. Once approved, click **Deposit** to lock your tokens in the contract.

### Step 4: Borrow Assets
1. Check your collateral balance displayed on the dashboard.
2. Navigate to the **Borrow Asset** section.
3. Enter the amount of assets you wish to borrow.
4. **Note:** The contract enforces a **50% Loan-to-Value (LTV)** limit. You can only borrow up to 50% of the value of your deposited collateral.
5. Click **Borrow** and approve the transaction in MetaMask.

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
