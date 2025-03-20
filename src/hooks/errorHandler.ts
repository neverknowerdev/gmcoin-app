export const errorHandlers = [
  {
    condition: (error: any) =>
      error?.code === 4001 ||
      error?.code === "ACTION_REJECTED" ||
      error?.message.toLowerCase().includes("user rejected"),
    message: "Transaction cancelled by user.",
  },
  {
    condition: (error: any) =>
      error?.message.toLowerCase().includes("insufficient funds"),
    message: "Insufficient balance to process transaction.",
  },
  {
    condition: (error: any) => error?.message.toLowerCase().includes("timeout"),
    message: "Transaction timed out. Please try again.",
  },
  {
    condition: (error: any) => error?.message.toLowerCase().includes("network"),
    message: "Network error. Please check your connection.",
  },
  {
    condition: (error: any) =>
      error?.message.toLowerCase().includes("relayer service error") &&
      !error?.message.toLowerCase().includes("user rejected"),
    message: "Relayer service error. Try again later.",
  },
];

export const getErrorMessage = (error: any): string => {
  // Check for user rejection errors
  if (
    error.code === 4001 ||
    error.message?.includes("user rejected") ||
    error.message?.includes("User denied") ||
    error.message?.includes("User rejected") ||
    error.message?.includes("cancelled")
  ) {
    return "Transaction cancelled";
  }

  // Check for network errors
  if (error.message?.includes("network")) {
    return "Network error occurred. Please check your connection and try again.";
  }

  // Check for gas errors
  if (error.message?.includes("insufficient funds")) {
    return "Insufficient funds for transaction.";
  }

  // General errors
  if (error.message) {
    return error.message.slice(0, 100); // Limit message length
  }

  return "An unknown error occurred. Please try again.";
};
