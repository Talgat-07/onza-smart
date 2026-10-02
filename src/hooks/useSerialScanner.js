import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";

const DEFAULT_BAUD_RATE = 9600;
const MAX_CODES = 150;
const MAX_RAW_LOG_SIZE = 8000;

// Используется только как начальное значение.
// Реальный token берём непосредственно из scanHistory.
const EMPTY_CODE_VALUE =
  "c71a97cb90336656adabf25fb9c1d6ee5796b733838643270caf6575b74b674b";

const IDLE_FLUSH_DELAY = 120;

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error || "Неизвестная ошибка");
}

function createScanRecord(value) {
  const now = new Date();

  const uid =
    typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${now.getTime()}-${Math.random().toString(16).slice(2)}`;

  return {
    id: uid,
    value,
    dateTime: now.toLocaleString("ru-RU"),
  };
}

export function useSerialScanner() {
  const [baudRate, setBaudRate] = useState(DEFAULT_BAUD_RATE);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [lastCode, setLastCode] = useState(EMPTY_CODE_VALUE);
  const [scanHistory, setScanHistory] = useState([]);

  const [rawLog, setRawLog] = useState("");
  const [errorText, setErrorText] = useState("");

  const portRef = useRef(null);
  const readerRef = useRef(null);

  const isReadingRef = useRef(false);

  const bufferRef = useRef("");
  const flushTimerRef = useRef(null);

  const decoderRef = useRef(null);

  /**
   * Полностью очищает текущий буфер сканирования.
   */
  const clearBuffer = useCallback(() => {
    bufferRef.current = "";

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }
  }, []);

  /**
   * Создание нового события сканирования.
   */
  const addScan = useCallback((code) => {
    const normalizedCode = String(code || "").trim();

    if (!normalizedCode) {
      return;
    }

    const record = createScanRecord(normalizedCode);

    setLastCode(normalizedCode);

    setScanHistory((prev) => [record, ...prev].slice(0, MAX_CODES));
  }, []);

  /**
   * Обработка законченных строк.
   */
  const processBufferLines = useCallback(() => {
    const buffer = bufferRef.current;

    if (!buffer) {
      return;
    }

    const lines = buffer.split(/[\r\n]+/);

    // Последняя строка может быть незаконченной.
    bufferRef.current = lines.pop() || "";

    for (const line of lines) {
      const code = line.trim();

      if (code) {
        addScan(code);
      }
    }
  }, [addScan]);

  /**
   * Если сканер прислал код без CR/LF,
   * забираем его после небольшой паузы.
   */
  const flushIncompleteBuffer = useCallback(() => {
    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const value = bufferRef.current.trim();

    if (!value) {
      bufferRef.current = "";
      return;
    }

    bufferRef.current = "";

    addScan(value);
  }, [addScan]);

  /**
   * Получение данных от COM/USB сканера.
   */
  const processIncomingChunk = useCallback(
    (chunk) => {
      if (!chunk) {
        return;
      }

      setRawLog((prev) => {
        const next = `${prev}${chunk}`;

        if (next.length <= MAX_RAW_LOG_SIZE) {
          return next;
        }

        return next.slice(next.length - MAX_RAW_LOG_SIZE);
      });

      bufferRef.current += chunk;

      /**
       * Сначала пытаемся обработать обычные CR/LF сканы.
       */
      processBufferLines();

      /**
       * Если после CR/LF ничего не осталось,
       * новый timer не нужен.
       */
      if (!bufferRef.current.trim()) {
        if (flushTimerRef.current) {
          clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }

        return;
      }

      /**
       * Некоторые сканеры не отправляют Enter.
       * Поэтому ждём небольшую паузу и считаем буфер одним кодом.
       */
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
      }

      flushTimerRef.current = setTimeout(() => {
        flushIncompleteBuffer();
      }, IDLE_FLUSH_DELAY);
    },
    [flushIncompleteBuffer, processBufferLines],
  );

  /**
   * Остановить чтение.
   */
  const stopReading = useCallback(async () => {
    isReadingRef.current = false;

    if (flushTimerRef.current) {
      clearTimeout(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    const reader = readerRef.current;

    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // reader уже мог быть закрыт
      }
    }

    readerRef.current = null;
  }, []);

  /**
   * Отключение сканера.
   */
  const disconnectScanner = useCallback(
    async (showToast = true) => {
      isReadingRef.current = false;

      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }

      const reader = readerRef.current;
      const port = portRef.current;

      if (reader) {
        try {
          await reader.cancel();
        } catch {
          // ignore
        }

        try {
          reader.releaseLock();
        } catch {
          // ignore
        }
      }

      readerRef.current = null;

      if (port) {
        try {
          if (port.readable) {
            // Ничего дополнительно не читаем.
          }
        } catch {
          // ignore
        }

        try {
          await port.close();
        } catch {
          // ignore
        }
      }

      portRef.current = null;

      clearBuffer();

      setIsConnected(false);
      setIsConnecting(false);

      if (showToast) {
        message.info("Сканер отключен");
      }
    },
    [clearBuffer],
  );

  /**
   * Чтение данных напрямую из SerialPort.
   *
   * Это проще и надёжнее, чем:
   *
   * port.readable.pipeTo(TextDecoderStream(...))
   *
   * потому что при отключении не остаётся зависший pipe.
   */
  const startReading = useCallback(
    async (port) => {
      if (!port?.readable) {
        return;
      }

      const reader = port.readable.getReader();

      readerRef.current = reader;
      isReadingRef.current = true;

      const decoder = new TextDecoder("utf-8", {
        fatal: false,
      });

      decoderRef.current = decoder;

      try {
        while (isReadingRef.current) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          if (!value) {
            continue;
          }

          const text = decoder.decode(value, {
            stream: true,
          });

          if (text) {
            processIncomingChunk(text);
          }
        }

        /**
         * Забираем остаток decoder.
         */
        const finalText = decoder.decode();

        if (finalText) {
          processIncomingChunk(finalText);
        }
      } catch (error) {
        if (isReadingRef.current) {
          const readableError = formatError(error);

          setErrorText(
            `Ошибка чтения данных: ${readableError}`,
          );

          message.error(
            `Ошибка чтения данных: ${readableError}`,
          );
        }
      } finally {
        isReadingRef.current = false;

        try {
          reader.releaseLock();
        } catch {
          // ignore
        }

        if (readerRef.current === reader) {
          readerRef.current = null;
        }

        decoderRef.current = null;

        /**
         * Если порт закрылся сам,
         * синхронизируем состояние React.
         */
        if (portRef.current === port) {
          portRef.current = null;

          setIsConnected(false);
          setIsConnecting(false);
        }
      }
    },
    [processIncomingChunk],
  );

  /**
   * Подключение сканера.
   */
  const connectScanner = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !("serial" in navigator)
    ) {
      const unsupportedText =
        "Web Serial API не поддерживается этим браузером. Используйте Chrome/Edge по HTTPS или localhost.";

      setErrorText(unsupportedText);
      message.error(unsupportedText);

      return;
    }

    /**
     * Если уже подключён — ничего не делаем.
     */
    if (portRef.current) {
      return;
    }

    setErrorText("");
    setIsConnecting(true);

    try {
      /**
       * Выбор COM-порта пользователем.
       */
      const port = await navigator.serial.requestPort();

      await port.open({
        baudRate: Number(baudRate) || DEFAULT_BAUD_RATE,

        /**
         * Обычно для QR/штрихкод-сканеров
         * остальные параметры стандартные.
         */
        dataBits: 8,
        stopBits: 1,
        parity: "none",
        flowControl: "none",
      });

      portRef.current = port;

      setIsConnected(true);
      setIsConnecting(false);

      message.success(
        "Сканер подключен, можно сканировать QR-коды",
      );

      /**
       * Запускаем чтение.
       */
      void startReading(port);
    } catch (error) {
      const readableError = formatError(error);

      setErrorText(
        `Ошибка подключения: ${readableError}`,
      );

      setIsConnected(false);
      setIsConnecting(false);

      portRef.current = null;

      /**
       * Пользователь просто нажал Cancel
       * в окне выбора COM-порта.
       */
      if (
        error?.name === "NotFoundError" ||
        error?.name === "AbortError"
      ) {
        return;
      }

      message.error(
        `Ошибка подключения: ${readableError}`,
      );
    }
  }, [baudRate, startReading]);

  /**
   * Очистка истории.
   */
  const clearLog = useCallback(() => {
    setScanHistory([]);
    setRawLog("");
    setLastCode(EMPTY_CODE_VALUE);

    clearBuffer();
  }, [clearBuffer]);

  /**
   * Автоматически отслеживаем отключение USB/COM устройства.
   */
  useEffect(() => {
    if (
      typeof navigator === "undefined" ||
      !navigator.serial
    ) {
      return undefined;
    }

    const handleDisconnect = (event) => {
      if (
        portRef.current &&
        event.port === portRef.current
      ) {
        void disconnectScanner(false);

        message.warning(
          "Сканер был отключен",
        );
      }
    };

    navigator.serial.addEventListener(
      "disconnect",
      handleDisconnect,
    );

    return () => {
      navigator.serial.removeEventListener(
        "disconnect",
        handleDisconnect,
      );
    };
  }, [disconnectScanner]);

  /**
   * Cleanup компонента.
   */
  useEffect(() => {
    return () => {
      void disconnectScanner(false);
    };
  }, [disconnectScanner]);

  return {
    baudRate,
    isConnected,
    isConnecting,

    lastCode,
    scanHistory,

    rawLog,
    errorText,

    setBaudRate,

    connectScanner,
    disconnectScanner,

    clearLog,

    totalCodes: scanHistory.length,

    /**
     * Оставляем для совместимости.
     */
    emptyCodeValue: EMPTY_CODE_VALUE,
  };
}
