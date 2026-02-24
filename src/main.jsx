import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { createConfig, http } from "wagmi";
import { mainnet, bsc } from "wagmi/chains";
import { createAppKit } from "@reown/appkit/react";
import App from "./App";
import { REOWN_PROJECT_ID } from "./config";

const wagmiConfig = createConfig({
  chains: [mainnet, bsc],
  transports: {
    [mainnet.id]: http(),
    [bsc.id]: http(),
  }
});

createAppKit({
  wagmiConfig,
  projectId: REOWN_PROJECT_ID,
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <WagmiProvider config={wagmiConfig}>
    <App />
  </WagmiProvider>
);