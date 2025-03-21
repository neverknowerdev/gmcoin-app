import { ethers } from "ethers";
import { CURRENT_CHAIN } from "@/src/config";

// Function to show network switching modal
export const showNetworkSwitchModal = (wallet: any) => {
  const isAmbire = wallet?.label === "Ambire";
  const message = isAmbire
    ? `Please switch to network ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id}) manually in Ambire wallet settings`
    : `Please switch to network ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`;

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
  header.textContent = message;
  header.style.marginBottom = "20px";
  header.style.color = "#111";
  header.style.fontSize = "18px";

  // Add info about current network
  const getCurrentNetwork = async () => {
    try {
      let provider;
      if (wallet && wallet.provider) {
        provider = new ethers.BrowserProvider(wallet.provider);
      } else if (wallet) {
        provider = wallet;
      } else if (window.ethereum) {
        provider = new ethers.BrowserProvider(window.ethereum);
      }

      if (provider) {
        const chainIdHex = await provider.send("eth_chainId", []);
        const chainId = parseInt(chainIdHex, 16);
        return chainId;
      }
    } catch (e) {
      console.error("Error getting current chain ID:", e);
    }
    return "Unknown";
  };

  const networkInfo = document.createElement("p");
  networkInfo.style.marginBottom = "15px";
  networkInfo.style.color = "#555";
  networkInfo.style.fontSize = "14px";
  networkInfo.textContent = "Checking current network...";

  // Update text with current network info
  getCurrentNetwork().then((currentChainId) => {
    if (currentChainId && currentChainId !== "Unknown") {
      networkInfo.innerHTML = `You are currently connected to network with ID: <b>${currentChainId}</b><br>
      Please switch to <b>${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})</b> to continue.`;
    } else {
      networkInfo.textContent = `Please connect to ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id}) network.`;
    }
  });

  // Add browser detection info and help text
  const userAgent = navigator.userAgent;
  const isFirefox = userAgent.indexOf("Firefox") > -1;
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      userAgent
    );

  const helpText = document.createElement("p");
  helpText.style.fontSize = "12px";
  helpText.style.color = "#777";
  helpText.style.marginBottom = "20px";

  if (isFirefox) {
    helpText.innerHTML =
      "Using Firefox? You might need to manually add the network in your wallet.<br>Please check your wallet settings.";
  } else if (isMobile) {
    helpText.innerHTML =
      "On mobile devices, you may need to open your wallet app separately to switch networks.";
  } else {
    helpText.innerHTML =
      "If automatic switching doesn't work, please open your wallet extension and switch networks manually.";
  }

  const button = document.createElement("button");
  button.textContent = "SWITCH NETWORK";
  button.style.backgroundColor = "#00cc00";
  button.style.color = "white";
  button.style.border = "none";
  button.style.borderRadius = "30px";
  button.style.padding = "12px 24px";
  button.style.fontSize = "16px";
  button.style.fontWeight = "bold";
  button.style.cursor = "pointer";
  button.style.boxShadow = "0 4px 8px rgba(0,0,0,0.1)";

  const closeButton = document.createElement("button");
  closeButton.textContent = "CLOSE";
  closeButton.style.backgroundColor = "transparent";
  closeButton.style.color = "#666";
  closeButton.style.border = "none";
  closeButton.style.borderRadius = "30px";
  closeButton.style.padding = "12px 24px";
  closeButton.style.fontSize = "14px";
  closeButton.style.marginTop = "12px";
  closeButton.style.cursor = "pointer";

  // Add status text
  const statusText = document.createElement("p");
  statusText.style.fontSize = "14px";
  statusText.style.color = "#555";
  statusText.style.margin = "15px 0";
  statusText.style.minHeight = "20px";

  // Add actions
  button.addEventListener("click", async () => {
    try {
      statusText.textContent = "Attempting to switch network...";
      statusText.style.color = "#0066cc";

      if (wallet) {
        let provider;

        // Check type of provided provider
        if (wallet.provider) {
          // If wallet object is passed
          provider = new ethers.BrowserProvider(wallet.provider);
        } else {
          // If provider is passed directly
          provider = wallet;
        }

        // First add the network
        await provider
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
            console.log(
              "Error adding chain in modal, continuing to switch:",
              e
            );
          });

        // Then switch to it
        await provider.send("wallet_switchEthereumChain", [
          {
            chainId: CURRENT_CHAIN.hexId,
          },
        ]);

        // Verify the switch was successful
        setTimeout(async () => {
          try {
            const newChainId = await provider.send("eth_chainId", []);
            const newNumericChainId = parseInt(newChainId, 16);

            if (newNumericChainId === CURRENT_CHAIN.id) {
              statusText.textContent = "✅ Successfully switched network!";
              statusText.style.color = "#00cc00";
              setTimeout(() => {
                document.body.removeChild(modalContainer);
                window.location.reload(); // Reload page to refresh UI state
              }, 1000);
            } else {
              statusText.textContent =
                "⚠️ Network switch not confirmed. Please check your wallet.";
              statusText.style.color = "#ff6600";
            }
          } catch (e) {
            statusText.textContent = "Error verifying network switch.";
            statusText.style.color = "#cc0000";
          }
        }, 1500);
      }
    } catch (e) {
      console.error("Error switching network from modal:", e);
      statusText.textContent =
        "❌ Error switching network. Try manually in your wallet.";
      statusText.style.color = "#cc0000";
    }
  });

  closeButton.addEventListener("click", () => {
    document.body.removeChild(modalContainer);
  });

  // Assemble and display modal window
  modalContent.appendChild(header);
  modalContent.appendChild(networkInfo);
  modalContent.appendChild(helpText);
  modalContent.appendChild(button);
  modalContent.appendChild(statusText);
  modalContent.appendChild(document.createElement("br"));
  modalContent.appendChild(closeButton);
  modalContainer.appendChild(modalContent);
  document.body.appendChild(modalContainer);

  // Add ability to close window when clicking on darkened background
  modalContainer.addEventListener("click", (e) => {
    if (e.target === modalContainer) {
      document.body.removeChild(modalContainer);
    }
  });
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
