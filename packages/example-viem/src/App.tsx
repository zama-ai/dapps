import { useWallet } from "./useWallet";
import { FhevmProvider, memoryStorage, type Eip1193Provider } from "fhevm-sdk";
import { fhevmConfig } from "./fhevmConfig";
import { EncryptDemo } from "./EncryptDemo";
import "./App.css";

function App() {
  const { address, chainId, isConnected, isConnecting, error, connect, disconnect } =
    useWallet();

  return (
    <FhevmProvider
      config={fhevmConfig}
      provider={window.ethereum as Eip1193Provider}
      address={address}
      chainId={chainId}
      isConnected={isConnected}
      storage={memoryStorage}
    >
      <h1>example-viem</h1>
      <p>Using viem + fhevm-sdk</p>

      <div className="card">
        <h2>Connection</h2>
        <div>
          <p>status: {isConnected ? "connected" : "disconnected"}</p>
          <p>address: {address ?? "—"}</p>
          <p>chainId: {chainId ?? "—"}</p>
        </div>

        {isConnected ? (
          <button onClick={disconnect}>Disconnect</button>
        ) : (
          <button onClick={connect} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}

        {error && <p style={{ color: "red" }}>{error.message}</p>}
      </div>

      <EncryptDemo />
    </FhevmProvider>
  );
}

export default App;
