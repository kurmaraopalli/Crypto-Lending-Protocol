'use client';

import React, { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { 
  Wallet, 
  ArrowDownCircle, 
  ArrowUpRight, 
  Coins, 
  Settings, 
  ShieldAlert, 
  Activity, 
  Info,
  ExternalLink,
  BookOpen,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

// Minimal ABIs for interacting with contracts
const MTK_ABI = [
  {
    "inputs": [{"name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "value", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

const LENDING_POOL_ABI = [
  {
    "inputs": [{"name": "", "type": "address"}],
    "name": "collateralBalances",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "", "type": "address"}],
    "name": "borrowedBalances",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"name": "_amount", "type": "uint256"}],
    "name": "depositCollateral",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "_amount", "type": "uint256"}],
    "name": "borrowAsset",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export default function Dashboard() {
  const { address: userAddress, isConnected } = useAccount();
  
  // Addresses configuration (with placeholders that user can update on screen)
  const [mtkAddress, setMtkAddress] = useState('0x9A6C48F8327647Cc804c1f189Fa193C804C1f189');
  const [poolAddress, setPoolAddress] = useState('0x22C55E752222329A855F72A855F72A855F72A855');
  const [showConfig, setShowConfig] = useState(false);

  // Input states
  const [approveAmount, setApproveAmount] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [borrowAmount, setBorrowAmount] = useState('');

  // Fallback state variables (for simulation when wallet is disconnected)
  const [mockWalletBalance, setMockWalletBalance] = useState('500');
  const [mockCollateral, setMockCollateral] = useState('0');
  const [mockBorrowed, setMockBorrowed] = useState('0');
  const [mockAllowance, setMockAllowance] = useState('0');
  const [txHistory, setTxHistory] = useState<Array<{ id: number; action: string; amount: string; status: 'Success' | 'Pending' }>>([]);
  const [simAlert, setSimAlert] = useState<string | null>(null);

  // Wagmi Read Contracts
  const { data: mtkBalanceRaw, refetch: refetchMtkBalance } = useReadContract({
    address: mtkAddress as `0x${string}`,
    abi: MTK_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  });

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: mtkAddress as `0x${string}`,
    abi: MTK_ABI,
    functionName: 'allowance',
    args: userAddress && poolAddress ? [userAddress, poolAddress as `0x${string}`] : undefined,
    query: { enabled: !!userAddress }
  });

  const { data: collateralRaw, refetch: refetchCollateral } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI,
    functionName: 'collateralBalances',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  });

  const { data: borrowedRaw, refetch: refetchBorrowed } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: LENDING_POOL_ABI,
    functionName: 'borrowedBalances',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!userAddress }
  });

  // Write contract states
  const { writeContract, data: hash, error: writeError } = useWriteContract();
  const { isLoading: isTxConfirming, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({ hash });

  // Refetch data when transactions complete
  useEffect(() => {
    if (isTxSuccess) {
      refetchMtkBalance();
      refetchAllowance();
      refetchCollateral();
      refetchBorrowed();
    }
  }, [isTxSuccess]);

  // Derived values (on-chain or mock fallback)
  const mtkBalance = isConnected && mtkBalanceRaw ? formatEther(mtkBalanceRaw) : mockWalletBalance;
  const allowance = isConnected && allowanceRaw ? formatEther(allowanceRaw) : mockAllowance;
  const collateral = isConnected && collateralRaw ? formatEther(collateralRaw) : mockCollateral;
  const borrowed = isConnected && borrowedRaw ? formatEther(borrowedRaw) : mockBorrowed;

  // LTV and borrow limit calculations
  const maxBorrow = parseFloat(collateral) / 2;
  const ltvRatio = parseFloat(collateral) > 0 ? (parseFloat(borrowed) / parseFloat(collateral)) * 100 : 0;
  const isDanger = ltvRatio > 40; // close to the 50% liquidation line

  const addTxLog = (action: string, amount: string) => {
    setTxHistory(prev => [
      { id: Date.now(), action, amount, status: 'Success' },
      ...prev.slice(0, 4)
    ]);
  };

  // Mock / Simulated operations when wallet is disconnected
  const handleMockApprove = () => {
    if (!approveAmount || parseFloat(approveAmount) <= 0) return;
    setMockAllowance(approveAmount);
    addTxLog('Approve MTK Spender', `${approveAmount} MTK`);
    setApproveAmount('');
    triggerAlert('Mock approval successful! Allowed LendingPool to transfer MTK.');
  };

  const handleMockDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    const amount = parseFloat(depositAmount);
    const bal = parseFloat(mockWalletBalance);
    const allow = parseFloat(mockAllowance);

    if (amount > bal) {
      triggerAlert('Error: Insufficient MTK balance in wallet.');
      return;
    }
    if (amount > allow) {
      triggerAlert('Error: Deposit amount exceeds approved allowance.');
      return;
    }

    setMockWalletBalance((bal - amount).toString());
    setMockAllowance((allow - amount).toString());
    setMockCollateral((parseFloat(mockCollateral) + amount).toString());
    addTxLog('Deposit Collateral', `${amount} MTK`);
    setDepositAmount('');
    triggerAlert('Mock deposit successful! Collateral locked.');
  };

  const handleMockBorrow = () => {
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) return;
    const amount = parseFloat(borrowAmount);
    const currentCollateral = parseFloat(mockCollateral);
    const currentBorrow = parseFloat(mockBorrowed);

    if (currentCollateral <= 0) {
      triggerAlert('Error: You must deposit collateral first.');
      return;
    }

    // Secure LTV Check (Match smart contract logic)
    const newBorrowedTotal = currentBorrow + amount;
    const limit = currentCollateral / 2;
    if (newBorrowedTotal > limit) {
      triggerAlert('Error: Insufficient collateral! Maximum borrow limit is 50% LTV.');
      return;
    }

    setMockBorrowed(newBorrowedTotal.toString());
    addTxLog('Borrow Asset', `${amount} USDC`);
    setBorrowAmount('');
    triggerAlert('Mock borrow successful! Assets credited.');
  };

  const handleMockMint = () => {
    setMockWalletBalance((parseFloat(mockWalletBalance) + 100).toString());
    addTxLog('Mint test MTK', '100 MTK');
    triggerAlert('100 MTK test tokens minted to your simulated wallet.');
  };

  // Active / Wallet Connected contract calls
  const handleApprove = () => {
    if (!approveAmount || parseFloat(approveAmount) <= 0) return;
    writeContract({
      address: mtkAddress as `0x${string}`,
      abi: MTK_ABI,
      functionName: 'approve',
      args: [poolAddress as `0x${string}`, parseEther(approveAmount)]
    });
  };

  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    writeContract({
      address: poolAddress as `0x${string}`,
      abi: LENDING_POOL_ABI,
      functionName: 'depositCollateral',
      args: [parseEther(depositAmount)]
    });
  };

  const handleBorrow = () => {
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) return;
    writeContract({
      address: poolAddress as `0x${string}`,
      abi: LENDING_POOL_ABI,
      functionName: 'borrowAsset',
      args: [parseEther(borrowAmount)]
    });
  };

  const triggerAlert = (msg: string) => {
    setSimAlert(msg);
    setTimeout(() => setSimAlert(null), 5000);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 flex flex-col justify-between max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 py-6 border-b border-white/10 mb-8">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-rose-500 flex items-center justify-center neon-glow-primary">
            <Coins className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-300 to-rose-400 bg-clip-text text-transparent">
              LendingPool
            </h1>
            <p className="text-xs text-white/50 tracking-wider">OVER-COLLATERALIZED DEFI PROTOCOL</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="p-2.5 rounded-lg border border-white/10 hover:border-indigo-500/50 hover:bg-white/5 transition-all text-white/70"
            title="Configure Contract Addresses"
          >
            <Settings className="h-5 w-5" />
          </button>
          <ConnectButton />
        </div>
      </header>

      {/* DYNAMIC METADATA / NOTIFICATIONS */}
      {simAlert && (
        <div className="mb-6 p-4 rounded-xl glass-panel border-indigo-500/30 flex items-center gap-3 animate-fade-in-down">
          <Info className="h-5 w-5 text-indigo-400 flex-shrink-0" />
          <p className="text-sm font-medium text-indigo-200">{simAlert}</p>
        </div>
      )}

      {writeError && (
        <div className="mb-6 p-4 rounded-xl glass-panel border-rose-500/30 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-400 flex-shrink-0" />
          <p className="text-sm font-medium text-rose-200">{writeError.message || 'Transaction reverted.'}</p>
        </div>
      )}

      {isTxConfirming && (
        <div className="mb-6 p-4 rounded-xl glass-panel border-amber-500/30 flex items-center gap-3 animate-pulse">
          <Activity className="h-5 w-5 text-amber-400" />
          <p className="text-sm font-medium text-amber-200">Transaction pending confirmation on Sepolia network...</p>
        </div>
      )}

      {/* MAIN OVERVIEW GRID */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
        
        {/* LEFT COLUMN: ABOUT / QUICK MANUAL */}
        <section className="lg:col-span-4 flex flex-col gap-6">
          <div className="glass-panel p-6 rounded-2xl">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4 text-indigo-300">
              <BookOpen className="h-5 w-5" /> About the dApp
            </h2>
            <p className="text-sm leading-relaxed text-white/70 mb-4">
              This application showcases a standard over-collateralized borrowing system. Mint mock collateral tokens, approve them, lock them into the protocol pool, and borrow stable assets automatically.
            </p>
            <div className="p-3 bg-indigo-950/20 rounded-xl border border-indigo-500/20 flex gap-2">
              <ShieldAlert className="h-5 w-5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <div className="text-xs leading-relaxed text-indigo-200">
                <strong>Safety Rule:</strong> To maintain pool health, borrowers must adhere to a <strong>50% Loan-to-Value (LTV)</strong> limit. Under-collateralized positions will trigger rejects.
              </div>
            </div>
          </div>

          {/* SIMULATOR MODE INDICATOR */}
          {!isConnected && (
            <div className="glass-panel p-6 rounded-2xl border-amber-500/20 bg-gradient-to-b from-amber-500/5 to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                <h3 className="text-sm font-semibold text-amber-300">Simulated Sandbox Mode</h3>
              </div>
              <p className="text-xs leading-relaxed text-white/60 mb-4">
                You are currently previewing in Simulated Mode. Connect your MetaMask wallet (Sepolia testnet) to initiate actual blockchain transactions.
              </p>
              <button 
                onClick={handleMockMint}
                className="w-full py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-200 text-xs rounded-xl font-medium transition-all"
              >
                + Mint 100 Mock MTK Collateral
              </button>
            </div>
          )}

          {/* TX HISTORY LOGS */}
          <div className="glass-panel p-6 rounded-2xl">
            <h3 className="text-sm font-semibold text-white/70 mb-4 tracking-wider uppercase">Recent Actions</h3>
            {txHistory.length === 0 ? (
              <p className="text-xs text-white/40 text-center py-6">No recent actions logged</p>
            ) : (
              <div className="flex flex-col gap-3">
                {txHistory.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center text-xs p-2 rounded bg-white/5 border border-white/5">
                    <div>
                      <p className="font-semibold text-white/80">{tx.action}</p>
                      <p className="text-[10px] text-white/40">{tx.amount}</p>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {tx.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* MIDDLE/RIGHT COLUMN: DASHBOARD STATS AND ACTION FORMS */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* STATS OVERVIEW CARDS */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex justify-between items-start">
              <div>
                <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-2">Wallet Collateral Balance</p>
                <p className="text-3xl font-extrabold text-white">{parseFloat(mtkBalance).toLocaleString(undefined, {maximumFractionDigits: 4})} <span className="text-sm text-indigo-400">MTK</span></p>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                <Wallet className="h-5 w-5" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex justify-between items-start">
              <div>
                <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-2">Locked Collateral Pool</p>
                <p className="text-3xl font-extrabold text-white">{parseFloat(collateral).toLocaleString(undefined, {maximumFractionDigits: 4})} <span className="text-sm text-rose-400">MTK</span></p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <ArrowDownCircle className="h-5 w-5" />
              </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl glass-panel-hover flex justify-between items-start">
              <div>
                <p className="text-xs text-white/50 font-medium uppercase tracking-wider mb-2">Active Borrow Balance</p>
                <p className="text-3xl font-extrabold text-white">{parseFloat(borrowed).toLocaleString(undefined, {maximumFractionDigits: 4})} <span className="text-sm text-emerald-400">USDC</span></p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <ArrowUpRight className="h-5 w-5" />
              </div>
            </div>
          </section>

          {/* LTV PROGRESS BAR */}
          <section className="glass-panel p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-semibold text-white/70">Loan-To-Value (LTV) Usage</span>
              <span className={`text-sm font-bold ${isDanger ? 'text-rose-400' : 'text-indigo-400'}`}>
                {ltvRatio.toFixed(2)}% / 50.00% Limit
              </span>
            </div>
            
            <div className="w-full bg-white/5 rounded-full h-3 border border-white/5 p-[2px]">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isDanger ? 'bg-gradient-to-r from-rose-500 to-red-500 animate-pulse' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`}
                style={{ width: `${Math.min(ltvRatio * 2, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/30 mt-2 font-medium">
              <span>0% (Safe)</span>
              <span>25% (Warning)</span>
              <span className="text-rose-400/70 font-semibold">50% (Max Borrow / Liquidation Line)</span>
            </div>
          </section>

          {/* ACTION INTERFACE CARD */}
          <section className="glass-panel p-8 rounded-3xl border-white/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 h-48 w-48 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full filter blur-xl pointer-events-none" />
            
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Activity className="h-5 w-5 text-indigo-400" /> Execute Pool Transactions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* APPROVE BLOCK */}
              <div className="flex flex-col justify-between p-5 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-indigo-300 mb-2">1. Approve MTK Spending</h3>
                  <p className="text-xs text-white/60 mb-4 leading-relaxed">
                    Set permissions allowing the pool contract to collect collateral tokens from your wallet.
                  </p>
                  <div className="relative mb-2">
                    <input 
                      type="number" 
                      placeholder="Amount to approve"
                      value={approveAmount}
                      onChange={(e) => setApproveAmount(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl glass-input text-sm"
                    />
                    <span className="absolute right-3.5 top-3 text-xs font-semibold text-white/40">MTK</span>
                  </div>
                  <p className="text-[10px] text-white/40 mb-4">Current authorized allowance: {parseFloat(allowance).toLocaleString()} MTK</p>
                </div>
                <button 
                  onClick={isConnected ? handleApprove : handleMockApprove}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all neon-glow-primary"
                >
                  Authorize Allowance
                </button>
              </div>

              {/* DEPOSIT COLLATERAL BLOCK */}
              <div className="flex flex-col justify-between p-5 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <h3 className="text-sm font-bold text-rose-300 mb-2">2. Lock Collateral</h3>
                  <p className="text-xs text-white/60 mb-4 leading-relaxed">
                    Deposit approved MTK collateral into the protocol's lockbox. Enables borrowing capabilities.
                  </p>
                  <div className="relative mb-4">
                    <input 
                      type="number" 
                      placeholder="Amount to lock"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full py-2.5 px-3.5 rounded-xl glass-input text-sm"
                    />
                    <span className="absolute right-3.5 top-3 text-xs font-semibold text-white/40">MTK</span>
                  </div>
                </div>
                <button 
                  onClick={isConnected ? handleDeposit : handleMockDeposit}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white text-sm font-semibold rounded-xl transition-all neon-glow-secondary"
                >
                  Deposit Collateral
                </button>
              </div>

              {/* BORROW BLOCK */}
              <div className="md:col-span-2 flex flex-col md:flex-row gap-6 items-center justify-between p-6 rounded-2xl bg-indigo-950/20 border border-indigo-500/20">
                <div className="md:max-w-md">
                  <h3 className="text-sm font-bold text-emerald-300 mb-2">3. Borrow Stable Assets</h3>
                  <p className="text-xs text-white/70 leading-relaxed">
                    Withdraw debt assets backed by your locked MTK collateral. Your debt limit increases up to <strong>{maxBorrow.toLocaleString()} USDC</strong> based on your deposited balance.
                  </p>
                </div>
                <div className="w-full md:w-auto flex flex-col sm:flex-row gap-3 items-stretch">
                  <div className="relative">
                    <input 
                      type="number" 
                      placeholder="Amount to borrow"
                      value={borrowAmount}
                      onChange={(e) => setBorrowAmount(e.target.value)}
                      className="w-full sm:w-48 py-2.5 px-3.5 rounded-xl glass-input text-sm"
                    />
                    <span className="absolute right-3.5 top-3 text-xs font-semibold text-white/40">USDC</span>
                  </div>
                  <button 
                    onClick={isConnected ? handleBorrow : handleMockBorrow}
                    className="py-2.5 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl transition-all"
                  >
                    Confirm Borrow
                  </button>
                </div>
              </div>

            </div>
          </section>

        </div>
      </main>

      {/* SETTINGS / CONTRACT CONFIGURATION COMPONENT */}
      {showConfig && (
        <section className="glass-panel p-6 rounded-2xl border-white/10 mb-8 animate-fade-in-up">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Settings className="h-4 w-4 text-indigo-400" /> Contract Configurations (Advanced)
          </h3>
          <p className="text-xs text-white/50 mb-4 leading-relaxed">
            Update contract addresses to interact with your specific deployment on the Sepolia network.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-white/40 font-bold uppercase mb-2">MyTestToken ERC-20 Address</label>
              <input 
                type="text" 
                value={mtkAddress}
                onChange={(e) => setMtkAddress(e.target.value)}
                className="w-full py-2 px-3 rounded-lg glass-input text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] text-white/40 font-bold uppercase mb-2">LendingPool Contract Address</label>
              <input 
                type="text" 
                value={poolAddress}
                onChange={(e) => setPoolAddress(e.target.value)}
                className="w-full py-2 px-3 rounded-lg glass-input text-xs font-mono"
              />
            </div>
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-white/40 font-medium">
        <p>© 2026 Crypto Lending Protocol. Open-Source Educational Demo.</p>
        <div className="flex gap-4">
          <a 
            href="https://sepolia.etherscan.io" 
            target="_blank" 
            rel="noreferrer"
            className="hover:text-indigo-400 transition-colors flex items-center gap-1"
          >
            Sepolia Etherscan <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </footer>

    </div>
  );
}
