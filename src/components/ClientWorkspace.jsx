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

import voice_1_1 from "../assets/voice/voice_1_1.mp3";
import voice_2_1 from "../assets/voice/voice_2_1.mp3";
import voice_3_1 from "../assets/voice/voice_3_1.mp3";

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
  const pendingAudioResultRef = useRef(false);

  const audioQueue = useRef([]);
  const isPlaying = useRef(false);

  const playSound = (src) => {
    audioQueue.current.push(src);
    processQueue();
  };

  const processQueue = () => {
    if (isPlaying.current || audioQueue.current.length === 0) return;

    isPlaying.current = true;
    const src = audioQueue.current.shift();
    const audio = new Audio(src);

    audio.onended = () => {
      isPlaying.current = false;
      processQueue();
    };

    audio.onerror = () => {
      console.warn("Ошибка воспроизведения звука:", src);
      isPlaying.current = false;
      processQueue();
    };

    audio.play().catch((err) => {
      console.error("Audio playback failed:", err);
      isPlaying.current = false;
      processQueue();
    });
  };

  const issueOrders = issueOrdersData?.orders ?? [];
  const pickupReadyOrders = issueOrders.filter(
    (order) => Number(order?.status) === 29,
  );

  const getSelectionKey = (selection) =>
    [...(selection || [])].map(String).sort().join("|");

  const handleSendRequest = async (currentCode) => {
    setRequestMessage("");
    try {
      const result = await sendRequest(currentCode).unwrap();
      setRequestMessage(result.message);
    } catch (error) {
      setRequestMessage(error?.data?.message ?? "Ошибка отправки заявки.");
    }
  };

  useEffect(() => {
    const selectionKey = getSelectionKey(lastCode);

    if (
      !selectionKey ||
      selectionKey === emptyCodeValue ||
      selectionKey === lastSubmittedSelectionRef.current
    ) {
      return;
    }

    lastSubmittedSelectionRef.current = selectionKey;

    playSound(voice_1_1);

    pendingAudioResultRef.current = true;

    handleSendRequest(lastCode);
  }, [lastCode, emptyCodeValue]);

  useEffect(() => {
    if (pendingAudioResultRef.current && !isIssueOrdersLoading) {
      if (issueOrdersError) {
        pendingAudioResultRef.current = false;
        playSound(voice_3_1);
      } else if (issueOrdersData) {
        pendingAudioResultRef.current = false;

        if (pickupReadyOrders.length > 0) {
          playSound(voice_2_1);
        } else {
          playSound(voice_3_1);
        }
      }
    }
  }, [
    isIssueOrdersLoading,
    issueOrdersData,
    issueOrdersError,
    pickupReadyOrders.length,
  ]);

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
