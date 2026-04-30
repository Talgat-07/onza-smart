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
import { useEffect, useMemo, useState } from "react";
import {
  useGetDeskRequestsQuery,
  useGetIssueOrdersQuery,
  useScanClientQrMutation,
} from "../store/api/ordersApi";

const { Text, Title } = Typography;

function DeskWorkspace({ user }) {
  const [qrTokenInput, setQrTokenInput] = useState("");
  const [selectedOrders, setSelectedOrders] = useState([]);

  const [scanQr, { isLoading: isScanning }] =
    useScanClientQrMutation();

  const [issueMessage, setIssueMessage] =
    useState("");
  const [issueStatus, setIssueStatus] =
    useState("");

  /* -------------------- */
  /* Заявки клиентов */
  /* -------------------- */
  const {
    data: deskRequestsData,
    isLoading,
  } = useGetDeskRequestsQuery(
    { deskId: user.deskId },
    { pollingInterval: 5000 }
  );

  /* -------------------- */
  /* Заказы по QR */
  /* -------------------- */
  const {
    data: issueOrdersData,
    isLoading: isIssuing,
    refetch,
  } = useGetIssueOrdersQuery(qrTokenInput, {
    skip: !qrTokenInput,
  });

  const orders =
    issueOrdersData?.orders || [];

  /* -------------------- */
  /* Автозаполнение QR */
  /* -------------------- */
  useEffect(() => {
    if (deskRequestsData?.success) {
      setQrTokenInput(
        deskRequestsData.result?.qr_token
      );
      setIssueMessage("");
    }
  }, [deskRequestsData]);

  /* -------------------- */
  /* Выбрать все */
  /* -------------------- */
  useEffect(() => {
    if (orders.length) {
      setSelectedOrders(
        orders.map((x) => x.guid)
      );
    } else {
      setSelectedOrders([]);
    }
  }, [issueOrdersData]);

  /* -------------------- */
  /* Toggle */
  /* -------------------- */
  const toggleOrder = (guid) => {
    setSelectedOrders((prev) =>
      prev.includes(guid)
        ? prev.filter((x) => x !== guid)
        : [...prev, guid]
    );
  };

  /* -------------------- */
  /* Выдать */
  /* -------------------- */
  const handleScan = async () => {
    if (!qrTokenInput) {
      setIssueStatus("error");
      setIssueMessage("Нет QR токена");
      return;
    }

    if (!selectedOrders.length) {
      setIssueStatus("error");
      setIssueMessage(
        "Выберите хотя бы один заказ"
      );
      return;
    }

    try {
      const result = await scanQr({
        token: qrTokenInput,
        orders: selectedOrders,
        userGuid: user.id,
      }).unwrap();

      setIssueStatus("success");
      setIssueMessage(
        result?.message ||
        "Заказы успешно выданы"
      );

      setSelectedOrders([]);
      await refetch();
    } catch (error) {
      setIssueStatus("error");
      setIssueMessage(
        error?.data?.message ||
        "Ошибка выдачи"
      );
    }
  };

  return (
    <Space
      direction="vertical"
      size={16}
      className="full-width"
      style={{ width: "100%" }}
    >
      {/* ---------------- */}
      {/* ЗАКАЗЫ */}
      {/* ---------------- */}
      <Card
        title={`Заказы клиента (${orders.length})`}
      >
        {!orders.length &&
          !isIssuing ? (
          <Alert
            type="info"
            showIcon
            message="Нет заказов для выдачи"
          />
        ) : (
          <>
            <div
              style={{
                marginBottom: 12,
              }}
            >
              <Space>
                <Button
                  size="small"
                  onClick={() =>
                    setSelectedOrders(
                      orders.map(
                        (x) => x.guid
                      )
                    )
                  }
                >
                  Выбрать все
                </Button>

                <Button
                  size="small"
                  onClick={() =>
                    setSelectedOrders([])
                  }
                >
                  Очистить
                </Button>
              </Space>
            </div>

            <List
              loading={isIssuing}
              dataSource={orders}
              renderItem={(item) => {
                const checked =
                  selectedOrders.includes(
                    item.guid
                  );

                return (
                  <List.Item
                    onClick={() =>
                      toggleOrder(
                        item.guid
                      )
                    }
                    style={{
                      cursor:
                        "pointer",
                      background:
                        checked
                          ? "#f6ffed"
                          : "",
                      borderRadius: 8,
                      padding:
                        "10px 12px",
                      marginBottom: 8,
                    }}
                  >
                    <Space
                      align="start"
                    >
                      <Checkbox
                        checked={
                          checked
                        }
                      />

                      <Space
                        direction="vertical"
                        size={2}
                      >
                        <Text strong>
                          {
                            item.tracking_number
                          }
                        </Text>

                        <Text type="secondary">
                          {
                            item.country
                          }
                        </Text>

                        <Text type="secondary">
                          {
                            item.created_date
                          }
                        </Text>

                        <Tag color="green">
                          Готов
                        </Tag>
                      </Space>
                    </Space>
                  </List.Item>
                );
              }}
            />
          </>
        )}
      </Card>

      {/* ---------------- */}
      {/* КНОПКА */}
      {/* ---------------- */}
      <Button
        type="primary"
        size="large"
        loading={isScanning}
        onClick={handleScan}
      >
        Выдать выбранные (
        {selectedOrders.length})
      </Button>

      {/* ---------------- */}
      {/* РЕЗУЛЬТАТ */}
      {/* ---------------- */}
      {issueMessage && (
        <Alert
          showIcon
          type={
            issueStatus ===
              "success"
              ? "success"
              : "error"
          }
          message={issueMessage}
        />
      )}
    </Space>
  );
}

export default DeskWorkspace;