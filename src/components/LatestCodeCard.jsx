import { QrcodeOutlined } from "@ant-design/icons";
import { Card, Space, Statistic, Typography } from "antd";

const { Paragraph } = Typography;

function LatestCodeCard({ lastCode, totalCodes, emptyCodeValue }) {
  return (
    <Card title="Последний QR-код">
      <Space direction="vertical" size={16} className="full-width">
        <Paragraph
          className="last-code"
          copyable={lastCode !== emptyCodeValue ? { text: lastCode } : false}
        >
          {lastCode}
        </Paragraph>

        <Statistic
          title="Всего получено"
          value={totalCodes}
          prefix={<QrcodeOutlined />}
        />
      </Space>
    </Card>
  );
}

export default LatestCodeCard;
