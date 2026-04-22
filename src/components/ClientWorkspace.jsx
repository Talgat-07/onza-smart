import { Alert, Button, Card, Checkbox, Space, Typography } from "antd";
import { useState } from "react";
import {
  useCreatePickupRequestMutation,
  useScanClientQrMutation,
} from "../store/api/ordersApi";
import { useSerialScanner } from "./../hooks/useSerialScanner";
import ScannerControlCard from "../components/ScannerControlCard";

const { Paragraph, Text, Title } = Typography;

function ClientWorkspace({ user }) {
  const [selectedParcels, setSelectedParcels] = useState([]);
  const [greetingText, setGreetingText] = useState("");
  const [scanError, setScanError] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [parcels, setParcels] = useState([]);

  const [scanQr, { isLoading: isScanning }] = useScanClientQrMutation();
  const [sendRequest, { isLoading: isSending }] =
    useCreatePickupRequestMutation();

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
      <ScannerControlCard
        isConnected={isConnected}
        isConnecting={isConnecting}
        baudRate={baudRate}
        onBaudRateChange={setBaudRate}
        onConnect={connectScanner}
        onDisconnect={disconnectScanner}
        onClear={clearLog}
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
