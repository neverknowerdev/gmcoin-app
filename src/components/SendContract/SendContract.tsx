import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./SendContract.module.css";
import ButtonBackground from "../buttons/BlueButton";
import Modal from "../modal/Modal";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useWeb3 } from "@/src/hooks/useWeb3";
import { useWalletActions } from "@/src/hooks/useWalletActions";
import { getErrorMessage } from "@/src/hooks/errorHandler";
import { useConnectWallet } from "@web3-onboard/react";
import { CURRENT_CHAIN } from "@/src/config";

interface SendContractProps {
  connectedWallet: { accounts: { address: string }[] } | null;
  sendTransaction: () => Promise<void>;
  walletAddress: string;
  connect: () => Promise<void>;
  isFirstTimeUser?: boolean;
}

const SendContract: React.FC<SendContractProps> = ({
  connectedWallet,
  walletAddress,
  sendTransaction,
  connect,
  isFirstTimeUser = true, // Default to true if not specified
}) => {
  const [wallet, setWallet] = useState(walletAddress);
  const [walletAdd, setWalletAdd] = useState(walletAddress);
  const { getProvider } = useWeb3();
  const [showTooltip, setShowTooltip] = useState(false);
  const [modalState, setModalState] = useState<
    "loading" | "error" | "success" | "wrongNetwork" | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);
  const [user, setUser] = useState<string | null>(null);
  const [twitterName, setTwitterName] = useState<string | null>(
    localStorage.getItem("twitterName") || null
  );
  const [verifier, setVerifier] = useState(
    () => sessionStorage.getItem("verifier") || ""
  );
  const [code, setCode] = useState(() => sessionStorage.getItem("code") || "");
  const [isTwitterLoading, setIsTwitterLoading] = useState(false);
  const [twitterError, setTwitterError] = useState<string | null>(null);
  const router = useRouter();

  // Добавляем флаг для отслеживания выполненных запросов авторизации
  const [authAttempted, setAuthAttempted] = useState(false);

  // Check if user is a returning verified user
  useEffect(() => {
    const twitterUserId = localStorage.getItem("twitterUserId");
    const encryptedAccessToken = sessionStorage.getItem("encryptedAccessToken");
    const storedTwitterName = localStorage.getItem("twitterName");
    const hasCompletedTx = localStorage.getItem(
      "hasCompletedTwitterVerification"
    );

    // Only auto-show success modal for returning users who have completed verification
    if (
      twitterUserId &&
      encryptedAccessToken &&
      storedTwitterName &&
      hasCompletedTx === "true" &&
      !isFirstTimeUser
    ) {
      console.log(
        "Returning verified user, showing dashboard popup immediately"
      );
      setModalState("success");
    }
  }, [isFirstTimeUser, walletAddress]);

  const {
    switchNetwork,
    reconnectWallet,
    reconnectTwitter,
    fetchTwitterAccessToken,
    checkNetwork,
    setupNetworkMonitoring,
  } = useWalletActions({
    connect,
    setModalState,
    setErrorMessage,
    setTwitterName,
    setVerifier,
    setIsWrongNetwork,
    setUser,
  });

  const handleReconnectWalletClick = () => reconnectWallet(setWalletAdd);
  const handleReconnectTwitterClick = () => reconnectTwitter();

  // Мониторинг изменений сети
  useEffect(() => {
    // Устанавливаем слушатель изменений сети
    const cleanup = setupNetworkMonitoring();

    // Проверяем сеть при монтировании компонента
    checkNetwork();

    return cleanup;
  }, [setupNetworkMonitoring, checkNetwork]);

  // Проверка сети перед отправкой транзакции
  const ensureCorrectNetwork = async () => {
    // Проверяем текущую сеть
    const isCorrectNetwork = await checkNetwork();

    if (!isCorrectNetwork) {
      console.log("Неправильная сеть, пытаемся переключить...");
      setModalState("wrongNetwork");
      return false;
    }

    return true;
  };

  useEffect(() => {
    if (walletAddress) {
      setWallet(walletAddress);
      // Сохраняем адрес в localStorage при его изменении
      localStorage.setItem("walletAddress", walletAddress);
      localStorage.setItem("userAuthenticated", "true");
    }
  }, [walletAddress]);

  useEffect(() => {
    const storedVerifier = sessionStorage.getItem("verifier");
    const storedCode = sessionStorage.getItem("code");
    const storedUsername = localStorage.getItem("twitterName");
    if (storedVerifier && storedCode) {
      setVerifier(storedVerifier);
      setCode(storedCode);
      setTwitterName(storedUsername);
    }
  }, []);

  useEffect(() => {
    const updateWallet = (event?: StorageEvent) => {
      if (!event || event.key === "walletAddress") {
        const storedWallet = localStorage.getItem("walletAddress");
        if (storedWallet) {
          setWalletAdd(storedWallet);
          setWallet(storedWallet);
        }
      }
    };
    window.addEventListener("storage", updateWallet);
    updateWallet(); // Initial check
    return () => {
      window.removeEventListener("storage", updateWallet);
    };
  }, []);

  useEffect(() => {
    if (verifier) {
      sessionStorage.setItem("verifier", verifier);
    }
  }, [verifier]);

  const isFormValid = walletAdd?.trim() !== "";

  const formatAddress = (address: string) => {
    if (!address || address === "Please connect wallet")
      return "Please connect wallet";
    return `${address.slice(0, 8)}...${address.slice(-4)}`;
  };

  const formatTwitter = (twitterName: string | null) => {
    if (!twitterName) return "..";

    if (twitterName.length > 18) {
      return `${twitterName.slice(0, 16)}...`;
    }

    return twitterName;
  };

  // Проверяем, есть ли код авторизации в URL
  useEffect(() => {
    const checkUrlForAuthCode = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const authCode = urlParams.get("code");
      const state = urlParams.get("state");

      if (authCode && state) {
        console.log("Обнаружен код авторизации в URL, сохраняем...");

        // Сохраняем код в sessionStorage и добавляем в список обработанных кодов
        sessionStorage.setItem("code", authCode);

        // Инициализируем массив обработанных кодов, если его нет
        const processedCodes = JSON.parse(
          sessionStorage.getItem("processed_auth_codes") || "[]"
        );

        // Добавляем текущий код в список обработанных, если его там еще нет
        if (!processedCodes.includes(authCode)) {
          processedCodes.push(authCode);
          sessionStorage.setItem(
            "processed_auth_codes",
            JSON.stringify(processedCodes)
          );
        }

        // Проверяем соответствие state
        const savedState = sessionStorage.getItem("oauth_state");
        if (savedState && savedState === state) {
          console.log("State соответствует, продолжаем авторизацию");
        } else {
          console.warn("State не соответствует, возможна CSRF-атака");
          // В случае несоответствия state, очищаем данные авторизации
          sessionStorage.removeItem("code");
          sessionStorage.removeItem("verifier");
          return;
        }

        // Очищаем URL от параметров авторизации
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);

        // Перезагружаем код и верификатор
        setCode(authCode);
        const storedVerifier = sessionStorage.getItem("verifier");
        if (storedVerifier) {
          setVerifier(storedVerifier);
        } else {
          console.warn("Верификатор не найден в sessionStorage");
        }
      }
    };

    // Выполняем проверку URL только один раз при монтировании компонента
    checkUrlForAuthCode();
  }, []);

  // Обработка получения токена Twitter
  useEffect(() => {
    // Skip token fetch if we already have a Twitter username or missing credentials
    const twitterNameExists = !!twitterName;
    const accessTokenExists = !!sessionStorage.getItem("accessToken");
    const authProcessed = sessionStorage.getItem("auth_processed") === "true";
    const authProcessing = sessionStorage.getItem("auth_processing") === "true";

    // Пропускаем запрос, если:
    // 1. У нас уже есть имя пользователя Twitter или токен доступа
    // 2. Отсутствует код или верификатор
    // 3. Авторизация уже была обработана в этой сессии
    // 4. Авторизация в процессе обработки
    // 5. Уже была попытка авторизации в этом компоненте
    if (
      twitterNameExists ||
      accessTokenExists ||
      !code ||
      !verifier ||
      authProcessed ||
      authProcessing ||
      authAttempted
    ) {
      if (
        code &&
        verifier &&
        !authProcessed &&
        !authProcessing &&
        !authAttempted
      ) {
        console.log("Условия для запроса токена выполнены, продолжаем...");
      } else {
        console.log("Пропускаем запрос токена Twitter:", {
          twitterNameExists,
          accessTokenExists,
          hasCode: !!code,
          hasVerifier: !!verifier,
          authProcessed,
          authProcessing,
          authAttempted,
        });
        return;
      }
    }

    console.log("Starting Twitter token fetch with fresh code...");
    console.log(
      "Code:",
      code.substring(0, 5) + "..." + code.substring(code.length - 5)
    );
    console.log(
      "Verifier:",
      verifier.substring(0, 5) + "..." + verifier.substring(verifier.length - 5)
    );

    // Устанавливаем флаг, что попытка авторизации была сделана
    setAuthAttempted(true);
    // Отмечаем, что авторизация обрабатывается
    sessionStorage.setItem("auth_processing", "true");

    setIsTwitterLoading(true);
    setTwitterError(null);

    // Добавляем небольшую задержку перед запросом токена
    setTimeout(() => {
      fetchTwitterAccessToken(code, verifier)
        .then((username) => {
          // Clear code and verifier only after successful processing
          console.log("Twitter auth successful, username:", username);
          setCode("");
          setVerifier("");
          sessionStorage.removeItem("verifier");
          sessionStorage.removeItem("code");
          sessionStorage.removeItem("redirect_uri");
          sessionStorage.removeItem("oauth_state");

          // Отмечаем, что авторизация была успешно обработана
          sessionStorage.setItem("auth_processed", "true");
          sessionStorage.removeItem("auth_processing");

          // Обновляем имя пользователя в компоненте
          setTwitterName(username);

          // Don't automatically show success for first-time users
          // They need to complete the transaction first
        })
        .catch((error) => {
          // Форматируем сообщение об ошибке для пользователя
          let userErrorMessage = "Ошибка при получении токена Twitter";

          if (error.message) {
            if (
              error.message.includes("invalid_request") ||
              error.message.includes("authorization code")
            ) {
              userErrorMessage =
                "Код авторизации Twitter недействителен или истек. Пожалуйста, попробуйте снова.";
            } else if (error.message.includes("500")) {
              userErrorMessage =
                "Ошибка сервера при авторизации Twitter. Пожалуйста, попробуйте позже.";
            } else if (error.message.includes("401")) {
              userErrorMessage =
                "Ошибка авторизации Twitter. Пожалуйста, попробуйте снова.";
            }
          }

          setTwitterError(userErrorMessage);

          // If we got an invalid code error, we should also clear the code
          // to prevent repeated failed attempts
          if (
            error.message &&
            (error.message.includes("500") ||
              error.message.includes("401") ||
              error.message.includes("invalid_request") ||
              error.message.includes("authorization code"))
          ) {
            console.log("Clearing invalid Twitter auth code");
            setCode("");
            setVerifier("");
            sessionStorage.removeItem("verifier");
            sessionStorage.removeItem("code");
            sessionStorage.removeItem("redirect_uri");
            sessionStorage.removeItem("oauth_state");
            sessionStorage.removeItem("auth_processed");
            sessionStorage.removeItem("auth_processing");
          }
        })
        .finally(() => {
          setIsTwitterLoading(false);
        });
    }, 500); // Задержка в 500 мс для стабильности
  }, [code, verifier, fetchTwitterAccessToken, twitterName, authAttempted]);

  // Очистка флага обработки при размонтировании компонента
  useEffect(() => {
    return () => {
      // Если процесс авторизации не был завершен, очищаем флаг
      if (
        sessionStorage.getItem("auth_processing") === "true" &&
        sessionStorage.getItem("auth_processed") !== "true"
      ) {
        sessionStorage.removeItem("auth_processing");
      }
    };
  }, []);

  // Сохраняем адрес кошелька при его изменении
  useEffect(() => {
    if (connectedWallet?.accounts[0]?.address) {
      const currentAddress = connectedWallet.accounts[0].address;
      console.log("Сохраняем адрес кошелька в localStorage:", currentAddress);
      localStorage.setItem("walletAddress", currentAddress);
      localStorage.setItem("userAuthenticated", "true");
    }
  }, [connectedWallet]);

  const handleSendTransaction = async () => {
    try {
      setModalState("loading");

      // Проверяем сеть перед отправкой транзакции
      const networkCorrect = await ensureCorrectNetwork();
      if (!networkCorrect) return;

      await sendTransaction();

      // Сохраняем статус верификации только после успешной транзакции
      localStorage.setItem("hasCompletedTwitterVerification", "true");
      setModalState("success");
    } catch (error: any) {
      console.error("Transaction error:", error);

      // Проверяем, была ли транзакция отклонена пользователем
      if (
        error.code === 4001 || // MetaMask user rejected
        error.message?.includes("user rejected") ||
        error.message?.includes("User denied") ||
        error.message?.includes("User rejected") ||
        error.message?.includes("cancelled")
      ) {
        // Просто закрываем модальное окно
        setModalState(null);
        return;
      }

      // Для других ошибок показываем сообщение об ошибке
      const errorMessage = getErrorMessage(error);
      setErrorMessage(errorMessage);
      setModalState("error");
    }
  };

  return (
    <div className={styles.container}>
      {isTwitterLoading && (
        <div className={styles.overlayContainer}>
          <div className={styles.loadingContainer}>
            <div className={styles.loadingText}>
              <span>L</span>
              <span>O</span>
              <span>A</span>
              <span>D</span>
              <span>I</span>
              <span>N</span>
              <span>G</span>
            </div>
          </div>
        </div>
      )}
      <div className={styles.rainbow}>
        <img src="/image/contract/rainbow.webp" alt="Rainbow" />
      </div>
      <div className={styles.balloon}>
        <img src="/image/contract/ballon.webp" alt="Hot Air Balloon" />
      </div>
      <p className={styles.title}>SEND TRANSACTION</p>
      <div className={styles.form}>
        <label className={styles.label}>WALLET ADDRESS</label>
        <div className={styles.inputGroup}>
          <input
            type="text"
            placeholder="Enter Wallet..."
            value={formatAddress(walletAdd!)}
            onChange={(e) => setWallet(e.target.value)}
            className={styles.input}
            readOnly={!!connectedWallet}
          />
          <button
            className={styles.reconnectButton}
            onClick={handleReconnectWalletClick}
          >
            <RefreshCw size={20} className={styles.reconnectIcon} /> reconnect
          </button>
        </div>
        <label className={styles.label}>TWITTER USERNAME</label>
        <div className={styles.inputGroup}>
          <input
            type="text"
            placeholder="Enter Twitter..."
            value={isTwitterLoading ? "Loading..." : formatTwitter(twitterName)}
            className={styles.input}
            readOnly={true}
          />
          <button
            className={styles.reconnectButton}
            onClick={handleReconnectTwitterClick}
            disabled={isTwitterLoading}
          >
            <RefreshCw size={20} className={styles.reconnectIcon} /> reconnect
          </button>
        </div>

        <div className={styles.buttonContainer}>
          <div
            className={styles.buttonWrapper}
            onMouseEnter={() => !isFormValid && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <button
              className={styles.createButton}
              onClick={handleSendTransaction}
              disabled={!isFormValid}
            >
              <ButtonBackground />
              <span className={styles.buttonText}>SEND</span>
            </button>
            {showTooltip && !isFormValid && (
              <div className={`${styles.tooltip} ${styles.tooltipVisible}`}>
                <span className={styles.tooltipIcon}>
                  <AlertCircle size={16} />
                </span>
                <span className={styles.tooltipText}>
                  Please fill in all fields
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalState && (
        <Modal onClose={() => setModalState(null)}>
          {modalState === "loading" && (
            <div className={styles.modalContent}>
              <p>Transaction in progress...</p>
              <div className={styles.loadingContainer}>
                <div className={styles.loadingText}>
                  <span>S</span>
                  <span>E</span>
                  <span>N</span>
                  <span>D</span>
                  <span>I</span>
                  <span>N</span>
                  <span>G</span>
                </div>
              </div>
            </div>
          )}

          {modalState === "wrongNetwork" && (
            <div className={styles.modalContent}>
              <p>{errorMessage}</p>
              <div className={styles.switchNetworkButton}>
                <button
                  className={styles.successButton}
                  onClick={switchNetwork}
                >
                  <span className={styles.buttonText}>SWITCH NETWORK</span>
                </button>
              </div>
            </div>
          )}

          {modalState === "error" && (
            <div className={styles.modalContent}>
              <div className={styles.errorContainer}>
                <img
                  src="/sad-sun.png"
                  alt="Error"
                  className={styles.sadEmoji}
                />
                <h3 className={styles.errorTitle}>
                  {errorMessage === "Transaction cancelled"
                    ? "Transaction Cancelled"
                    : "Transaction Failed"}
                </h3>
                <p className={styles.errorMessage}>
                  {errorMessage === "Transaction cancelled"
                    ? "You cancelled the transaction. Would you like to try again?"
                    : errorMessage}
                </p>
              </div>
              <button
                className={styles.tryButton}
                onClick={() => {
                  setModalState(null);
                  setErrorMessage(null);
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {modalState === "success" && (
            <div className={styles.modalContent}>
              <p>
                🎉 Well done!
                <br /> Now you're in. You can go to Twitter and write "GM".
                You'll receive GM coins for every tweet with "GM" word.
                <br /> Use hashtags and cashtags to get even more coins.
              </p>
              <img src="/sun.png" alt="Sun" className={styles.goodEmoji} />
              <a
                className={styles.twittButton}
                href={encodeURI(
                  'https://x.com/intent/tweet?text=Now I can get $GM for every "gm" tweet - awesome 🌀&via=gmcoin_meme'
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className={styles.icon}
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
                </svg>
                Tweet GM
              </a>
              <a
                className={styles.twittButton}
                href="https://x.com/gmcoin_meme"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  className={styles.icon}
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13h-1v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
                </svg>
                Follow @TwitterGM
              </a>

              <button
                className={styles.successButton}
                onClick={() => {
                  // Убедимся, что все данные сохранены перед переходом
                  if (connectedWallet?.accounts[0]?.address) {
                    localStorage.setItem(
                      "walletAddress",
                      connectedWallet.accounts[0].address
                    );
                  }

                  // Устанавливаем флаг аутентификации
                  localStorage.setItem("userAuthenticated", "true");

                  // Сохраняем информацию о том, что пользователь завершил верификацию
                  localStorage.setItem(
                    "hasCompletedTwitterVerification",
                    "true"
                  );

                  // Переходим на дашборд
                  router.push("/");
                }}
              >
                GO TO DASHBOARD 🚀
              </button>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default SendContract;
