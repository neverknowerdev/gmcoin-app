import { ethers } from "ethers";
import { CURRENT_CHAIN } from "@/src/config";
import { switchToBase } from "@/src/hooks/useWeb3";

// Function to show network switching modal
export const showNetworkSwitchModal = (wallet: any) => {
  const isAmbire = wallet?.label === "Ambire";
  console.log("Showing network modal. Wallet:", wallet?.label);
  console.log("Target network:", CURRENT_CHAIN.label, CURRENT_CHAIN.id);

  // Create styled modal window
  const modalContainer = document.createElement("div");
  modalContainer.style.position = "fixed";
  modalContainer.style.top = "0";
  modalContainer.style.left = "0";
  modalContainer.style.width = "100%";
  modalContainer.style.height = "100%";
  modalContainer.style.backgroundColor = "rgba(0,0,0,0.5)";
  modalContainer.style.display = "flex";
  modalContainer.style.justifyContent = "center";
  modalContainer.style.alignItems = "center";
  modalContainer.style.zIndex = "9999";

  const modalContent = document.createElement("div");
  modalContent.style.backgroundColor = "white";
  modalContent.style.borderRadius = "16px";
  modalContent.style.padding = "24px";
  modalContent.style.width = "90%";
  modalContent.style.maxWidth = "400px";
  modalContent.style.textAlign = "center";
  modalContent.style.fontFamily = "sans-serif";

  const header = document.createElement("h2");
  header.textContent = isAmbire
    ? `Please switch to network ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`
    : `Please switch to network ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`;
  header.style.marginBottom = "20px";
  header.style.color = "#111";
  header.style.fontSize = "18px";

  // Add special instructions for Ambire wallet
  let instructions = document.createElement("p");
  if (isAmbire) {
    instructions.innerHTML = `
      <strong>For Ambire Wallet:</strong><br>
      1. Click the button below to try automatic switching<br>
      2. If that doesn't work, open your Ambire wallet<br>
      3. Go to Settings > Networks<br>
      4. Select ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})<br>
      5. Return to this page and refresh
    `;
  } else {
    instructions.textContent = `Click the button below to switch networks`;
  }
  instructions.style.marginBottom = "20px";
  instructions.style.color = "#333";
  instructions.style.fontSize = "14px";
  instructions.style.lineHeight = "1.5";

  // Create button for switching networks
  const button = document.createElement("button");
  button.textContent = "SWITCH NETWORK";
  button.style.backgroundColor = "#10b981";
  button.style.color = "white";
  button.style.border = "none";
  button.style.borderRadius = "50px";
  button.style.padding = "12px 24px";
  button.style.fontSize = "16px";
  button.style.fontWeight = "bold";
  button.style.cursor = "pointer";
  button.style.marginBottom = "16px";
  button.style.width = "100%";
  button.style.maxWidth = "250px";
  button.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";

  // Close button
  const closeButton = document.createElement("button");
  closeButton.textContent = "CLOSE";
  closeButton.style.backgroundColor = "transparent";
  closeButton.style.color = "#666";
  closeButton.style.border = "none";
  closeButton.style.padding = "8px 16px";
  closeButton.style.fontSize = "14px";
  closeButton.style.cursor = "pointer";
  closeButton.style.display = "block";
  closeButton.style.marginLeft = "auto";
  closeButton.style.marginRight = "auto";

  // Handle click on switch button
  button.addEventListener("click", async () => {
    try {
      console.log("Switch button clicked");
      // Visual confirmation of button press
      button.textContent = "SWITCHING...";
      button.style.backgroundColor = "#888";

      if (isAmbire) {
        console.log("Using direct method for Ambire wallet");
        // For Ambire, try the direct method first
        try {
          console.log("Calling switchToBase function");
          await switchToBase();
          console.log("Direct switchToBase called successfully");

          // Show status to the user
          button.textContent = "SUCCESS!";
          button.style.backgroundColor = "#22c55e";

          // Create network check after a short delay
          setTimeout(async () => {
            try {
              if (window.ethereum) {
                const chainId = await window.ethereum.request({
                  method: "eth_chainId",
                });
                console.log(
                  `Current chain after switch: ${chainId}, expected: ${CURRENT_CHAIN.hexId}`
                );

                if (chainId === CURRENT_CHAIN.hexId) {
                  console.log("Network switch confirmed");
                  // Close modal and reload after confirmation
                  setTimeout(() => {
                    window.location.reload();
                  }, 500);
                } else {
                  console.log(
                    "Network switch not confirmed, showing manual instructions"
                  );
                  // If network didn't switch, show instructions
                  button.textContent = "SWITCH MANUALLY";
                  button.style.backgroundColor = "#f97316";

                  // Add more detailed instructions
                  instructions.innerHTML = `
                    <strong>Automatic switching failed. Please follow these steps:</strong><br>
                    1. Open your Ambire wallet<br>
                    2. Go to Settings → Networks<br>
                    3. Select ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})<br>
                    4. Return to this page and refresh browser
                  `;
                }
              }
            } catch (verifyError) {
              console.error("Error verifying network switch:", verifyError);
            }
          }, 1500);
        } catch (error) {
          console.error("Error with direct switchToBase:", error);

          // Show error in the interface
          button.textContent = "FAILED TO SWITCH";
          button.style.backgroundColor = "#ef4444";

          setTimeout(() => {
            alert(
              "Couldn't switch automatically. Please switch manually in your Ambire wallet settings."
            );

            // Update instructions
            instructions.innerHTML = `
              <strong>For Ambire Wallet (manual mode):</strong><br>
              1. Open your Ambire wallet<br>
              2. Go to Settings → Networks<br>
              3. Select ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})<br>
              4. Return to this page and refresh browser
            `;

            button.textContent = "SWITCH MANUALLY";
            button.style.backgroundColor = "#f97316";
          }, 500);
        }
      } else {
        // For other wallets use provider from wallet
        const provider = new ethers.BrowserProvider(wallet.provider);

        // Try to switch chain
        try {
          await provider.send("wallet_switchEthereumChain", [
            {
              chainId: CURRENT_CHAIN.hexId,
            },
          ]);
          console.log("Network switch request sent");
        } catch (switchError: any) {
          console.error("Error switching chain:", switchError);

          // If chain not added, try to add it
          if (switchError.code === 4902) {
            try {
              await provider.send("wallet_addEthereumChain", [
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
              ]);

              // Then try to switch again
              await provider.send("wallet_switchEthereumChain", [
                {
                  chainId: CURRENT_CHAIN.hexId,
                },
              ]);
            } catch (addError) {
              console.error("Error adding chain:", addError);
              alert(
                "Failed to add network. Please try adding it manually in your wallet."
              );
            }
          } else {
            alert(
              "Failed to switch network. Please try again or switch manually in your wallet."
            );
          }
        }
      }

      // Close modal in any case
      document.body.removeChild(modalContainer);
    } catch (error) {
      console.error("Error in switch button handler:", error);
    }
  });

  // Handle click on close button
  closeButton.addEventListener("click", () => {
    document.body.removeChild(modalContainer);
  });

  // Append elements to modal
  modalContent.appendChild(header);
  modalContent.appendChild(instructions);
  modalContent.appendChild(button);
  modalContent.appendChild(closeButton);
  modalContainer.appendChild(modalContent);

  // Add modal to body
  document.body.appendChild(modalContainer);
};

// Function to check network and show modal window if needed
export const checkAndSwitchNetwork = async (
  provider: any,
  requiredChainId: number
) => {
  try {
    const chainId = await provider.send("eth_chainId", []);
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
