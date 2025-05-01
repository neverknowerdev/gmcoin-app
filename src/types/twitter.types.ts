export interface TwitterAuthState {
  isAuthorized: boolean;
  isConnected: boolean;
  isLoading: boolean;
  twitterName: string;
  userId: string | null;
}

export interface TwitterVerificationProps {
  onSuccess: () => void;
  onError: (error: string) => void;
}
