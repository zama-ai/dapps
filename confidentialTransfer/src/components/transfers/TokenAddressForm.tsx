import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { getAddress } from 'ethers';

interface TokenAddressFormProps {
  tokenAddress: string;
  setTokenAddress: (address: string) => void;
}

export const TokenAddressForm = ({
  tokenAddress,
  setTokenAddress,
}: TokenAddressFormProps) => {
  const [tokenAddressInput, setTokenAddressInput] = useState('');
  const [formError, setFormError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleTokenAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTokenAddressInput(e.target.value);
  };

  const handleTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate the token address format
    if (!tokenAddressInput || !/^0x[0-9a-f]{40}$/i.test(tokenAddressInput)) {
      setFormError('Please enter a valid token address');
      return;
    }

    try {
      setIsPending(true);
      // Use getAddress to validate and checksum the address
      const checksummedAddress = getAddress(tokenAddressInput);
      console.log(checksummedAddress);
      console.log(tokenAddressInput);

      // Set the checksummed address
      setTokenAddress(checksummedAddress);
      setFormError(''); // Clear any existing errors
    } catch (error) {
      console.error('Token submission error:', error);
      setFormError(
        'Invalid token address. Please check the address and try again.',
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-8">
        <AnimatePresence mode="wait">
          <motion.form
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleTokenSubmit}
            className="space-y-6"
          >
            <div className="space-y-2">
              <Label htmlFor="tokenAddress">
                Input your confidential token address:
              </Label>
              <Input
                name="tokenAddress"
                id="tokenAddress"
                placeholder="0x..."
                value={tokenAddressInput}
                onChange={handleTokenAddressChange}
                pattern="^0x[0-9a-fA-F]{40}$"
                maxLength={42}
                disabled={isPending}
              />
              {tokenAddressInput &&
                !/^0x[0-9a-fA-F]{40}$/.test(tokenAddressInput) && (
                  <p className="text-sm text-red-500">
                    Please enter a valid token address (0x followed by 40
                    hexadecimal characters)
                  </p>
                )}
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex px-8 mt-6 justify-center items-center">
                <Button type="submit" className="group px-5">
                  Confirm
                </Button>
              </div>
            </div>
          </motion.form>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
