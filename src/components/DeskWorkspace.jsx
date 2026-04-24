import { Alert, Button, Card, Input, List, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useGetDeskRequestsQuery, useGetIssueOrdersQuery, useScanClientQrMutation } from "../store/api/ordersApi";

const { Paragraph, Text, Title } = Typography;

function DeskWorkspace({ user }) {
  const [qrTokenInput, setQrTokenInput] = useState(
  );
  const [scanQr, { isLoading: isScanning }] = useScanClientQrMutation();
  const [issueMessage, setIssueMessage] = useState("");
  const { data: deskRequestsData, isLoading } = useGetDeskRequestsQuery(
    { deskId: user.deskId },
    { pollingInterval: 5000 },
  );
  const {
    data: issueOrdersData,
    isLoading: isIssuing,
    error: issueOrdersError,
  } = useGetIssueOrdersQuery(qrTokenInput);

  const handleIssueByEnter = async () => {
    if (!qrTokenInput.trim()) {
      setIssueMessage("Введите QR токен.");
      return;
    }

    try {
      await issueOrder({ qrToken: qrTokenInput.trim(), userGuid: user.id }).unwrap();
      setIssueMessage("Заказ выдан успешно.");
      setQrTokenInput("");
    } catch (error) {
      setIssueMessage(error?.data?.message ?? "Не удалось выдать заказ.");
    }
  };

  const handleScan = async () => {
    try {
      const result = await scanQr(qrTokenInput).unwrap();
      setGreetingText(result.greeting);
      setParcels(result.parcels);
    } catch (error) {
      setParcels([]);
      setScanError(error?.data?.message ?? "Не удалось обработать QR.");
    }
  };

  useEffect(() => {
    if (deskRequestsData?.success) {
      setQrTokenInput(deskRequestsData.result?.qr_token);
    }
  }, [deskRequestsData]);

  return (
    <Space direction="vertical" size={16} className="full-width">
      {/* <Card>
        <Title level={4}>Панель точки выдачи</Title>
        <Paragraph type="secondary">
          Система показывает заявки только от привязанных клиентов вашей точки.
        </Paragraph>
        <Space>
          <Tag color="blue">Точка: {user.name}</Tag>
        </Space>
        <Input
          placeholder="Введите qr_token и нажмите Enter"
          value={qrTokenInput}
          onChange={(event) => setQrTokenInput(event.target.value)}
          onPressEnter={handleIssueByEnter}
          disabled={isIssuing}
          style={{ marginTop: 12 }}
        />
        {issueMessage ? (
          <Alert showIcon type="info" message={issueMessage} style={{ marginTop: 12 }} />
        ) : null}
      </Card> */}

      <Card title="Входящие заявки от клиентов">
        {!issueOrdersData?.orders?.length && !isLoading ? (
          <Alert type="info" showIcon message="Новых заявок пока нет." />
        ) : (
          <List
            loading={isLoading}
            dataSource={issueOrdersData?.orders}
            renderItem={(item) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Text strong>
                    {item.tracking_number}
                  </Text>
                  <Text type="secondary">Дата создания: {item.created_date}</Text>
                  {/* <Text>К выдаче: {item.tracking_number}</Text> */}
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>
      <Button onClick={() => {
        handleScan();
      }}>Выдать</Button>
    </Space>
  );
}

export default DeskWorkspace;
