import { Alert, Button, Card, List, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import {
  useLazyGetIssueOrdersQuery,
  useScanClientQrMutation,
} from "../store/api/ordersApi";
import { useSerialScanner } from "../hooks/useSerialScanner";
import ScannerControlCard from "./ScannerControlCard";

const { Text } = Typography;

const READY_STATUS = 29;

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
    emptyCodeValue
  } = useSerialScanner();

  const [token, setToken] = useState("");
  const [result, setResult] = useState(null); // { type: "success" | "error", text }

  const [getOrders, { currentData, isFetching, error }] =
    useLazyGetIssueOrdersQuery();
  const [issueByToken, { isLoading: isIssuing }] = useScanClientQrMutation();

  // Каждый новый скан (даже такой же код повторно) имеет уникальный id
  const lastScan = scanHistory[0];

  useEffect(() => {
    // if (!lastScan) return;
    setToken(emptyCodeValue);
    setResult(null);
    getOrders(emptyCodeValue);
  }, [emptyCodeValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const orders = currentData?.orders ?? [];
  const client = currentData?.user;
  const readyCount = orders.filter((o) => Number(o?.status) === READY_STATUS).length;

  const handleIssue = async () => {
    if (!token) return;

    try {
      const res = await issueByToken(token).unwrap();

      if (!res?.success) {
        setResult({
          type: "error",
          text: `${res?.message || "Ошибка выдачи заказа"}. Сгенерируйте новый токен.`
        });

        return;
      }

      setResult({
        type: "success",
        text: res?.message || "Заказ успешно выдан"
      });

      await getOrders(token).unwrap().catch(() => { });

    } catch (e) {
      console.error("ISSUE ERROR:", e);

      const message =
        e?.data?.message ||
        e?.error ||
        "Ошибка выдачи заказа";

      setResult({
        type: "error",
        text: `${message}. Сгенерируйте новый токен.`
      });
    }
  };

  const handleReset = () => {
    setToken("");
    setResult(null);
    clearLog();
  };

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
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
          <Tag color="success">Сканер подключен</Tag>
          <Button size="small" onClick={() => disconnectScanner()}>
            Отключить
          </Button>
        </Space>
      )}

      {errorText && <Alert showIcon type="error" message={errorText} />}

      <Card
        title="Заказы клиента"
        extra={token && <Button onClick={handleReset}>Сбросить</Button>}
      >
        {!token && (
          <Alert
            type="info"
            showIcon
            message="Отсканируйте QR-код клиента"
          />
        )}

        {token && (
          <>
            {client && (
              <Space direction="vertical" size={2} style={{ marginBottom: 16 }}>
                <Text strong>Код клиента: {client.client_code}</Text>
                <Text>
                  {client.last_name} {client.first_name}
                </Text>
              </Space>
            )}

            {error && (
              <Alert
                showIcon
                type="error"
                message={error?.data?.message || "Ошибка загрузки заказов"}
              />
            )}

            {!error && !isFetching && !orders.length && (
              <Alert type="warning" showIcon message="Заказы не найдены" />
            )}

            <List
              loading={isFetching}
              dataSource={orders}
              renderItem={(item) => (
                <List.Item>
                  <Space
                    style={{ width: "100%", justifyContent: "space-between" }}
                    align="start"
                  >
                    <Space direction="vertical" size={2}>
                      <Text strong>{item.tracking_number}</Text>
                      <Text type="secondary">
                        {new Date(item.created_date).toLocaleString("ru-RU")}
                      </Text>
                    </Space>
                    {Number(item.status) === READY_STATUS ? (
                      <Tag color="success">Готов к выдаче</Tag>
                    ) : (
                      <Tag>Статус: {item.status}</Tag>
                    )}
                  </Space>
                </List.Item>
              )}
            />
          </>
        )}
      </Card>

      {token && (
        <Button
          type="primary"
          size="large"
          block
          loading={isIssuing}
          disabled={!readyCount || isFetching}
          onClick={handleIssue}
        >
          Выдать{readyCount ? ` (${readyCount})` : ""}
        </Button>
      )}

      {result && (
        <Alert showIcon type={result.type} message={result.text} />
      )}
    </Space>
  );
}

export default DeskWorkspace;