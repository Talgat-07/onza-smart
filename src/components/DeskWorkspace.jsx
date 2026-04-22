import { Alert, Card, Input, List, Space, Tag, Typography } from "antd";
import { useState } from "react";
import { useGetDeskRequestsQuery, useIssueOrderMutation } from "../store/api/ordersApi";

const { Paragraph, Text, Title } = Typography;

function DeskWorkspace({ user }) {
  const [qrTokenInput, setQrTokenInput] = useState(
    "35467153a6942af72c36485f6a09ef1b8fe06761eaeaccb8db97ca04f5e6d8bf",
  );
  const [issueMessage, setIssueMessage] = useState("");
  const { data = [], isLoading } = useGetDeskRequestsQuery(
    { deskId: user.deskId },
    { pollingInterval: 5000 },
  );
  const [issueOrder, { isLoading: isIssuing }] = useIssueOrderMutation();

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

  return (
    <Space direction="vertical" size={16} className="full-width">
      <Card>
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
      </Card>

      <Card title="Входящие заявки от клиентов">
        {!data.length && !isLoading ? (
          <Alert type="info" showIcon message="Новых заявок пока нет." />
        ) : (
          <List
            loading={isLoading}
            dataSource={data}
            renderItem={(item) => (
              <List.Item>
                <Space direction="vertical" size={2}>
                  <Text strong>
                    {item.clientName} ({item.clientCode})
                  </Text>
                  <Text type="secondary">Время: {item.createdAt}</Text>
                  <Text>К выдаче: {item.parcelIds.join(", ")}</Text>
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>
    </Space>
  );
}

export default DeskWorkspace;
