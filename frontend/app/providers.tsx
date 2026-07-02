'use client';

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { RainbowKitProvider, darkTheme, getDefaultConfig } from '@rainbow-me/rainbowkit';

// We initialize a standard QueryClient for state caching
const queryClient = new QueryClient();

// Configure Wagmi config with Sepolia testnet support
const config = getDefaultConfig({
  appName: 'Crypto Lending Protocol',
  projectId: '8c983a54d5885e3a0937b2d5a3efce3b', // A safe mock public walletconnect projectId
  chains: [sepolia],
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={darkTheme({
            accentColor: '#6366f1', // Beautiful Indigo
            accentColorForeground: 'white',
            borderRadius: 'medium',
            overlayBlur: 'small',
          })}
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
