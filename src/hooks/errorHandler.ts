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
    message: (error: any) => {
      // Extract the actual error message if available
      const match = error?.message.match(/Relayer service error: (.*)/);
      if (match && match[1]) {
        return `${match[1]}`;
      }
      return "Relayer service error. Try again later.";
    },
  },
  {
    condition: (error: any) =>
      error?.message.toLowerCase().includes("wallet already linked for that user"),
    message: "Wallet already linked for this user. Redirecting to dashboard.",
  },
];

export const getErrorMessage = (error: any): string => {
  // First check if any of our handlers match
  for (const handler of errorHandlers) {
    if (handler.condition(error)) {
      // If message is a function, call it with the error
      if (typeof handler.message === 'function') {
        return handler.message(error);
      }
      return handler.message;
    }
  }

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

  // Check for "wallet already linked" error
  if (error.message?.includes("wallet already linked for that user")) {
    return "Wallet already linked for this user. Redirecting to dashboard.";
  }

  // General errors
  if (error.message) {
    return error.message.slice(0, 100); // Limit message length
  }

  return "An unknown error occurred. Please try again.";
};
