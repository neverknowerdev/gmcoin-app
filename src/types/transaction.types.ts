export type TransactionStatus = "idle" | "pending" | "sending" | "success" | "error";

export interface TransactionState {
  status: TransactionStatus;
  errorMessage: string;
}
