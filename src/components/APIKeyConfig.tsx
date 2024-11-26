import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Card } from 'antd';
import { KeyOutlined } from '@ant-design/icons';

interface APIKeyConfigProps {
  onSave: (apiKey: string) => void;
}

const APIKeyConfig: React.FC<APIKeyConfigProps> = ({ onSave }) => {
  const [form] = Form.useForm();
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    // 从 localStorage 加载已保存的 API key
    const savedApiKey = localStorage.getItem('claude_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
      form.setFieldsValue({ apiKey: savedApiKey });
    }
  }, [form]);

  const handleSubmit = async (values: { apiKey: string }) => {
    try {
      // 保存到 localStorage
      localStorage.setItem('claude_api_key', values.apiKey);
      setApiKey(values.apiKey);
      onSave(values.apiKey);
      message.success('API Key 已保存');
    } catch (error) {
      message.error('保存 API Key 失败');
    }
  };

  return (
    <Card title="Claude API 配置" className="mb-4">
      <Form
        form={form}
        onFinish={handleSubmit}
        layout="vertical"
        initialValues={{ apiKey }}
      >
        <Form.Item
          name="apiKey"
          label="API Key"
          rules={[{ required: true, message: '请输入 Claude API Key' }]}
        >
          <Input.Password
            prefix={<KeyOutlined />}
            placeholder="请输入您的 Claude API Key"
          />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            保存
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default APIKeyConfig;
