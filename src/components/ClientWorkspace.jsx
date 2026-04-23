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
import { useState } from "react";
import {
  useCreatePickupRequestMutation,
  useScanClientQrMutation,
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
  const [selectedParcels, setSelectedParcels] = useState([]);
  const [greetingText, setGreetingText] = useState("");
  const [scanError, setScanError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [parcels, setParcels] = useState([]);
  const {
    data: issueOrdersData,
    isLoading: isIssueOrdersLoading,
    error: issueOrdersError,
  } = useGetIssueOrdersQuery();
  const [scanQr, { isLoading: isScanning }] = useScanClientQrMutation();
  const [sendRequest, { isLoading: isSending }] =
    useCreatePickupRequestMutation();
  const issueOrders = issueOrdersData?.orders ?? [];
  const pickupReadyOrders = issueOrders.filter(
    (order) => Number(order?.status) === 29,
  );

  const handleScan = async () => {
    setScanError("");
    setGreetingText("");
    setRequestMessage("");
    setSelectedParcels([]);

    try {
      const result = await scanQr().unwrap();
      setGreetingText(result.greeting);
      setParcels(result.parcels);
    } catch (error) {
      setParcels([]);
      setScanError(error?.data?.message ?? "Не удалось обработать QR.");
    }
  };

  const handleSendRequest = async () => {
    setRequestMessage("");
    try {
      const result = await sendRequest({
        user,
        parcelIds: selectedParcels,
      }).unwrap();
      setRequestMessage(result.message);
    } catch (error) {
      setRequestMessage(error?.data?.message ?? "Ошибка отправки заявки.");
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
      <Card className="client-card">
        <Title level={3}>Терминал клиента</Title>
        <Paragraph type="secondary">
          Ожидание сканирования QR клиента.
        </Paragraph>
        {isScanning ? (
          <Alert
            showIcon
            type="info"
            message="Идет обработка QR..."
            style={{ marginTop: 16 }}
          />
        ) : null}

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
        <Title level={4}>Заказы, которые можно забрать</Title>

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

      <Card className="client-card">
        <Title level={4}>Доступные посылки</Title>

        {parcels.length ? (
          <Checkbox.Group
            style={{ width: "100%" }}
            value={selectedParcels}
            onChange={setSelectedParcels}
          >
            <Space direction="vertical" className="full-width">
              {parcels.map((parcel) => (
                <Card key={parcel.id} size="small" className="parcel-row">
                  <Checkbox value={parcel.id}>
                    <Text strong>{parcel.title}</Text>
                    <br />
                    <Text type="secondary">ID: {parcel.id}</Text>
                    <br />
                    <Text type="secondary">Адрес: {parcel.address}</Text>
                  </Checkbox>
                </Card>
              ))}
            </Space>
          </Checkbox.Group>
        ) : (
          <Alert
            type="info"
            showIcon
            message="Сначала отсканируйте QR клиента."
          />
        )}

        <Button
          type="primary"
          style={{ marginTop: 16 }}
          onClick={handleSendRequest}
          loading={isSending}
          disabled={!selectedParcels.length}
        >
          Отправить заявку на выдачу
        </Button>

        {requestMessage ? (
          <Alert
            showIcon
            type="success"
            message={requestMessage}
            style={{ marginTop: 16 }}
          />
        ) : null}
      </Card>
    </Space>
  );
}

export default ClientWorkspace;
