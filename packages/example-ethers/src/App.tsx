import { useWallet } from "./useWallet";
import "./App.css";

function App() {
  const { address, chainId, isConnected, isConnecting, error, connect, disconnect } =
    useWallet();

  return (
    <>
      <h1>example-ethers</h1>
      <p>Using ethers.js for wallet connection</p>

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
    </>
  );
}

export default App;
