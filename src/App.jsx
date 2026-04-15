import { Alert, Col, ConfigProvider, Layout, Row, Space, Typography } from "antd";
import "./App.css";
import LatestCodeCard from "./components/LatestCodeCard";
import RawStreamCard from "./components/RawStreamCard";
import ScannerControlCard from "./components/ScannerControlCard";
import ScanHistoryCard from "./components/ScanHistoryCard";
import { useSerialScanner } from "./hooks/useSerialScanner";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function App() {
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

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 12,
          colorPrimary: "#1677ff",
        },
      }}
    >
      <Layout className="app-layout">
        <Header className="app-header">
          <Title level={3} className="app-title">
            QR Scanner Console
          </Title>
          <Text className="app-subtitle">
            Подключение сканера через Web Serial API и сбор QR-кодов в журнал
          </Text>
        </Header>

        <Content className="app-content">
          <Space direction="vertical" size={16} className="full-width">
            <Alert
              type="info"
              showIcon
              message="Важно"
              description="Сканер должен работать в режиме Serial (COM). Для чтения QR-кодов обычно используется разделитель Enter/CRLF."
            />

            {errorText ? <Alert type="error" showIcon message={errorText} /> : null}

            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <ScannerControlCard
                  isConnected={isConnected}
                  isConnecting={isConnecting}
                  baudRate={baudRate}
                  onBaudRateChange={setBaudRate}
                  onConnect={connectScanner}
                  onDisconnect={disconnectScanner}
                  onClear={clearLog}
                />
              </Col>

              <Col xs={24} lg={12}>
                <LatestCodeCard
                  lastCode={lastCode}
                  totalCodes={totalCodes}
                  emptyCodeValue={emptyCodeValue}
                />
              </Col>

              <Col span={24}>
                <ScanHistoryCard scanHistory={scanHistory} />
              </Col>

              <Col span={24}>
                <RawStreamCard rawLog={rawLog} />
              </Col>
            </Row>
          </Space>
        </Content>
      </Layout>
    </ConfigProvider>
  );
}

export default App;
