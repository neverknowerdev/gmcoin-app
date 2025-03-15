import { TOKEN_URL } from "@/src/config";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const url = TOKEN_URL;

  if (!url) {
    console.error("❌ TOKEN_URL не определен в .env!");
    return res.status(500).json({ error: "Server configuration error" });
  }

  // Проверяем наличие необходимых параметров
  const { authCode, verifier, redirectUri } = req.body;

  if (!authCode || !verifier) {
    console.error("❌ Отсутствуют обязательные параметры в запросе");
    return res.status(400).json({
      error: "Missing required parameters",
      details: {
        hasAuthCode: !!authCode,
        hasVerifier: !!verifier,
        hasRedirectUri: !!redirectUri,
      },
    });
  }

  // Проверяем, не является ли запрос дубликатом
  const requestId = `${authCode.substring(0, 10)}_${Date.now()}`;
  console.log(`📝 Обработка запроса ${requestId}`);

  // Убедимся, что redirectUri не содержит лишних параметров
  const cleanRedirectUri = redirectUri
    ? redirectUri.split("?")[0]
    : redirectUri;

  console.log("📤 Отправка запроса к Twitter API:", {
    url,
    bodyLength: JSON.stringify(req.body).length,
    hasAuthCode: !!authCode,
    hasVerifier: !!verifier,
    hasRedirectUri: !!cleanRedirectUri,
    authCodeLength: authCode?.length,
    verifierLength: verifier?.length,
  });

  try {
    // Добавляем случайную задержку для предотвращения гонки условий
    const randomDelay = Math.floor(Math.random() * 100);
    await new Promise((resolve) => setTimeout(resolve, randomDelay));

    // Создаем модифицированное тело запроса с очищенным redirectUri
    const modifiedBody = {
      ...req.body,
      redirectUri: cleanRedirectUri,
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Request-ID": requestId,
        "Cache-Control": "no-cache, no-store",
        Pragma: "no-cache",
      },
      body: JSON.stringify(modifiedBody),
    });

    console.log(`📥 Получен ответ от Twitter API для запроса ${requestId}:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Попытка получить тело ответа как текст
    const responseText = await response.text();
    console.log(`📄 Тело ответа для запроса ${requestId}:`, responseText);

    // Попытка преобразовать текст в JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(
        `❌ Ошибка при парсинге JSON для запроса ${requestId}:`,
        parseError
      );
      return res.status(response.status).json({
        error: "Invalid JSON response from server",
        originalResponse: responseText,
        requestId,
      });
    }

    // Проверяем наличие ошибки в ответе
    if (data.error || data.success === false) {
      console.error(`❌ Ошибка в ответе API для запроса ${requestId}:`, data);

      // Если ошибка связана с недействительным кодом авторизации, возвращаем специальный статус
      if (
        data.error?.error === "invalid_request" ||
        (data.error?.error_description &&
          data.error.error_description.includes("authorization code"))
      ) {
        return res.status(400).json({
          ...data,
          message: "Код авторизации уже был использован или истек",
          requestId,
        });
      }

      return res.status(400).json({
        ...data,
        requestId,
      });
    }

    // Проверка наличия необходимых полей в ответе
    if (!data.username || !data.user_id) {
      console.error(
        `❌ Отсутствуют необходимые поля в ответе для запроса ${requestId}:`,
        data
      );
      return res.status(400).json({
        error: "Missing required fields in response",
        originalResponse: data,
        requestId,
      });
    }

    console.log(`✅ Успешно обработан запрос ${requestId}`);
    return res.status(response.status).json({
      ...data,
      requestId,
    });
  } catch (error: any) {
    console.error(
      `❌ Proxy error для запроса ${requestId}:`,
      error.message || error
    );
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message || "Unknown error",
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      requestId,
    });
  }
}
