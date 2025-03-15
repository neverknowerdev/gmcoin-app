import { useCallback } from "react";
import { useWeb3 } from "@/src/hooks/useWeb3";
import { CURRENT_CHAIN, TOKEN_URL, TWITTER_CLIENT_ID } from "@/src/config";
import { generateCodeVerifier, generateCodeChallenge } from "@/src/utils/auth";

interface WalletActionsParams {
  connect: () => Promise<void>;
  setModalState: (
    state: "loading" | "error" | "success" | "wrongNetwork" | null
  ) => void;
  setErrorMessage: (message: string | null) => void;
  setTwitterName?: (name: string | null) => void;
  setVerifier?: (verifier: string) => void;
  setIsWrongNetwork?: (state: boolean) => void;
  setUser: (name: string | null) => void;
}

export const useWalletActions = ({
  connect,
  setModalState,
  setErrorMessage,
  setTwitterName,
  setUser,
  setIsWrongNetwork,
}: WalletActionsParams) => {
  const { disconnect, connectedChain, getProvider, web3Onboard } = useWeb3();

  const handleSwitchNetwork = useCallback(async () => {
    console.log("handleSwitchNetwork");

    try {
      // Используем web3Onboard для переключения сети
      const success = await web3Onboard?.setChain({
        chainId: CURRENT_CHAIN.hexId,
      });

      if (success) {
        console.log(
          `✅ Успешно переключились на сеть ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`
        );
        setIsWrongNetwork?.(false);
        setModalState(null);
        return true;
      } else {
        console.error(
          `❌ Не удалось переключиться на сеть ${CURRENT_CHAIN.label}`
        );
        setErrorMessage(
          `Не удалось переключиться на сеть ${CURRENT_CHAIN.label}. Пожалуйста, переключите сеть вручную в вашем кошельке.`
        );
        setModalState("error");
        return false;
      }
    } catch (switchError: any) {
      console.error("❌ Ошибка при переключении сети:", switchError);
      setErrorMessage(
        `Ошибка при переключении сети: ${
          switchError.message || "Неизвестная ошибка"
        }`
      );
      setModalState("error");
      return false;
    }
  }, [web3Onboard, setIsWrongNetwork, setModalState, setErrorMessage]);

  // Функция для проверки правильности сети
  const checkNetwork = useCallback(async () => {
    if (!connectedChain) {
      console.log("❌ Нет подключенной сети");
      return false;
    }

    const currentChainId = parseInt(connectedChain.id, 16);
    const targetChainId = CURRENT_CHAIN.id;

    console.log(
      `🔍 Проверка сети: текущая ${currentChainId}, целевая ${targetChainId}`
    );

    if (currentChainId !== targetChainId) {
      console.log(
        `❌ Неправильная сеть: ${currentChainId}, требуется ${targetChainId}`
      );
      setIsWrongNetwork?.(true);
      return false;
    }

    console.log(
      `✅ Правильная сеть: ${CURRENT_CHAIN.label} (${targetChainId})`
    );
    setIsWrongNetwork?.(false);
    return true;
  }, [connectedChain, setIsWrongNetwork]);

  // Функция для мониторинга изменений сети
  const setupNetworkMonitoring = useCallback(() => {
    if (typeof window === "undefined" || !window.ethereum) return () => {};

    const handleChainChanged = (chainId: string | unknown) => {
      if (typeof chainId !== "string") return;

      const newChainId = parseInt(chainId, 16);
      console.log(`🔄 Сеть изменена на: ${newChainId}`);

      if (newChainId !== CURRENT_CHAIN.id) {
        console.log(
          `⚠️ Обнаружена неправильная сеть: ${newChainId}, требуется ${CURRENT_CHAIN.id}`
        );
        setIsWrongNetwork?.(true);
      } else {
        console.log(
          `✅ Сеть соответствует требуемой: ${CURRENT_CHAIN.label} (${CURRENT_CHAIN.id})`
        );
        setIsWrongNetwork?.(false);
      }
    };

    // @ts-ignore - игнорируем ошибку типизации для ethereum
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      if (window.ethereum) {
        // @ts-ignore - игнорируем ошибку типизации для ethereum
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [setIsWrongNetwork]);

  const handleReconnectWallet = useCallback(
    async (setWalletAdd: any) => {
      try {
        await disconnect();
        await connect();
        const walletAddress = localStorage.getItem("walletAddress");
        setWalletAdd(walletAddress || "");
        setModalState(null);
        return walletAddress;
      } catch (error) {
        setErrorMessage("Failed to reconnect wallet");
        setModalState("error");
      }
    },
    [disconnect, connect, setModalState, setErrorMessage]
  );

  const handleReconnectTwitter = useCallback(async () => {
    try {
      console.log("Начинаем процесс авторизации Twitter...");

      // Очищаем все предыдущие данные авторизации
      sessionStorage.removeItem("code");
      sessionStorage.removeItem("verifier");
      sessionStorage.removeItem("auth_processed");
      sessionStorage.removeItem("auth_processing");
      sessionStorage.removeItem("redirect_uri");
      sessionStorage.removeItem("oauth_state");

      // Генерируем новый code_verifier с использованием crypto API
      let codeVerifier = "";
      const array = new Uint8Array(64);
      window.crypto.getRandomValues(array);
      codeVerifier = Array.from(array, (byte) =>
        ("0" + (byte & 0xff).toString(16)).slice(-2)
      ).join("");

      // Убеждаемся, что длина verifier соответствует требованиям (43-128 символов)
      if (codeVerifier.length > 128) {
        codeVerifier = codeVerifier.substring(0, 128);
      } else if (codeVerifier.length < 43) {
        // Дополняем до минимальной длины
        while (codeVerifier.length < 43) {
          codeVerifier += Math.random().toString(36).substring(2);
        }
        codeVerifier = codeVerifier.substring(0, 128);
      }

      console.log("Сгенерирован code_verifier длиной:", codeVerifier.length);

      // Сохраняем verifier в sessionStorage
      sessionStorage.setItem("verifier", codeVerifier);

      // Генерируем code_challenge
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      console.log("Сгенерирован code_challenge");

      // Генерируем state для защиты от CSRF
      const state =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("oauth_state", state);

      // Создаем redirect_uri на основе текущего URL
      const redirectUri = window.location.origin + window.location.pathname;
      sessionStorage.setItem("redirect_uri", redirectUri);

      // Кодируем redirect_uri для URL
      const encodedRedirectUri = encodeURIComponent(redirectUri);

      // Формируем URL авторизации Twitter
      const twitterAuthUrl = `https://x.com/i/oauth2/authorize?response_type=code&client_id=${TWITTER_CLIENT_ID}&redirect_uri=${encodedRedirectUri}&scope=users.read%20tweet.read&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      console.log(
        "Перенаправление на URL авторизации Twitter:",
        twitterAuthUrl
      );

      // Перенаправляем пользователя на страницу авторизации Twitter
      window.location.href = twitterAuthUrl;
    } catch (error) {
      console.error("Ошибка при переподключении Twitter:", error);
      setErrorMessage("Failed to reconnect Twitter");
      setModalState("error");
    }
  }, [setErrorMessage, setModalState, setUser]);

  // Функция для повторных попыток запроса с задержкой
  const retryWithDelay = async (
    fn: () => Promise<any>,
    retries = 3,
    delay = 1000
  ) => {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }
      console.log(
        `Повторная попытка через ${delay}мс, осталось попыток: ${retries}`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
      return retryWithDelay(fn, retries - 1, delay * 1.5);
    }
  };

  const handleFetchTwitterAccessToken = useCallback(
    async (code: string, verifier: string) => {
      const url = TOKEN_URL;
      if (!url) {
        console.error("❌ TOKEN_URL не определен в .env!");
        throw new Error("Ошибка конфигурации сервера: TOKEN_URL не определен");
      }

      // Проверяем, был ли этот код уже обработан
      const processedCodes = JSON.parse(
        sessionStorage.getItem("processed_auth_codes") || "[]"
      );
      if (processedCodes.includes(code)) {
        // Возвращаем имя пользователя из localStorage, если оно есть
        const cachedUsername = localStorage.getItem("twitterName");
        if (cachedUsername) {
          return cachedUsername;
        }
      }

      // Получаем сохраненный redirect_uri - ВАЖНО использовать точно такой же URI, который был использован при запросе кода
      const redirectUri =
        sessionStorage.getItem("redirect_uri") ||
        window.location.origin + window.location.pathname;

      // Убедимся, что redirect_uri не содержит лишних параметров
      const cleanRedirectUri = redirectUri.split("?")[0];
      console.log(
        "Используем redirect_uri для запроса токена:",
        cleanRedirectUri
      );

      // Генерируем уникальный идентификатор запроса для отслеживания
      const requestId = `${code.substring(0, 5)}_${Date.now()}`;
      console.log(`📝 Запрос токена Twitter [${requestId}]`);

      console.log(
        "Отправка запроса на получение токена Twitter с параметрами:"
      );
      console.log("- URL:", url);
      console.log(
        "- Code:",
        code.substring(0, 5) + "..." + code.substring(code.length - 5)
      );
      console.log(
        "- Verifier:",
        verifier.substring(0, 5) +
          "..." +
          verifier.substring(verifier.length - 5)
      );
      console.log("- Redirect URI:", cleanRedirectUri);
      console.log("- Request ID:", requestId);

      try {
        // Добавляем код в список обработанных сразу, чтобы избежать повторных запросов
        if (!processedCodes.includes(code)) {
          processedCodes.push(code);
          sessionStorage.setItem(
            "processed_auth_codes",
            JSON.stringify(processedCodes)
          );
        }

        // Добавляем небольшую случайную задержку для предотвращения гонки условий
        const randomDelay = Math.floor(Math.random() * 100);
        await new Promise((resolve) => setTimeout(resolve, randomDelay));

        const requestBody = {
          authCode: code,
          verifier: verifier,
          redirectUri: cleanRedirectUri,
        };

        // Используем функцию повторных попыток с меньшим количеством повторов
        const data = await retryWithDelay(async () => {
          const response = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache, no-store",
              Pragma: "no-cache",
              "X-Request-ID": requestId,
            },
            body: JSON.stringify(requestBody),
          });

          console.log(`📥 Ответ от сервера [${requestId}]:`, response.status);

          if (!response.ok) {
            let errorText;
            try {
              errorText = await response.text();
            } catch (e) {
              errorText = "Не удалось получить текст ошибки";
            }

            // Если ошибка связана с недействительным кодом, не пытаемся повторить запрос
            if (
              errorText.includes("invalid_request") ||
              errorText.includes("authorization code") ||
              errorText.includes(
                "Value passed for the authorization code was invalid"
              )
            ) {
              throw new Error(
                `Код авторизации недействителен: ${response.status}, ${errorText}`
              );
            }

            throw new Error(
              `HTTP error! Status: ${response.status}, Text: ${errorText}`
            );
          }

          let responseData;
          try {
            responseData = await response.json();
          } catch (e) {
            console.error(`❌ Ошибка при парсинге JSON [${requestId}]:`, e);
            throw new Error("Ошибка при парсинге ответа сервера");
          }

          return responseData;
        }, 1); // Только одна повторная попытка

        console.log(`✅ Получены данные от сервера [${requestId}]:`, {
          username: data.username,
          user_id: data.user_id,
          hasAccessToken: !!data.access_token,
          hasEncryptedToken: !!data.encrypted_access_token,
        });

        if (!data || !data.username) {
          console.error(
            `❌ Получен неверный ответ от сервера [${requestId}]:`,
            data
          );
          throw new Error("Invalid response from server");
        }

        // Сохраняем данные пользователя
        setTwitterName?.(data.username);
        localStorage.setItem("twitterName", data.username);
        localStorage.setItem("twitterUserId", data.user_id);
        localStorage.setItem("isTwitterConnected", "true");
        localStorage.setItem("userAuthenticated", "true");

        // Сохраняем токены
        if (data.encrypted_access_token) {
          localStorage.setItem(
            "encryptedAccessToken",
            data.encrypted_access_token
          );
          sessionStorage.setItem(
            "encryptedAccessToken",
            data.encrypted_access_token
          );
        }

        if (data.access_token) {
          localStorage.setItem("accessToken", data.access_token);
          sessionStorage.setItem("accessToken", data.access_token);
        }

        // Отмечаем, что авторизация успешно завершена
        sessionStorage.setItem("auth_processed", "true");
        sessionStorage.removeItem("auth_processing");

        return data.username;
      } catch (error: any) {
        // console.error(
        //   `❌ Ошибка при получении токена Twitter [${requestId}]:`,
        //   error
        // );

        // Если ошибка связана с истекшим кодом, предлагаем пользователю повторную авторизацию
        if (
          error.message &&
          (error.message.includes("500") ||
            error.message.includes("401") ||
            error.message.includes("invalid_request") ||
            error.message.includes("authorization code"))
        ) {
          // Очищаем данные авторизации
          sessionStorage.removeItem("code");
          sessionStorage.removeItem("verifier");
          sessionStorage.removeItem("auth_processed");
          sessionStorage.removeItem("auth_processing");
        }

        throw error;
      }
    },
    [setTwitterName]
  );

  return {
    switchNetwork: handleSwitchNetwork,
    reconnectWallet: handleReconnectWallet,
    reconnectTwitter: handleReconnectTwitter,
    fetchTwitterAccessToken: handleFetchTwitterAccessToken,
    checkNetwork,
    setupNetworkMonitoring,
  };
};
