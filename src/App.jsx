import React, { useState } from "react";
import {
  useAccount,
  useBalance,
  useSendTransaction,
  usePublicClient
} from "wagmi";
import { parseEther, parseUnits, formatUnits } from "viem";
import { supportedTokens } from "./config";
import { ERC20_ABI } from "./abis/erc20";

function App() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { sendTransaction } = useSendTransaction();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("native");

  const { data: nativeBalance } = useBalance({
    address,
    watch: true
  });

  const selectedTokenData =
    supportedTokens.find(t => t.symbol === selectedToken);

  const { data: tokenBalance } = useBalance({
    address,
    token: selectedTokenData?.address,
    watch: true
  });

  const handleMax = () => {
    if (selectedToken === "native" && nativeBalance) {
      setAmount(formatUnits(nativeBalance.value, 18));
    }

    if (selectedTokenData && tokenBalance) {
      setAmount(formatUnits(tokenBalance.value, selectedTokenData.decimals));
    }
  };

  const handleSend = async () => {
    if (!recipient || !amount) return;

    try {
      if (selectedToken === "native") {
        await sendTransaction({
          to: recipient,
          value: parseEther(amount)
        });
      } else {
        const value = parseUnits(amount, selectedTokenData.decimals);

        await sendTransaction({
          to: selectedTokenData.address,
          data: publicClient.encodeFunctionData({
            abi: ERC20_ABI,
            functionName: "transfer",
            args: [recipient, value]
          })
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: 30 }}>
      <h2>Wallet DApp</h2>

      {!isConnected && <appkit-button />}

      {isConnected && (
        <>
          <p>Connected: {address}</p>

          <p>
            Native Balance:{" "}
            {nativeBalance && formatUnits(nativeBalance.value, 18)}
          </p>

          <select onChange={e => setSelectedToken(e.target.value)}>
            <option value="native">Native</option>
            {supportedTokens.map(token => (
              <option key={token.symbol} value={token.symbol}>
                {token.symbol}
              </option>
            ))}
          </select>

          {selectedToken !== "native" && tokenBalance && (
            <p>
              Token Balance:{" "}
              {formatUnits(tokenBalance.value, selectedTokenData.decimals)}
            </p>
          )}

          <input
            placeholder="Recipient address"
            value={recipient}
            onChange={e => setRecipient(e.target.value)}
          />

          <input
            placeholder="Amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />

          <button onClick={handleMax}>Max</button>
          <button onClick={handleSend}>Send</button>
        </>
      )}
    </div>
  );
}

export default App;