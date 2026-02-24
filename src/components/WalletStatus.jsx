function WalletConnectStatus({ isConnected, address, chain }) {
  const getStatusText = () => {
    if (!isConnected) return "❌ Not Connected";
    if (!chain) return "⚠️ Chain Not Detected";
    return `✅ Connected: ${address} on ${chain.name}`;
  };

  const getStatusColor = () => {
    if (!isConnected) return "#f33"; // red
    if (!chain) return "#ffa500"; // orange
    return "#0f0"; // green
  };

  return (
    <div
      style={{
        marginBottom: "20px",
        padding: "10px 15px",
        borderRadius: "12px",
        backgroundColor: "rgba(0,0,0,0.4)",
        color: getStatusColor(),
        fontWeight: "bold",
        textAlign: "center"
      }}
    >
      {getStatusText()}
    </div>
  );
}