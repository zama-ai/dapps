import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { WagmiProvider } from 'wagmi'

import App from './App.tsx'
import { config } from './wagmi.ts'
import { FhevmWrapper } from './FhevmWrapper.tsx'

import './index.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <FhevmWrapper>
          <App />
        </FhevmWrapper>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
)
