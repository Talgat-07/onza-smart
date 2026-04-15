import { Card, Input } from "antd";

const { TextArea } = Input;

function RawStreamCard({ rawLog }) {
  return (
    <Card title="Сырой поток от сканера">
      <TextArea
        value={rawLog}
        readOnly
        autoSize={{ minRows: 6, maxRows: 10 }}
        placeholder="Поток данных появится после первого сканирования"
      />
    </Card>
  );
}

export default RawStreamCard;
