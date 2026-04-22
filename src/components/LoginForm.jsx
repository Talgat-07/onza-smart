import { Alert, Button, Card, Checkbox, Form, Input, Space, Typography } from "antd";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "../store/api/authApi";
import { addAuth } from "../store/slices/authSlice";

const { Text, Title } = Typography;

function LoginForm() {
  const dispatch = useDispatch();
  const [loginError, setLoginError] = useState("");
  const [loginRequest, { isLoading }] = useLoginMutation();

  const onFinish = async (values) => {
    setLoginError("");

    try {
      const result = await loginRequest(values).unwrap();

      if (result?.success === false) {
        setLoginError(result?.message ?? "Ошибка входа");
        return;
      }

      const token =
        result?.token ??
        result?.accessToken ??
        result?.data?.token ??
        result?.data?.access_token ??
        null;

      if (!token) {
        setLoginError(result?.message ?? "Сервер не вернул токен.");
        return;
      }

      const userFromApi = result?.user ?? result?.data?.user ?? null;
      const payload = {
        token,
        user: userFromApi ?? {
          id: result?.user_guid ?? result?.guid ?? values.login,
          name: result?.name ?? values.login,
          login: values.login,
          role: result?.role ?? result?.user_role ?? "desk",
          deskId: result?.desk_id ?? result?.point_guid ?? null,
          clientCode: result?.client_code ?? null,
        },
      };

      dispatch(addAuth(payload));
      localStorage.setItem("token", JSON.stringify(result));
    } catch (error) {
      setLoginError(error?.data?.message ?? "Ошибка входа");
    }
  };

  return (
    <div className="auth-layout">
      <Card className="auth-card">
        <Space direction="vertical" size={16} className="full-width">
          <div>
            <Title level={3}>Авторизация</Title>
            <Text type="secondary">
              Войдите, чтобы продолжить
            </Text>
          </div>

          {loginError ? <Alert type="error" showIcon message={loginError} /> : null}

          <Form layout="vertical" onFinish={onFinish}>
            <Form.Item
              label="Логин"
              name="login"
              rules={[{ required: true, message: "Введите логин" }]}
            >
              <Input placeholder="Введите логин" autoComplete="username" />
            </Form.Item>

            <Form.Item
              label="Пароль"
              name="password"
              rules={[{ required: true, message: "Введите пароль" }]}
            >
              <Input.Password
                placeholder="Введите пароль"
                autoComplete="current-password"
              />
            </Form.Item>

            <Form.Item name="remember" valuePropName="checked" initialValue>
              <Checkbox>Запомнить меня</Checkbox>
            </Form.Item>

            <Button type="primary" htmlType="submit" block loading={isLoading}>
              Войти
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}

export default LoginForm;
