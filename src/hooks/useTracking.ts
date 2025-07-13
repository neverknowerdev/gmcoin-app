"use client";

import { useAnalytics } from "../components/Analytics";
import { useAppKitAccount } from "@reown/appkit/react";
import { useEffect } from "react";

export const useTracking = () => {
  const { trackEvent, trackPageView, identifyUser } = useAnalytics();
  const { address, isConnected } = useAppKitAccount();

  // Identify user when wallet is connected
  useEffect(() => {
    if (isConnected && address) {
      identifyUser(address, {
        wallet_address: address,
        connection_status: "connected",
      });
    }
  }, [isConnected, address, identifyUser]);

  // Custom tracking functions for GMCoin app
  const trackWalletConnection = (walletType?: string) => {
    trackEvent("wallet_connected", {
      wallet_type: walletType,
      wallet_address: address,
    });
  };

  const trackTwitterVerification = (method: "tweet" | "oauth") => {
    trackEvent("twitter_verification_started", {
      verification_method: method,
      wallet_address: address,
    });
  };

  const trackTransactionSent = (transactionType: string) => {
    trackEvent("transaction_sent", {
      transaction_type: transactionType,
      wallet_address: address,
    });
  };

  const trackVerificationSuccess = () => {
    trackEvent("verification_completed", {
      wallet_address: address,
    });
  };

  const trackGMTweet = () => {
    trackEvent("gm_tweet_shared", {
      wallet_address: address,
    });
  };

  const trackPageVisit = (pageName: string) => {
    trackPageView(`GMCoin - ${pageName}`, window.location.pathname);
  };

  const trackError = (errorType: string, errorMessage?: string) => {
    trackEvent("app_error", {
      error_type: errorType,
      error_message: errorMessage,
      wallet_address: address,
    });
  };

  return {
    trackWalletConnection,
    trackTwitterVerification,
    trackTransactionSent,
    trackVerificationSuccess,
    trackGMTweet,
    trackPageVisit,
    trackError,
    trackEvent,
    trackPageView,
    identifyUser,
  };
};