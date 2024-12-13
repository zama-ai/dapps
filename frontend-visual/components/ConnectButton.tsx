'use client'

import { useState, useEffect } from 'react'
import { ethers } from 'ethers'
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from 'lucide-react'

declare global {
    interface Window {
        ethereum?: any;
    }
}

export function ConnectButton() {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState('')

  useEffect(() => {
    checkConnection()
    if (typeof window.ethereum !== 'undefined') {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
    }
    return () => {
      if (typeof window.ethereum !== 'undefined') {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
  }, [])

  async function checkConnection() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum)
        const network = await provider.getNetwork()
        if (network.chainId === BigInt(11155111)) { // Sepolia network ID
          const accounts = await provider.listAccounts()
          if (accounts.length > 0) {
            setIsConnected(true)
            setAddress(accounts[0].address)
          }
        }
      } catch (error) {
        console.error("An error occurred while checking the connection:", error)
      }
    }
  }

  async function connectWallet() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
        })
        const provider = new ethers.BrowserProvider(window.ethereum)
        await provider.send("eth_requestAccounts", [])
        const signer = await provider.getSigner()
        const address = await signer.getAddress()
        setIsConnected(true)
        setAddress(address)
      } catch (error) {
        console.error("An error occurred while connecting the wallet:", error)
      }
    } else {
      alert('Please install MetaMask!')
    }
  }

  async function disconnectWallet() {
    setIsConnected(false)
    setAddress('')
  }

  async function changeAccount() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        })
      } catch (error) {
        console.error("An error occurred while changing the account:", error)
      }
    }
  }

  function handleAccountsChanged(accounts: string[]) {
    if (accounts.length > 0) {
      setIsConnected(true)
      setAddress(accounts[0])
    } else {
      setIsConnected(false)
      setAddress('')
    }
  }

  if (!isConnected) {
    return (
      <Button onClick={connectWallet} variant="outline" className="bg-white text-gray-800 hover:bg-gray-100">
        Connect Wallet
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="bg-white text-gray-800 hover:bg-gray-100">
          {String(address).slice(0, 6)}...{String(address).slice(-4)}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={changeAccount}>
          Change Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={disconnectWallet}>
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
