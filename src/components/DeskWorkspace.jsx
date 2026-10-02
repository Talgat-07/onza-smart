import {
  Alert,
  Button,
  Card,
  Input,
  List,
  Space,
  Tag,
  Typography,
} from "antd";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLazyGetIssueOrdersQuery,
  useScanClientQrMutation,
} from "../store/api/ordersApi";

import { useSerialScanner } from "../hooks/useSerialScanner";
import ScannerControlCard from "./ScannerControlCard";

const { Text } = Typography;

const READY_STATUS = 29;

const AUDIO_FILES = {
  FOUND: "/1.mpeg",
  READY: "/2.mpeg",
  NOT_FOUND: "/3.mpeg",
};

function DeskWorkspace() {
  const {
    baudRate,
    isConnected,
    isConnecting,
    scanHistory,
    errorText,

    setBaudRate,
    connectScanner,
    disconnectScanner,
    clearLog,
  } = useSerialScanner();

  const [token, setToken] = useState("");
  const [manualToken, setManualToken] = useState("");
  const [result, setResult] = useState(null);

  const [
    getOrders,
    {
      currentData,
      isFetching,
      error,
    },
  ] = useLazyGetIssueOrdersQuery();

  const [
    issueByToken,
    {
      isLoading: isIssuing,
    },
  ] = useScanClientQrMutation();

  const lastScan = scanHistory[0];

  /**
   * Не даём одному и тому же scan-событию
   * выполняться несколько раз.
   */
  const processedScanIdRef = useRef(null);

  /**
   * Audio.
   */
  const audioRef = useRef({
    found: null,
    ready: null,
    notFound: null,
  });

  /**
   * Создаём Audio один раз.
   */
  useEffect(() => {
    audioRef.current.found = new Audio(
      AUDIO_FILES.FOUND,
    );

    audioRef.current.ready = new Audio(
      AUDIO_FILES.READY,
    );

    audioRef.current.notFound = new Audio(
      AUDIO_FILES.NOT_FOUND,
    );

    Object.values(audioRef.current).forEach(
      (audio) => {
        if (!audio) {
          return;
        }

        audio.preload = "auto";
      },
    );

    return () => {
      Object.values(audioRef.current).forEach(
        (audio) => {
          if (!audio) {
            return;
          }

          audio.pause();
          audio.currentTime = 0;
        },
      );
    };
  }, []);

  /**
   * Воспроизведение голосового сообщения.
   */
  const playVoice = useCallback((type) => {
    const audio = audioRef.current[type];

    if (!audio) {
      return;
    }

    try {
      audio.pause();
      audio.currentTime = 0;

      const promise = audio.play();

      if (promise) {
        promise.catch((error) => {
          console.warn(
            "Не удалось воспроизвести аудио:",
            error,
          );
        });
      }
    } catch (error) {
      console.warn(
        "Audio playback error:",
        error,
      );
    }
  }, []);

  /**
   * Основная функция обработки token.
   *
   * Ею пользуются:
   * - реальный сканер;
   * - ручной ввод.
   */
  const processToken = useCallback(
    async (value) => {
      const scannedToken = String(
        value || "",
      ).trim();

      if (!scannedToken) {
        return;
      }

      setToken(scannedToken);
      setResult(null);

      try {
        const data = await getOrders(
          scannedToken,
        ).unwrap();

        const orders = data?.orders ?? [];

        const readyCount = orders.filter(
          (order) =>
            Number(order?.status) ===
            READY_STATUS,
        ).length;

        if (orders.length > 0) {
          playVoice("found");
          return;
        }

        playVoice("notFound");
      } catch (requestError) {
        console.error(
          "GET ORDERS ERROR:",
          requestError,
        );
      }
    },
    [getOrders, playVoice],
  );

  useEffect(() => {
    if (!lastScan?.id) {
      return;
    }

    if (
      processedScanIdRef.current ===
      lastScan.id
    ) {
      return;
    }

    processedScanIdRef.current =
      lastScan.id;

    processToken(lastScan.value);
  }, [
    lastScan?.id,
    lastScan?.value,
    processToken,
  ]);

  /**
   * Ручной ввод.
   */
  const handleManualSearch = async () => {
    const value = manualToken.trim();

    if (!value || isFetching) {
      return;
    }

    await processToken(value);
  };

  /**
   * Enter в поле token.
   */
  const handleManualKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      void handleManualSearch();
    }
  };

  /**
   * Выдача заказов.
   */
  const handleIssue = async () => {
    if (!token || isIssuing) {
      return;
    }

    try {
      const res =
        await issueByToken(token).unwrap();

      if (!res?.success) {
        setResult({
          type: "error",
          text: `${res?.message ||
            "Ошибка выдачи заказа"
            }. Сгенерируйте новый токен.`,
        });

        return;
      }

      setResult({
        type: "success",
        text:
          res?.message ||
          "Заказ успешно выдан",
      });
      playVoice("ready"); // 2.mpeg
      /**
       * Обновляем список после выдачи.
       */
      await getOrders(token).unwrap();
    } catch (e) {
      console.error(
        "ISSUE ERROR:",
        e,
      );

      const errorMessage =
        e?.data?.message ||
        e?.error ||
        "Ошибка выдачи заказа";

      setResult({
        type: "error",
        text: `${errorMessage}. Сгенерируйте новый токен.`,
      });
    }
  };

  /**
   * Полный сброс.
   */
  const handleReset = () => {
    setToken("");
    setManualToken("");
    setResult(null);

    clearLog();

    processedScanIdRef.current = null;
  };

  const orders =
    currentData?.orders ?? [];

  const client =
    currentData?.user;

  const readyCount = orders.filter(
    (order) =>
      Number(order?.status) ===
      READY_STATUS,
  ).length;

  return (
    <Space
      direction="vertical"
      size={16}
      style={{
        width: "100%",
      }}
    >
      {/* ========================================
          СКАНЕР
      ======================================== */}

      {!isConnected ? (
        <ScannerControlCard
          isConnected={isConnected}
          isConnecting={isConnecting}
          baudRate={baudRate}
          onBaudRateChange={setBaudRate}
          onConnect={connectScanner}
          onDisconnect={disconnectScanner}
          onClear={clearLog}
        />
      ) : (
        <Space>
          <Tag color="success">
            Сканер подключен
          </Tag>

          <Button
            size="small"
            onClick={() =>
              disconnectScanner()
            }
          >
            Отключить
          </Button>
        </Space>
      )}

      {errorText && (
        <Alert
          showIcon
          type="error"
          message={errorText}
        />
      )}

      {/* ========================================
          РУЧНОЙ ВВОД ДЛЯ ТЕСТА
      ======================================== */}

      <Card title="Тестовый ввод токена">
        <Space.Compact
          style={{
            width: "100%",
          }}
        >
          <Input
            value={manualToken}
            onChange={(event) =>
              setManualToken(
                event.target.value,
              )
            }
            onKeyDown={
              handleManualKeyDown
            }
            placeholder="Введите token клиента"
            allowClear
            disabled={isFetching}
          />

          <Button
            type="primary"
            loading={isFetching}
            onClick={
              handleManualSearch
            }
          >
            Проверить
          </Button>
        </Space.Compact>

        <Text
          type="secondary"
          style={{
            display: "block",
            marginTop: 8,
          }}
        >
          Можно вставить token вручную
          и нажать Enter или «Проверить».
        </Text>
      </Card>

      {/* ========================================
          ЗАКАЗЫ
      ======================================== */}

      <Card
        title="Заказы клиента"
        extra={
          token ? (
            <Button
              onClick={handleReset}
            >
              Сбросить
            </Button>
          ) : null
        }
      >
        {!token && (
          <Alert
            type="info"
            showIcon
            message="Отсканируйте QR-код клиента или введите token вручную"
          />
        )}

        {token && (
          <>
            {client && (
              <Space
                direction="vertical"
                size={2}
                style={{
                  marginBottom: 16,
                }}
              >
                <Text strong>
                  Код клиента:{" "}
                  {client.client_code}
                </Text>

                <Text>
                  {client.last_name}{" "}
                  {client.first_name}
                </Text>
              </Space>
            )}

            {error && (
              <Alert
                showIcon
                type="error"
                message={
                  error?.data?.message ||
                  error?.error ||
                  "Ошибка загрузки заказов"
                }
              />
            )}

            {!error &&
              !isFetching &&
              !orders.length && (
                <Alert
                  type="warning"
                  showIcon
                  message="Заказы не найдены"
                />
              )}

            <List
              loading={isFetching}
              dataSource={orders}
              locale={{
                emptyText:
                  "Заказы отсутствуют",
              }}
              renderItem={(item) => (
                <List.Item>
                  <Space
                    style={{
                      width: "100%",
                      justifyContent:
                        "space-between",
                    }}
                    align="start"
                  >
                    <Space
                      direction="vertical"
                      size={2}
                    >
                      <Text strong>
                        {
                          item.tracking_number
                        }
                      </Text>

                      <Text type="secondary">
                        {item.created_date
                          ? new Date(
                            item.created_date,
                          ).toLocaleString(
                            "ru-RU",
                          )
                          : ""}
                      </Text>
                    </Space>

                    {Number(
                      item.status,
                    ) ===
                      READY_STATUS ? (
                      <Tag color="success">
                        Готов к выдаче
                      </Tag>
                    ) : (
                      <Tag>
                        Статус:{" "}
                        {item.status}
                      </Tag>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          </>
        )}
      </Card>

      {/* ========================================
          ВЫДАЧА
      ======================================== */}

      {token && (
        <Button
          type="primary"
          size="large"
          block
          loading={isIssuing}
          disabled={
            !readyCount ||
            isFetching ||
            !!error
          }
          onClick={handleIssue}
        >
          Выдать
          {readyCount
            ? ` (${readyCount})`
            : ""}
        </Button>
      )}

      {/* ========================================
          РЕЗУЛЬТАТ ВЫДАЧИ
      ======================================== */}

      {result && (
        <Alert
          showIcon
          type={result.type}
          message={result.text}
        />
      )}
    </Space>
  );
}

export default DeskWorkspace;
