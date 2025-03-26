import React, { useState } from "react";
import { CURRENT_CHAIN } from "@/src/config";
import { ethers } from "ethers";
import { switchToBase } from "@/src/hooks/useWeb3";

interface NetworkSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: any;
}

export const NetworkSwitchModal: React.FC<NetworkSwitchModalProps> = ({
  isOpen,
  onClose,
  provider,
}) => {
  const [status, setStatus] = useState<
    "idle" | "switching" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen) return null;

  const isAmbire = provider?.label === "Ambire";

  const handleSwitchClick = async () => {
    try {
      setStatus("switching");

      if (isAmbire) {
        // For Ambire, use direct method
        try {
          console.log("Using direct switchToBase method for Ambire");
          await switchToBase();

          setStatus("success");
          // Reload page
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } catch (ambireError) {
          console.error("Error switching Ambire wallet:", ambireError);
          setStatus("error");
          setErrorMessage(
            "Couldn't switch network automatically. Please switch manually in your Ambire wallet."
          );
        }
      } else {
        // For other wallets
        let ethProvider;

        if (provider.provider) {
          ethProvider = new ethers.BrowserProvider(provider.provider);
        } else {
          ethProvider = provider;
        }

        // Add network
        try {
          await ethProvider
            .send("wallet_addEthereumChain", [
              {
                chainId: CURRENT_CHAIN.hexId,
                chainName: CURRENT_CHAIN.label,
                nativeCurrency: {
                  name: CURRENT_CHAIN.token,
                  symbol: CURRENT_CHAIN.token,
                  decimals: 18,
                },
                rpcUrls: [CURRENT_CHAIN.rpcUrl],
                blockExplorerUrls: [CURRENT_CHAIN.blockExplorerUrl],
              },
            ])
            .catch((e: Error) => {
              console.log("Error adding chain:", e);
            });

          // Switch to network
          await ethProvider.send("wallet_switchEthereumChain", [
            {
              chainId: CURRENT_CHAIN.hexId,
            },
          ]);

          setStatus("success");
          setTimeout(() => {
            onClose();
            window.location.reload();
          }, 1000);
        } catch (error: any) {
          console.error("Error switching network:", error);
          setStatus("error");
          setErrorMessage(error.message || "Failed to switch network");
        }
      }
    } catch (error: any) {
      console.error("Error in handleSwitchClick:", error);
      setStatus("error");
      setErrorMessage(error.message || "An unexpected error occurred");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-5/6 text-center">
        <h2 className="text-lg font-bold mb-4">
          {isAmbire
            ? `Please switch to ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`
            : `Please switch to network ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`}
        </h2>

        {isAmbire && (
          <div className="mb-4 text-sm text-gray-600 text-left">
            <p className="font-semibold mb-2">For Ambire Wallet:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Click the button below to try automatic switching</li>
              <li>If that doesn't work, open your Ambire wallet</li>
              <li>Go to Settings &gt; Networks</li>
              <li>
                Select {CURRENT_CHAIN.label} ({CURRENT_CHAIN.id})
              </li>
              <li>Return to this page and refresh</li>
            </ol>
          </div>
        )}

        {status === "error" && (
          <div className="bg-red-100 border border-red-300 text-red-700 p-3 rounded mb-4">
            {errorMessage}
          </div>
        )}

        <button
          onClick={handleSwitchClick}
          disabled={status === "switching" || status === "success"}
          className={`
            w-full py-3 px-6 rounded-full shadow-md font-bold transition-colors
            ${
              status === "idle"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : ""
            }
            ${
              status === "switching" ? "bg-gray-400 text-white cursor-wait" : ""
            }
            ${status === "success" ? "bg-green-600 text-white" : ""}
            ${
              status === "error"
                ? "bg-orange-500 hover:bg-orange-600 text-white"
                : ""
            }
          `}
        >
          {status === "idle" && "SWITCH NETWORK"}
          {status === "switching" && "SWITCHING..."}
          {status === "success" && "SUCCESS!"}
          {status === "error" && "TRY AGAIN"}
        </button>

        <button
          onClick={onClose}
          className="block mx-auto mt-3 text-gray-500 hover:text-gray-700"
        >
          CLOSE
        </button>
      </div>
    </div>
  );
};

// Helper function to show modal window
export const showReactNetworkSwitchModal = (
  provider: any,
  setModalState: React.Dispatch<React.SetStateAction<boolean>>
) => {
  setModalState(true);
};
