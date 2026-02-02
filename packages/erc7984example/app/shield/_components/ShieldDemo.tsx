"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ethers } from "ethers";
import {
  useFhevmStatus,
  useShield,
  useUnshield,
  useConfidentialBalances,
  useEthersSigner,
  ERC20_ABI,
} from "fhevm-sdk";
import { useAccount } from "wagmi";
import { PrivyConnectButton } from "~~/components/helper/PrivyConnectButton";
import { notification } from "~~/utils/helper/notification";
import {
  WRAPPER_TOKEN_LIST,
  formatTokenAmount,
  parseTokenAmount,
  type WrapperToken,
} from "~~/utils/tokens";
import { RecoverUnwrap } from "./RecoverUnwrap";

/**
 * Token pair data for display
 */
interface TokenPairData {
  token: WrapperToken;
  erc20Balance: bigint | undefined;
  isLoadingErc20: boolean;
}

/**
 * Shield/Unshield Modal
 */
interface ModalState {
  isOpen: boolean;
  mode: "shield" | "unshield";
  token: WrapperToken | null;
}

/**
 * Shield/Unshield Wallet Demo
 */
export const ShieldDemo = () => {
  const { isConnected, address } = useAccount();
  const { isReady: fhevmIsReady } = useFhevmStatus();
  const { provider } = useEthersSigner();

  // Token balances state
  const [tokenData, setTokenData] = useState<Map<string, TokenPairData>>(
    new Map()
  );


  // Modal state
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    mode: "shield",
    token: null,
  });

  // Amount input
  const [amount, setAmount] = useState("");

  // Toast refs
  const fhevmToastShownRef = useRef(false);

  // Active token for hooks (the one currently in modal)
  const activeToken = modal.token;

  // Shield hook
  const {
    shield,
    status: shieldStatus,
    isPending: isShieldPending,
    isApproving,
    isWrapping,
    error: shieldError,
    reset: resetShield,
  } = useShield({
    wrapperAddress: activeToken?.wrapper ?? "0x0000000000000000000000000000000000000000",
    underlyingAddress: activeToken?.underlying,
    onSuccess: () => {
      notification.success("Shield successful!");
      setAmount("");
      setModal({ isOpen: false, mode: "shield", token: null });
      fetchAllBalances();
    },
    onError: (err) => {
      notification.error(`Shield failed: ${err.message}`);
    },
  });

  // Unshield hook
  const {
    unshield,
    status: unshieldStatus,
    isPending: isUnshieldPending,
    isEncrypting,
    isSigning,
    isDecrypting: isUnshieldDecrypting,
    isFinalizing,
    error: unshieldError,
    reset: resetUnshield,
  } = useUnshield({
    wrapperAddress: activeToken?.wrapper ?? "0x0000000000000000000000000000000000000000",
    onSuccess: () => {
      notification.success("Unshield request submitted!");
      setAmount("");
      setModal({ isOpen: false, mode: "shield", token: null });
      fetchAllBalances();
    },
    onError: (err) => {
      notification.error(`Unshield failed: ${err.message}`);
    },
  });

  // Confidential balances with manual decryption
  const {
    data: confidentialData,
    decryptAll,
    isDecrypting,
    canDecrypt,
    isAllDecrypted,
  } = useConfidentialBalances({
    contracts: WRAPPER_TOKEN_LIST.map((t) => ({ contractAddress: t.wrapper })),
    account: address,
    enabled: Boolean(address && provider),
    decrypt: true,
  });

  // Fetch all balances (ERC20 only)
  const fetchAllBalances = useCallback(async () => {
    if (!provider || !address) {
      console.log("[ShieldDemo] Cannot fetch balances: provider or address missing", { provider: !!provider, address });
      return;
    }

    console.log("[ShieldDemo] Fetching ERC20 balances for", address);

    // Fetch ERC20 balances
    for (const token of WRAPPER_TOKEN_LIST) {
      try {
        const erc20 = new ethers.Contract(token.underlying, ERC20_ABI, provider);
        const balance = await erc20.balanceOf(address);

        console.log(`[ShieldDemo] ${token.underlyingSymbol} balance:`, balance.toString());

        setTokenData((prev) => {
          const updated = new Map(prev);
          updated.set(token.symbol, {
            token,
            erc20Balance: BigInt(balance),
            isLoadingErc20: false,
          });
          return updated;
        });
      } catch (err) {
        console.error(`[ShieldDemo] Failed to fetch ${token.symbol} balance:`, err);
      }
    }
  }, [provider, address]);

  // Fetch when provider and address are ready
  useEffect(() => {
    if (!provider || !address) return;
    fetchAllBalances();
  }, [provider, address, fetchAllBalances]);

  // FHEVM ready notification
  useEffect(() => {
    if (fhevmIsReady && !fhevmToastShownRef.current) {
      notification.success("FHE encryption ready!");
      fhevmToastShownRef.current = true;
    }
  }, [fhevmIsReady]);

  // Handle shield
  const handleShield = useCallback(async () => {
    if (!amount || !activeToken) {
      notification.warning("Please enter an amount");
      return;
    }

    try {
      const parsedAmount = parseTokenAmount(amount, activeToken.decimals);
      if (parsedAmount <= BigInt(0)) {
        notification.error("Amount must be greater than 0");
        return;
      }

      await shield(parsedAmount);
    } catch (err) {
      notification.error("Invalid amount format");
    }
  }, [amount, activeToken, shield]);

  // Handle unshield
  const handleUnshield = useCallback(async () => {
    if (!amount || !activeToken) {
      notification.warning("Please enter an amount");
      return;
    }

    try {
      // Confidential token uses 6 decimals
      const parsedAmount = parseTokenAmount(amount, 6);
      if (parsedAmount <= BigInt(0)) {
        notification.error("Amount must be greater than 0");
        return;
      }

      await unshield(parsedAmount);
    } catch (err) {
      notification.error("Invalid amount format");
    }
  }, [amount, activeToken, unshield]);

  // Open modal
  const openModal = (token: WrapperToken, mode: "shield" | "unshield") => {
    setModal({ isOpen: true, mode, token });
    setAmount("");
    resetShield();
    resetUnshield();
  };

  // Close modal
  const closeModal = () => {
    setModal({ isOpen: false, mode: "shield", token: null });
    setAmount("");
  };

  // Get decrypted balance for modal token
  const getModalDecryptedBalance = useCallback((): bigint | undefined => {
    if (!modal.token) return undefined;
    const index = WRAPPER_TOKEN_LIST.findIndex((t) => t.symbol === modal.token!.symbol);
    if (index === -1) return undefined;
    return confidentialData[index]?.decryptedValue as bigint | undefined;
  }, [modal.token, confidentialData]);

  // Not connected state
  if (!isConnected) {
    return (
      <div className="max-w-4xl mx-auto p-6 min-h-[60vh] flex items-center justify-center">
        <div className="bg-white p-12 text-center max-w-md border border-gray-200">
          <div className="mb-6">
            <span className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 text-4xl">
              🔒
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-3">
            Connect Wallet
          </h2>
          <p className="text-gray-500 mb-8">
            Connect your wallet to view and manage your shielded tokens.
          </p>
          <PrivyConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
    <div className="max-w-5xl w-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Wallet</h1>

        {/* Decrypt Button */}
        {!isAllDecrypted && (
          <button
            onClick={decryptAll}
            disabled={!canDecrypt || isDecrypting}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDecrypting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Decrypting...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Reveal Balances
              </>
            )}
          </button>
        )}

        {isAllDecrypted && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Balances Revealed
          </div>
        )}
      </div>

      {/* Recovery for pending unwraps */}
      <RecoverUnwrap />

      {/* Token List */}
      <div className="bg-white border border-gray-200 overflow-hidden">
        {WRAPPER_TOKEN_LIST.map((token, index) => {
          const data = tokenData.get(token.symbol);
          const confData = confidentialData[index];
          const decryptedBalance = confData?.decryptedValue as bigint | undefined;

          return (
            <div key={token.symbol} className="border-b border-gray-100 last:border-b-0">
              {/* Unshielded Row (ERC20) */}
              <div className="flex items-center px-6 py-4 hover:bg-gray-50 transition-colors">
                {/* Token Icon */}
                <div className="relative mr-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                    {token.underlyingSymbol.charAt(0)}
                  </div>
                </div>

                {/* Token Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">
                    {token.underlyingSymbol}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                    Unshielded
                  </div>
                </div>

                {/* Balance */}
                <div className="text-right mr-8 w-32">
                  <div className="font-medium text-gray-900">
                    {data?.isLoadingErc20 ? (
                      <span className="text-gray-400">...</span>
                    ) : data?.erc20Balance !== undefined ? (
                      formatTokenAmount(data.erc20Balance, token.decimals)
                    ) : (
                      "0"
                    )}
                  </div>
                </div>

                {/* USD Value placeholder */}
                <div className="text-right mr-8 w-24">
                  <span className="text-gray-400">$ 0</span>
                </div>

                {/* Shield Button */}
                <button
                  onClick={() => openModal(token, "shield")}
                  className="flex items-center justify-center gap-2 w-32 py-2 bg-[#FFD208] hover:bg-[#E5BC00] text-gray-900 font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Shield
                </button>
              </div>

              {/* Shielded Row (Confidential) */}
              <div className="flex items-center px-6 py-4 hover:bg-gray-50 transition-colors bg-gray-50/50">
                {/* Token Icon with lock badge */}
                <div className="relative mr-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">
                    {token.underlyingSymbol.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-yellow-400 flex items-center justify-center">
                    <svg className="w-3 h-3 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                {/* Token Info */}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900">{token.symbol}</div>
                  <div className="flex items-center text-sm text-gray-500">
                    <svg className="w-4 h-4 mr-1 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Shielded
                  </div>
                </div>

                {/* Balance */}
                <div className="text-right mr-8 w-32">
                  {!confData?.result ? (
                    <div className="font-medium text-gray-900">0</div>
                  ) : isDecrypting ? (
                    <div className="flex items-center justify-end gap-2 text-gray-500">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span className="italic">Decrypting...</span>
                    </div>
                  ) : decryptedBalance !== undefined ? (
                    <div className="font-medium text-gray-900">
                      {formatTokenAmount(decryptedBalance, 6)}
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1 text-gray-500">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="italic">Encrypted</span>
                    </div>
                  )}
                </div>

                {/* USD Value placeholder */}
                <div className="text-right mr-8 w-24">
                  <span className="text-gray-400">$ 0</span>
                </div>

                {/* Unshield Button */}
                <button
                  onClick={() => openModal(token, "unshield")}
                  className="flex items-center justify-center gap-2 w-32 py-2 bg-white hover:bg-gray-100 text-gray-700 font-medium border border-gray-300 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  </svg>
                  Unshield
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {modal.isOpen && modal.token && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white max-w-md w-full p-6 border border-gray-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                {modal.mode === "shield" ? "Shield" : "Unshield"}{" "}
                {modal.mode === "shield"
                  ? modal.token.underlyingSymbol
                  : modal.token.symbol}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Amount Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full px-4 py-3 pr-20 bg-gray-50 border border-gray-200 focus:outline-none focus:border-yellow-400 font-mono text-lg"
                />
                {(modal.mode === "shield" || (modal.mode === "unshield" && getModalDecryptedBalance() !== undefined)) && (
                  <button
                    onClick={() => {
                      if (modal.mode === "shield") {
                        const data = tokenData.get(modal.token!.symbol);
                        if (data?.erc20Balance) {
                          setAmount(formatTokenAmount(data.erc20Balance, modal.token!.decimals, 18));
                        }
                      } else {
                        const balance = getModalDecryptedBalance();
                        if (balance !== undefined) {
                          setAmount(formatTokenAmount(balance, 6, 6));
                        }
                      }
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium transition-colors"
                  >
                    MAX
                  </button>
                )}
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {modal.mode === "shield" ? (
                  <>
                    Available:{" "}
                    {tokenData.get(modal.token.symbol)?.erc20Balance !== undefined
                      ? formatTokenAmount(
                          tokenData.get(modal.token.symbol)!.erc20Balance!,
                          modal.token.decimals
                        )
                      : "0"}{" "}
                    {modal.token.underlyingSymbol}
                  </>
                ) : getModalDecryptedBalance() !== undefined ? (
                  <>
                    Available:{" "}
                    {formatTokenAmount(getModalDecryptedBalance()!, 6)}{" "}
                    {modal.token.symbol}
                  </>
                ) : (
                  <>
                    Balance is encrypted.{" "}
                    <button
                      onClick={decryptAll}
                      disabled={!canDecrypt || isDecrypting}
                      className="text-purple-600 hover:text-purple-700 font-medium underline disabled:opacity-50"
                    >
                      Reveal balances
                    </button>{" "}
                    to see available amount.
                  </>
                )}
              </p>
            </div>

            {/* Info */}
            <div className="mb-6 p-4 bg-gray-50">
              <p className="text-sm text-gray-600">
                {modal.mode === "shield" ? (
                  <>
                    Convert your {modal.token.underlyingSymbol} to confidential{" "}
                    {modal.token.symbol}. Your balance will be encrypted on-chain.
                  </>
                ) : (
                  <>
                    Convert your {modal.token.symbol} back to{" "}
                    {modal.token.underlyingSymbol}. Tokens will arrive after
                    finalization.
                  </>
                )}
              </p>
            </div>

            {/* Error */}
            {(shieldError || unshieldError) && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200">
                <p className="text-sm text-red-600">
                  {shieldError?.message || unshieldError?.message}
                </p>
              </div>
            )}

            {/* Action Button */}
            <button
              onClick={modal.mode === "shield" ? handleShield : handleUnshield}
              disabled={
                modal.mode === "shield"
                  ? isShieldPending || !amount
                  : isUnshieldPending || !amount || !fhevmIsReady
              }
              className={`w-full py-3 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                modal.mode === "shield"
                  ? "bg-[#FFD208] hover:bg-[#E5BC00] text-gray-900"
                  : "bg-gray-900 hover:bg-gray-800 text-white"
              }`}
            >
              {modal.mode === "shield" ? (
                isApproving ? (
                  "Approving..."
                ) : isWrapping ? (
                  "Wrapping..."
                ) : shieldStatus === "confirming" ? (
                  "Confirming..."
                ) : (
                  `Shield ${modal.token.underlyingSymbol}`
                )
              ) : isEncrypting ? (
                "Encrypting..."
              ) : isSigning ? (
                "Sign in wallet..."
              ) : unshieldStatus === "confirming" ? (
                "Confirming..."
              ) : isUnshieldDecrypting ? (
                "Getting proof..."
              ) : isFinalizing ? (
                "Finalizing..."
              ) : (
                `Unshield ${modal.token.symbol}`
              )}
            </button>

            {!fhevmIsReady && modal.mode === "unshield" && (
              <p className="mt-3 text-sm text-amber-600 text-center">
                Waiting for FHE encryption to initialize...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
};
