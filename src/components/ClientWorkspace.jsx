import {
  Alert,
  Button,
  Card,
  Checkbox,
  List,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useRef, useState } from "react";
import {
  useCreatePickupRequestMutation,
  useGetIssueOrdersQuery,
} from "../store/api/ordersApi";
import ScannerControlCard from "../components/ScannerControlCard";
import { useSerialScanner } from "./../hooks/useSerialScanner";
import LatestCodeCard from "../components/LatestCodeCard";
const { Paragraph, Text, Title } = Typography;

function ClientWorkspace({ user }) {
  const {
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
    totalCodes,
    emptyCodeValue,
  } = useSerialScanner();
  const [greetingText, setGreetingText] = useState("");
  const [scanError, setScanError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");

  const {
    data: issueOrdersData,
    isLoading: isIssueOrdersLoading,
    error: issueOrdersError,
  } = useGetIssueOrdersQuery(lastCode);
  const [sendRequest, { isLoading: isSending }] =
    useCreatePickupRequestMutation();
  const lastSubmittedSelectionRef = useRef("");
  const issueOrders = issueOrdersData?.orders ?? [];
  const pickupReadyOrders = issueOrders.filter(
    (order) => Number(order?.status) === 29,
  );

  const getSelectionKey = (selection) =>
    [...selection]
      .map(String)
      .sort()
      .join("|");

  const handleSendRequest = async () => {
    const selectionKey = getSelectionKey(lastCode);
    if (!selectionKey) {
      return;
    }

    lastSubmittedSelectionRef.current = selectionKey;
    setRequestMessage("");
    try {
      const result = await sendRequest(lastCode
      ).unwrap();
      setRequestMessage(result.message);
    } catch (error) {
      setRequestMessage(error?.data?.message ?? "Ошибка отправки заявки.");
    }
  };

  useEffect(() => {
    const selectionKey = getSelectionKey(lastCode);
    if (!selectionKey || selectionKey === lastSubmittedSelectionRef.current || isSending) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      handleSendRequest();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [isSending, lastCode]);

  useEffect(() => {
    handleSendRequest()
  }, [lastCode]);

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
      <Card className="client-card">
        <Title level={3}>Терминал клиента</Title>
        <Paragraph type="secondary">
          Ожидание сканирования QR клиента.
        </Paragraph>


        {scanError ? (
          <Alert
            showIcon
            type="error"
            message={scanError}
            style={{ marginTop: 16 }}
          />
        ) : null}
        {greetingText ? (
          <Alert
            showIcon
            type="success"
            message={greetingText}
            style={{ marginTop: 16 }}
          />
        ) : null}
      </Card>

      <Card className="client-card">
        <Title level={4}>Заказы:</Title>

        {issueOrdersError ? (
          <Alert
            showIcon
            type="error"
            message="Не удалось загрузить заказы по токену."
          />
        ) : null}

        {!issueOrdersError &&
          !pickupReadyOrders.length &&
          !isIssueOrdersLoading ? (
          <Alert
            showIcon
            type="info"
            message="Доступных заказов к выдаче нет."
          />
        ) : null}

        <List
          loading={isIssueOrdersLoading}
          dataSource={pickupReadyOrders}
          renderItem={(order) => (
            <List.Item>
              <Card
                size="small"
                className="parcel-row"
                style={{ width: "100%" }}
              >
                <Space direction="vertical" size={4}>
                  <Text strong>{order.tracking_number}</Text>
                  <Text type="secondary">GUID: {order.guid}</Text>
                  <Space>
                    <Tag color="green">Готов к выдаче</Tag>
                    <Text type="secondary">
                      {new Date(order.created_date).toLocaleString("ru-RU")}
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
