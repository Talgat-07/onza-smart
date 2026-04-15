import { useCallback, useEffect, useRef, useState } from "react";
import { message } from "antd";

const DEFAULT_BAUD_RATE = 9600;
const MAX_CODES = 150;
const MAX_RAW_LOG_SIZE = 8000;
const EMPTY_CODE_VALUE = "—";

function formatError(error) {
  return error instanceof Error ? error.message : "Неизвестная ошибка";
}

function createScanRecord(value) {
  const now = new Date();
  const uid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
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
  const readableClosedRef = useRef(null);
  const isReadingRef = useRef(false);
  const bufferRef = useRef("");

  const clearLog = useCallback(() => {
    setScanHistory([]);
    setRawLog("");
    setLastCode(EMPTY_CODE_VALUE);
    bufferRef.current = "";
  }, []);

  const disconnectScanner = useCallback(async (showToast = true) => {
    isReadingRef.current = false;

    const reader = readerRef.current;
    const port = portRef.current;
    const readableClosed = readableClosedRef.current;

    if (reader) {
      try {
        await reader.cancel();
      } catch {
        // ignore
      }
    }

    if (readableClosed) {
      await readableClosed.catch(() => {});
    }

    if (port) {
      try {
        await port.close();
      } catch {
        // ignore
      }
    }

    readerRef.current = null;
    readableClosedRef.current = null;
    portRef.current = null;
    bufferRef.current = "";

    setIsConnected(false);
    setIsConnecting(false);

    if (showToast) {
      message.info("Сканер отключен");
    }
  }, []);

  const processIncomingChunk = useCallback((chunk) => {
    setRawLog((prev) => {
      const next = `${prev}${chunk}`;
      return next.length > MAX_RAW_LOG_SIZE
        ? next.slice(next.length - MAX_RAW_LOG_SIZE)
        : next;
    });

    bufferRef.current += chunk;
    const lines = bufferRef.current.split(/[\r\n]+/);
    bufferRef.current = lines.pop() ?? "";

    const parsedCodes = lines.map((line) => line.trim()).filter(Boolean);

    if (!parsedCodes.length) {
      return;
    }

    setLastCode(parsedCodes[parsedCodes.length - 1]);

    const newRecords = parsedCodes
      .map((code) => createScanRecord(code))
      .reverse();

    setScanHistory((prev) => [...newRecords, ...prev].slice(0, MAX_CODES));
  }, []);

  const startReading = useCallback(
    async (port) => {
      const textDecoder = new TextDecoderStream();
      readableClosedRef.current = port.readable.pipeTo(textDecoder.writable);

      const reader = textDecoder.readable.getReader();
      readerRef.current = reader;
      isReadingRef.current = true;

      try {
        while (isReadingRef.current) {
          const { value, done } = await reader.read();

          if (done) {
            break;
          }

          if (value) {
            processIncomingChunk(value);
          }
        }
      } catch (error) {
        if (isReadingRef.current) {
          const readableError = formatError(error);
          setErrorText(`Ошибка чтения данных: ${readableError}`);
          message.error(`Ошибка чтения данных: ${readableError}`);
        }
      } finally {
        try {
          reader.releaseLock();
        } catch {
          // ignore
        }

        readerRef.current = null;

        if (readableClosedRef.current) {
          await readableClosedRef.current.catch(() => {});
          readableClosedRef.current = null;
        }

        if (portRef.current === port) {
          await disconnectScanner(false);
        }
      }
    },
    [disconnectScanner, processIncomingChunk],
  );

  const connectScanner = useCallback(async () => {
    if (typeof navigator === "undefined" || !("serial" in navigator)) {
      const unsupportedText =
        "Web Serial API не поддерживается этим браузером. Используйте Chrome/Edge по HTTPS или localhost.";
      setErrorText(unsupportedText);
      message.error(unsupportedText);
      return;
    }

    setErrorText("");
    setIsConnecting(true);

    try {
      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: Number(baudRate) || DEFAULT_BAUD_RATE });

      portRef.current = port;
      setIsConnected(true);
      setIsConnecting(false);

      message.success("Сканер подключен, можно сканировать QR-коды");
      void startReading(port);
    } catch (error) {
      const readableError = formatError(error);
      setErrorText(`Ошибка подключения: ${readableError}`);
      setIsConnected(false);
      setIsConnecting(false);
      portRef.current = null;
      message.error(`Ошибка подключения: ${readableError}`);
    }
  }, [baudRate, startReading]);

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
    emptyCodeValue: EMPTY_CODE_VALUE,
  };
}
