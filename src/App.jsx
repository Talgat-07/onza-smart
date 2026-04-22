import {
  Button,
  ConfigProvider,
  Layout,
  Space,
  Typography,
} from "antd";
import "./App.css";
import { useDispatch, useSelector } from "react-redux";
import ClientWorkspace from "./components/ClientWorkspace";
import DeskWorkspace from "./components/DeskWorkspace";
import LoginForm from "./components/LoginForm";
import { logout } from "./store/slices/authSlice";

const { Header, Content } = Layout;
const { Title, Text } = Typography;

function App() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => Boolean(state.auth.token));
  const isDesk = user?.role === "desk";

  const onLogout = () => {
    dispatch(logout());
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          borderRadius: 12,
          colorPrimary: "#1677ff",
        },
      }}
    >
      {isAuthenticated ? (
        <Layout className={`app-layout ${isDesk ? "" : "client-layout"}`}>
          {isDesk ? (
            <Header className="app-header">
              <div>
                <Title level={3} className="app-title">
                  Smart Pickup Console
                </Title>
                <Text className="app-subtitle">
                  QR-получение посылок с разделением ролей клиент/выдача
                </Text>
              </div>
              <Space>
                <Text className="app-user-text">Роль: Выдача | {user?.name ?? "User"}</Text>
                <Button onClick={onLogout}>Выйти</Button>
              </Space>
            </Header>
          ) : null}

          <Content className={`app-content ${isDesk ? "" : "client-content"}`}>
            {isDesk ? <DeskWorkspace user={user} /> : <ClientWorkspace user={user} />}
          </Content>
        </Layout>
      ) : (
        <LoginForm />
      )}
    </ConfigProvider>
  );
}

export default App;
