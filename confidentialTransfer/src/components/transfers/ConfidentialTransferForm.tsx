import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Unlock, Loader2 } from 'lucide-react';
import { type BaseError } from 'wagmi';
import { useConfidentialTransfer } from '@/hooks/transfer/useConfidentialTransfer';
import { useSigner } from '@/hooks/wallet/useSigner';
import { useAddressValidation } from '@/hooks/useAddressValidation';
import { useTokenBalance } from '@/hooks/transfer/useTokenBalance';
import { useWallet } from '@/hooks/wallet/useWallet';
import { motion, AnimatePresence } from 'framer-motion';
import TransferSuccessMessage from './TransferSuccessMessage';
import RecipientInputField from './RecipientInputField';
import TransferButton from './TransferButton';
import TransferFormError from './TransferFormError';
import AmountInputField from './AmountInputField';
import { useFhevm } from '@/providers/FhevmProvider';
import TransactionStatus from './TransactionStatus';
import { validateForm } from '@/lib/utils/formValidation';
import { TokenAddressForm } from './TokenAddressForm';

export const ConfidentialTransferForm = () => {
  const { address, isSepoliaChain } = useWallet();
  const { signer } = useSigner();
  const { instanceStatus } = useFhevm();

  const [transferAmount, setTransferAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [formError, setFormError] = useState<string>('');
  const { chosenAddress } = useAddressValidation(recipient);
  const [tokenAddress, setTokenAddress] = useState('');

  const tokenBalance = useTokenBalance({
    address,
    tokenAddress,
    enabled: !!address && !!tokenAddress,
    isConfidential: true,
  });

  const {
    transfer: confidentialTransfer,
    isEncrypting,
    isPending,
    isConfirming,
    isConfirmed,
    hash,
    isPending: confidentialIsPending,
    isError,
    error,
    isSuccess,
    resetTransfer: confidentialResetTransfer,
  } = useConfidentialTransfer();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !validateForm({
        isSepoliaChain,
        recipient,
        amount: transferAmount,
        setFormError,
      })
    )
      return;

    try {
      await confidentialTransfer(
        tokenAddress as `0x${string}`,
        transferAmount,
        chosenAddress as `0x${string}`,
        6,
      );
    } catch (error) {
      console.error('Transfer error:', error);
      setFormError('Transfer failed. Please try again.');
    }
  };

  const handleDecrypt = async () => {
    if (!signer) {
      console.error('Signer not initialized - please connect your wallet');
      return;
    }
    try {
      await tokenBalance.decrypt();
    } catch (error) {
      console.error('Failed to decrypt balance:', error);
    }
  };

  const handleReset = (clearTransfer?: () => void) => {
    setTransferAmount('');
    setRecipient('');
    setTokenAddress('');
    if (clearTransfer) {
      clearTransfer();
    }
  };

  return (
    <>
      {tokenAddress ? (
        isSuccess ? (
          <Card>
            <CardContent>
              <TransferSuccessMessage
                amount={transferAmount}
                symbol={tokenBalance?.symbol || ''}
                hash={hash}
                isConfirmed={isConfirmed}
                isConfirming={isConfirming}
                onReset={() => handleReset(confidentialResetTransfer)}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-1">
            {/* Encrypted Balance */}
            <Card>
              <CardHeader className="p-6 border-b">
                <div className=" items-center gap-2">
                  <CardTitle className="text-sm text-gray-500 dark:text-gray-400">
                    Token Address
                  </CardTitle>
                  <span className="font-mono text-sm truncate">
                    {tokenAddress}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono text-2xl font-semibold">
                        {tokenBalance.balance
                          ? tokenBalance.balance.toString()
                          : '•••••'}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {tokenBalance.symbol}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      Last updated: {tokenBalance.lastUpdated}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDecrypt}
                    disabled={
                      tokenBalance.isDecrypting ||
                      instanceStatus !== 'ready' ||
                      tokenBalance.isLoading === true
                    }
                    className="min-w-[120px]"
                  >
                    {tokenBalance.isDecrypting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span>Decrypting...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="mr-2 h-4 w-4" />
                        <span>Decrypt</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Transfer Section */}
            <Card>
              <CardContent className="p-8">
                <AnimatePresence mode="wait">
                  <motion.form
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onSubmit={handleSubmit}
                    className="space-y-6"
                  >
                    {/* Form error */}
                    {formError && <TransferFormError message={formError} />}

                    {/* Transfer error */}
                    {isError && error && (
                      <TransferFormError
                        message={
                          (error as BaseError).shortMessage || 'Transfer failed'
                        }
                      />
                    )}

                    <RecipientInputField
                      recipient={recipient}
                      setRecipient={setRecipient}
                      isPending={confidentialIsPending}
                    />

                    <AmountInputField
                      amount={transferAmount}
                      setAmount={setTransferAmount}
                      selectedToken={tokenBalance}
                      isPending={confidentialIsPending}
                    />

                    <TransactionStatus hash={hash} isConfirmed={isSuccess} />

                    <TransferButton
                      isEncrypting={isEncrypting}
                      isPending={confidentialIsPending}
                      selectedToken={tokenBalance}
                      transferAmount={transferAmount}
                      chosenAddress={chosenAddress}
                    />
                  </motion.form>
                </AnimatePresence>
              </CardContent>
            </Card>
          </div>
        )
      ) : (
        <TokenAddressForm
          tokenAddress={tokenAddress}
          setTokenAddress={setTokenAddress}
        />
      )}
    </>
  );
};
