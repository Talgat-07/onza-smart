import { DisconnectOutlined, LinkOutlined } from "@ant-design/icons";
import { Button, Card, InputNumber, Space, Tag, Typography } from "antd";

const { Text } = Typography;

const MIN_BAUD_RATE = 300;
const MAX_BAUD_RATE = 256000;
const BAUD_RATE_STEP = 300;
const DEFAULT_BAUD_RATE = 9600;

function ScannerControlCard({
  isConnected,
  isConnecting,
  baudRate,
  onBaudRateChange,
  onConnect,
  onDisconnect,
  onClear,
}) {
  return (
    <Card title="Управление сканером">
      <Space direction="vertical" size={16} className="full-width">
        <Space size={8} wrap>
          <Text strong>Статус:</Text>
          {isConnected ? <Tag color="success">Подключен</Tag> : <Tag>Не подключен</Tag>}
        </Space>

        <Space size={8} wrap>
          <Text>Baud Rate:</Text>
          <InputNumber
            min={MIN_BAUD_RATE}
            max={MAX_BAUD_RATE}
            step={BAUD_RATE_STEP}
            value={baudRate}
            disabled={isConnected}
            onChange={(value) => onBaudRateChange(value ?? DEFAULT_BAUD_RATE)}
          />
        </Space>

        <Space wrap>
          <Button
            type="primary"
            icon={<LinkOutlined />}
            onClick={onConnect}
            loading={isConnecting}
            disabled={isConnected}
          >
            Подключить
          </Button>

          <Button
            danger
            icon={<DisconnectOutlined />}
            onClick={() => void onDisconnect()}
            disabled={!isConnected}
          >
            Отключить
          </Button>

          <Button onClick={onClear}>Очистить журнал</Button>
        </Space>
      </Space>
    </Card>
  );
}

export default ScannerControlCard;
