import React from 'react';
import { ethers } from "ethers";
import { CURRENT_CHAIN } from "@/src/config";

interface NetworkSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: any;
}

export const NetworkSwitchModal: React.FC<NetworkSwitchModalProps> = ({ 
  isOpen, 
  onClose, 
  provider 
}) => {
  if (!isOpen) return null;

  const handleSwitchClick = async () => {
    try {
      let ethProvider;
      
      if (provider.provider) {
        ethProvider = new ethers.BrowserProvider(provider.provider);
      } else {
        ethProvider = provider;
      }
      
      // Add network
      await ethProvider.send('wallet_addEthereumChain', [{
        chainId: CURRENT_CHAIN.hexId,
        chainName: CURRENT_CHAIN.label,
        nativeCurrency: {
          name: CURRENT_CHAIN.token,
          symbol: CURRENT_CHAIN.token,
          decimals: 18
        },
        rpcUrls: [CURRENT_CHAIN.rpcUrl],
        blockExplorerUrls: [CURRENT_CHAIN.blockExplorerUrl]
      }]).catch((e: Error) => {
        console.log("Error adding chain:", e);
      });
      
      // Switch to network
      await ethProvider.send('wallet_switchEthereumChain', [{ 
        chainId: CURRENT_CHAIN.hexId 
      }]);
      
      onClose();
    } catch (error: any) {
      console.error("Error switching network:", error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-md w-5/6 text-center">
        <h2 className="text-lg font-bold mb-4">
          Please switch to network Base ({CURRENT_CHAIN.id})
        </h2>
        
        <button 
          onClick={handleSwitchClick}
          className="bg-green-500 text-white font-bold py-3 px-6 rounded-full shadow-md hover:bg-green-600 transition-colors"
        >
          SWITCH NETWORK
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