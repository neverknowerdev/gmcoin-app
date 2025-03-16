export type TransactionStatus = "idle" | "pending" | "success" | "error";

export interface TransactionState {
  status: TransactionStatus;
  errorMessage: string;
}
