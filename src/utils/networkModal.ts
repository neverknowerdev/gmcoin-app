import { ethers } from "ethers";
import { CURRENT_CHAIN } from "@/src/config";

// Function to show network switching modal
export const showNetworkSwitchModal = (providerObj: any) => {
  // Create styled modal window
  const modalContainer = document.createElement('div');
  modalContainer.style.position = 'fixed';
  modalContainer.style.top = '0';
  modalContainer.style.left = '0';
  modalContainer.style.width = '100%';
  modalContainer.style.height = '100%';
  modalContainer.style.backgroundColor = 'rgba(0,0,0,0.5)';
  modalContainer.style.display = 'flex';
  modalContainer.style.justifyContent = 'center';
  modalContainer.style.alignItems = 'center';
  modalContainer.style.zIndex = '9999';

  const modalContent = document.createElement('div');
  modalContent.style.backgroundColor = 'white';
  modalContent.style.borderRadius = '16px';
  modalContent.style.padding = '24px';
  modalContent.style.width = '90%';
  modalContent.style.maxWidth = '400px';
  modalContent.style.textAlign = 'center';
  modalContent.style.fontFamily = 'sans-serif';

  const header = document.createElement('h2');
  header.textContent = `Please switch to network Base (${CURRENT_CHAIN.id})`;
  header.style.marginBottom = '20px';
  header.style.color = '#111';
  header.style.fontSize = '18px';

  const button = document.createElement('button');
  button.textContent = 'SWITCH NETWORK';
  button.style.backgroundColor = '#00cc00';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '30px';
  button.style.padding = '12px 24px';
  button.style.fontSize = '16px';
  button.style.fontWeight = 'bold';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';

  const closeButton = document.createElement('button');
  closeButton.textContent = 'CLOSE';
  closeButton.style.backgroundColor = 'transparent';
  closeButton.style.color = '#666';
  closeButton.style.border = 'none';
  closeButton.style.borderRadius = '30px';
  closeButton.style.padding = '12px 24px';
  closeButton.style.fontSize = '14px';
  closeButton.style.marginTop = '12px';
  closeButton.style.cursor = 'pointer';

  // Add actions
  button.addEventListener('click', async () => {
    try {
      if (providerObj) {
        let provider;
        
        // Check type of provided provider
        if (providerObj.provider) {
          // If wallet object is passed
          provider = new ethers.BrowserProvider(providerObj.provider);
        } else {
          // If provider is passed directly
          provider = providerObj;
        }
        
        // First add the network
        await provider.send('wallet_addEthereumChain', [{
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
          console.log("Error adding chain in modal, continuing to switch:", e);
        });
        
        // Then switch to it
        await provider.send('wallet_switchEthereumChain', [{ 
          chainId: CURRENT_CHAIN.hexId 
        }]);
      }
    } catch (e) {
      console.error("Error switching network from modal:", e);
    } finally {
      document.body.removeChild(modalContainer);
    }
  });

  closeButton.addEventListener('click', () => {
    document.body.removeChild(modalContainer);
  });

  // Assemble and display modal window
  modalContent.appendChild(header);
  modalContent.appendChild(button);
  modalContent.appendChild(document.createElement('br'));
  modalContent.appendChild(closeButton);
  modalContainer.appendChild(modalContent);
  document.body.appendChild(modalContainer);
  
  // Add ability to close window when clicking on darkened background
  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) {
      document.body.removeChild(modalContainer);
    }
  });
};

// Function to check network and show modal window if needed
export const checkAndSwitchNetwork = async (provider: any, requiredChainId: number) => {
  try {
    const chainId = await provider.send('eth_chainId', []);
    const currentChainId = parseInt(chainId, 16);
    
    if (currentChainId !== requiredChainId) {
      showNetworkSwitchModal(provider);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error checking network:", error);
    showNetworkSwitchModal(provider);
    return false;
  }
}; 