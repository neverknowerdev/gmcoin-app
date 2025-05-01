export const formatAddress = (address: string) => {
  if (!address || address === "Please connect wallet") return "Please connect wallet";
  return `${address.slice(0, 10)}...${address.slice(-4)}`;
};