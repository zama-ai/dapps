export interface Token {
  balance: string;
  rawBalance: bigint;
  lastUpdated: string;
  decryptedBalance: bigint;
  decrypt: () => Promise<void>;
  isLoading: boolean;
  isDecrypting: boolean;
  error: Error;
  decryptionError: string;
  symbol: string;
  name: string;
  decimals: number;
}
