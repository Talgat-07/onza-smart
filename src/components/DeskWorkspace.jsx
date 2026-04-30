import { Alert, Button, Card, Input, List, Space, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { useGetDeskRequestsQuery, useGetIssueOrdersQuery, useScanClientQrMutation } from "../store/api/ordersApi";

const { Paragraph, Text, Title } = Typography;

function DeskWorkspace({ user }) {
  const [qrTokenInput, setQrTokenInput] = useState(
  );
  const [scanQr, { isLoading: isScanning }] = useScanClientQrMutation();
  const [issueMessage, setIssueMessage] = useState("");
  const [issueStatus, setIssueStatus] = useState(""); // success | error
  const { data: deskRequestsData, isLoading } = useGetDeskRequestsQuery(
    { deskId: user.deskId },
    { pollingInterval: 5000 },
  );
  const {
    data: issueOrdersData,
    isLoading: isIssuing,
    error: issueOrdersError,
    refetch
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
    if (!qrTokenInput) {
      setIssueStatus("error");
      setIssueMessage("Нет QR токена");
      return;
    }

    try {
      const result = await scanQr(qrTokenInput).unwrap();

      setIssueStatus("success");
      setIssueMessage(result?.message || "Заказ успешно выдан");

      await refetch();

    } catch (error) {
      setIssueStatus("error");
      setIssueMessage(error?.data?.message || "Ошибка выдачи");
    }
  };

  useEffect(() => {
    if (deskRequestsData?.success) {
      setQrTokenInput(deskRequestsData.result?.qr_token);
      setIssueMessage(null)
    }
  }, [deskRequestsData]);

  return (
    <Space direction="vertical" size={16} className="full-width">

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
                </Space>
              </List.Item>
            )}
          />
        )}
      </Card>
      <Button onClick={() => {
        handleScan();
      }}>Выдать</Button>
      {issueMessage && (
        <Alert
          showIcon
          type={issueStatus === "success" ? "success" : "error"}
          message={issueMessage}
          style={{ marginTop: 12 }}
        />
      )}
    </Space>
  );
}

export default DeskWorkspace;
