import { PublicDecryptDemo } from "../_components/PublicDecryptDemo";

export default function PublicDecryptPage() {
  return (
    <div className="flex flex-col gap-8 items-center w-full px-3 md:px-0">
      <div className="text-center space-y-2 mb-4">
        <h1 className="text-2xl font-bold">Public Decryption Demo</h1>
        <p className="text-sm opacity-70 max-w-lg">
          Demonstrates the usePublicDecrypt hook for decrypting publicly-marked encrypted values
          without user signatures.
        </p>
      </div>
      <PublicDecryptDemo />
    </div>
  );
}
