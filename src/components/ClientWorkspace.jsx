import {
  Alert,
  Button,
  Card,
  List,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";
import {
  useCreatePickupRequestMutation,
  useLazyGetIssueOrdersQuery,
} from "../store/api/ordersApi";
import ScannerControlCard from "../components/ScannerControlCard";
import { useSerialScanner } from "./../hooks/useSerialScanner";
import LatestCodeCard from "../components/LatestCodeCard";

const { Text, Title } = Typography;

function ClientWorkspace() {
  const {
    baudRate,
    isConnected,
    isConnecting,
    lastCode,
    setBaudRate,
    connectScanner,
    disconnectScanner,
    clearLog,
    totalCodes,
    emptyCodeValue,
  } = useSerialScanner();

  const [requestMessage, setRequestMessage] = useState("");

  // 🔥 lazy query (ручной контроль)
  const [
    getIssueOrders,
    { data: issueOrdersData, isLoading, error },
  ] = useLazyGetIssueOrdersQuery();

  const [sendRequest, { isLoading: isSending }] =
    useCreatePickupRequestMutation();

  const issueOrders = issueOrdersData?.orders ?? [];
  const pickupReadyOrders = issueOrders.filter(
    (o) => Number(o?.status) === 29
  );

  // -------------------------------
  // 🔒 Защита от дублей
  // -------------------------------
  const lastProcessedCodeRef = useRef("");
  const isProcessingRef = useRef(false);

  // -------------------------------
  // ⏱ Debounce
  // -------------------------------
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!lastCode || lastCode === emptyCodeValue) return;

    // если уже обрабатывали этот код → стоп
    if (lastProcessedCodeRef.current === lastCode) return;

    // debounce (если сканер дергается)
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      processCode(lastCode);
    }, 1500); // можешь менять (1–2 сек)

    return () => clearTimeout(debounceTimerRef.current);
  }, [lastCode]);

  // -------------------------------
  // 🔥 Основная логика
  // -------------------------------
  const processCode = async (code) => {
    if (isProcessingRef.current) return;

    isProcessingRef.current = true;
    lastProcessedCodeRef.current = code;
    setRequestMessage("");

    try {
      // 1. отправка заявки
      const res = await sendRequest(code).unwrap();
      setRequestMessage(res.message);

      // 2. получение заказов
      await getIssueOrders(code);

      // 3. авто-обновление через 5 сек
      setTimeout(() => {
        getIssueOrders(code);
      }, 5000);
    } catch (e) {
      setRequestMessage(
        e?.data?.message || "Ошибка обработки запроса"
      );
    } finally {
      isProcessingRef.current = false;
    }
  };

  return (
    <Space direction="vertical" size={16} className="full-width">
      {!isConnected && (
        <ScannerControlCard
          isConnected={isConnected}
          isConnecting={isConnecting}
          baudRate={baudRate}
          onBaudRateChange={setBaudRate}
          onConnect={connectScanner}
          onDisconnect={disconnectScanner}
          onClear={clearLog}
        />
      )}

      <LatestCodeCard
        lastCode={lastCode}
        totalCodes={totalCodes}
        emptyCodeValue={emptyCodeValue}
      />

      {/* ------------------- */}
      {/* ЗАЯВКА */}
      {/* ------------------- */}
      {requestMessage && (
        <Alert showIcon type="success" message={requestMessage} />
      )}

      {/* ------------------- */}
      {/* ЗАКАЗЫ */}
      {/* ------------------- */}
      <Card className="client-card">
        <Title level={4}>Заказы</Title>

        {error && (
          <Alert
            showIcon
            type="error"
            message="Ошибка загрузки заказов"
          />
        )}

        {!error && !pickupReadyOrders.length && !isLoading && (
          <Alert
            showIcon
            type="info"
            message="Нет заказов к выдаче"
          />
        )}

        <List
          loading={isLoading}
          dataSource={pickupReadyOrders}
          renderItem={(order) => (
            <List.Item>
              <Card size="small" style={{ width: "100%" }}>
                <Space direction="vertical">
                  <Text strong>{order.tracking_number}</Text>
                  <Text type="secondary">{order.guid}</Text>
                  <Space>
                    <Tag color="green">Готов</Tag>
                    <Text type="secondary">
                      {new Date(
                        order.created_date
                      ).toLocaleString("ru-RU")}
                    </Text>
                  </Space>
                </Space>
              </Card>
            </List.Item>
          )}
        />
      </Card>
    </Space>
  );
}

export default ClientWorkspace;