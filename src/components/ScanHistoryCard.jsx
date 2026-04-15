import { Card, Empty, List, Space, Typography } from "antd";

const { Text } = Typography;

function ScanHistoryCard({ scanHistory }) {
  return (
    <Card
      title="История сканирований"
      extra={<Text type="secondary">Новые коды отображаются сверху</Text>}
    >
      {scanHistory.length ? (
        <List
          rowKey="id"
          dataSource={scanHistory}
          renderItem={(item) => (
            <List.Item>
              <Space direction="vertical" size={0}>
                <Text code>{item.value}</Text>
                <Text type="secondary">{item.dateTime}</Text>
              </Space>
            </List.Item>
          )}
        />
      ) : (
        <Empty description="Пока нет считанных QR-кодов" />
      )}
    </Card>
  );
}

export default ScanHistoryCard;
