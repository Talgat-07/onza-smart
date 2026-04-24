import { Alert, Button, Card, List, Space, Tag, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import {
  useCreatePickupRequestMutation,
  useLazyGetIssueOrdersQuery,
} from "../store/api/ordersApi";
import ScannerControlCard from "../components/ScannerControlCard";
import { useSerialScanner } from "./../hooks/useSerialScanner";
import LatestCodeCard from "../components/LatestCodeCard";

import voice_1_1 from "../assets/voice/voice_1_1.mp3";
import voice_2_1 from "../assets/voice/voice_2_1.mp3";
import voice_3_1 from "../assets/voice/voice_3_1.mp3";
import { ScanOutlined, InboxOutlined } from "@ant-design/icons";

const { Paragraph, Text, Title } = Typography;

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
  } = useSerialScanner();

  const [requestMessage, setRequestMessage] = useState("");

  const [getIssueOrders, { data: issueOrdersData, isLoading, error }] =
    useLazyGetIssueOrdersQuery();

  const [sendRequest, { isLoading: isSending }] =
    useCreatePickupRequestMutation();

  const intervalRef = useRef(null);

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
  const pickupReadyOrders = issueOrders.filter((o) => Number(o?.status) === 29);

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
    if (!lastCode) return;

    if (lastProcessedCodeRef.current === lastCode) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      processCode(lastCode);
    }, 1500);

    return () => {
      clearTimeout(debounceTimerRef.current);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [lastCode]);

  const processCode = async (code) => {
    if (isProcessingRef.current) return;

    playSound(voice_1_1);
    isProcessingRef.current = true;
    lastProcessedCodeRef.current = code;
    setRequestMessage("");

    try {
      const res = await sendRequest(code).unwrap();
      setRequestMessage(res.message);

      const result = await getIssueOrders(code).unwrap();

      const orders = result?.orders ?? [];
      const ready = orders.filter((o) => Number(o?.status) === 29);

      playSound(ready.length > 0 ? voice_2_1 : voice_3_1);

      setTimeout(() => {
        getIssueOrders(code);
      }, 5000);
    } catch (e) {
      setRequestMessage(e?.data?.message || "Ошибка обработки запроса");
      playSound(voice_3_1);
    } finally {
      isProcessingRef.current = false;
    }
  };

  if (intervalRef.current) {
    clearInterval(intervalRef.current);
  }

  intervalRef.current = setInterval(() => {
    if (!isProcessingRef.current) {
      getIssueOrders(lastCode);
    }
  }, 120000);

  return (
    <div style={{ maxWidth: "768px", margin: "0 auto", padding: "24px 16px" }}>
      <Space direction="vertical" size={24} style={{ width: "100%" }}>
        {!isConnected && (
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.04)",
              overflow: "hidden",
            }}
          >
            <ScannerControlCard
              isConnected={isConnected}
              isConnecting={isConnecting}
              baudRate={baudRate}
              onBaudRateChange={setBaudRate}
              onConnect={connectScanner}
              onDisconnect={disconnectScanner}
              onClear={clearLog}
            />
          </div>
        )}

        <Card
          style={{
            background: "linear-gradient(145deg, #ffffff 0%, #f4f7fc 100%)",
            borderRadius: "24px",
            border: "1px solid #eef2f8",
            textAlign: "center",
            padding: "48px 24px",
            boxShadow: "0 12px 32px rgba(22, 119, 255, 0.05)",
          }}
        >
          <Space direction="vertical" size={24}>
            <div
              style={{
                background: "linear-gradient(135deg, #1677ff 0%, #4096ff 100%)",
                borderRadius: "50%",
                width: "96px",
                height: "96px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                margin: "0 auto",
                boxShadow: "0 8px 20px rgba(22, 119, 255, 0.25)",
              }}
            >
              <ScanOutlined style={{ fontSize: "48px", color: "#ffffff" }} />
            </div>

            <div>
              <Title
                level={2}
                style={{
                  margin: "0 0 12px 0",
                  color: "#1f2937",
                  fontWeight: 700,
                }}
              >
                Добро пожаловать
              </Title>
              <Text
                type="secondary"
                style={{ fontSize: "16px", lineHeight: "1.6" }}
              >
                Поднесите QR-код к сканеру, чтобы система <br />
                нашла ваши заказы и подготовила их к выдаче.
              </Text>
            </div>
          </Space>
        </Card>

        {requestMessage && (
          <Alert
            showIcon
            type="success"
            message={requestMessage}
            style={{
              borderRadius: "16px",
              border: "none",
              padding: "16px 20px",
              boxShadow: "0 4px 12px rgba(82, 196, 26, 0.1)",
            }}
          />
        )}

        <Card
          style={{
            borderRadius: "24px",
            border: "none",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.04)",
          }}
          bodyStyle={{ padding: "32px" }}
        >
          <div
            style={{
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
            }}
          >
            <InboxOutlined
              style={{
                fontSize: "28px",
                color: "#1677ff",
                marginRight: "12px",
              }}
            />
            <Title
              level={3}
              style={{ margin: 0, color: "#1f2937", fontWeight: 700 }}
            >
              Ваши заказы
            </Title>
          </div>

          {error && (
            <Alert
              showIcon
              type="error"
              message="Ошибка загрузки заказов"
              style={{ borderRadius: "12px", marginBottom: "20px" }}
            />
          )}

          {!error && !pickupReadyOrders.length && !isLoading && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                background: "#f8fafc",
                borderRadius: "16px",
              }}
            >
              <Text type="secondary" style={{ fontSize: "16px" }}>
                Нет заказов к выдаче
              </Text>
            </div>
          )}

          <List
            loading={isLoading}
            dataSource={pickupReadyOrders}
            locale={{ emptyText: <div /> }}
            renderItem={(order) => (
              <List.Item
                style={{ padding: 0, border: "none", marginBottom: "16px" }}
              >
                <div
                  style={{
                    width: "100%",
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "16px",
                    padding: "20px",
                    transition: "all 0.3s ease",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      flexWrap: "wrap",
                      gap: "12px",
                    }}
                  >
                    <Space direction="vertical" size={4}>
                      <Text
                        style={{
                          fontSize: "18px",
                          fontWeight: 700,
                          color: "#0f172a",
                        }}
                      >
                        {order.tracking_number}
                      </Text>
                      <Text
                        type="secondary"
                        style={{ fontSize: "14px", fontFamily: "monospace" }}
                      >
                        ID: {order.guid}
                      </Text>
                    </Space>

                    <div style={{ textAlign: "right" }}>
                      <Tag
                        color="success"
                        style={{
                          padding: "6px 14px",
                          borderRadius: "20px",
                          fontSize: "14px",
                          fontWeight: 600,
                          margin: "0 0 8px 0",
                          border: "none",
                          background: "#e6f4ea",
                          color: "#1e8e3e",
                        }}
                      >
                        Готов к выдаче
                      </Tag>
                      <br />
                      <Text type="secondary" style={{ fontSize: "13px" }}>
                        {new Date(order.created_date).toLocaleString("ru-RU", {
                          day: "2-digit",
                          month: "long",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </div>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </Card>
      </Space>
    </div>
  );
}

export default ClientWorkspace;
