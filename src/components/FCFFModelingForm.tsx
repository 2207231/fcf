'use client';

import { useState } from 'react';
import { Form, Input, Button, Card, InputNumber, Space, Typography, Table } from 'antd';
import type { ParseResult } from '@/lib/types';
import FCFFCharts from './FCFFCharts';
import SensitivityAnalysis from './SensitivityAnalysis';
import AdvancedCharts from './AdvancedCharts';

const { Title, Text } = Typography;

interface FCFFModelingFormProps {
  parseResult: ParseResult;
  onComplete: (modelingResult: any) => void;
}

interface FCFFInputs {
  revenueGrowthRate: number;
  ebitMargin: number;
  taxRate: number;
  depreciationRate: number;
  capexRate: number;
  nwcRate: number;
  projectionYears: number;
}

const calculateFCFF = (historicalData: any, inputs: FCFFInputs) => {
  const projections = [];
  const baseYear = historicalData.revenue || 1000; // 使用历史收入或默认值

  for (let year = 1; year <= inputs.projectionYears; year++) {
    const revenue = baseYear * Math.pow(1 + inputs.revenueGrowthRate / 100, year);
    const ebit = revenue * (inputs.ebitMargin / 100);
    const tax = ebit * (inputs.taxRate / 100);
    const nopat = ebit - tax;
    const depreciation = revenue * (inputs.depreciationRate / 100);
    const capex = revenue * (inputs.capexRate / 100);
    const nwcChange = revenue * (inputs.nwcRate / 100);
    const fcff = nopat + depreciation - capex - nwcChange;

    projections.push({
      year: `第${year}年`,
      revenue: Math.round(revenue),
      ebit: Math.round(ebit),
      nopat: Math.round(nopat),
      depreciation: Math.round(depreciation),
      capex: Math.round(capex),
      nwcChange: Math.round(nwcChange),
      fcff: Math.round(fcff),
    });
  }

  return projections;
};

const FCFFModelingForm: React.FC<FCFFModelingFormProps> = ({ parseResult, onComplete }) => {
  const [form] = Form.useForm();
  const [projections, setProjections] = useState<any[]>([]);
  const [currentInputs, setCurrentInputs] = useState<FCFFInputs | null>(null);

  const handleCalculate = (values: FCFFInputs) => {
    setCurrentInputs(values);
    const results = calculateFCFF(parseResult.data, values);
    setProjections(results);
    onComplete(results);
  };

  const handleSensitivityChange = (param: string, value: number) => {
    if (!currentInputs) return;

    const paramMapping: { [key: string]: keyof FCFFInputs } = {
      '收入增长率': 'revenueGrowthRate',
      'EBIT利润率': 'ebitMargin',
      '资本支出率': 'capexRate',
    };

    const key = paramMapping[param];
    if (key) {
      form.setFieldValue(key, value);
      const newValues = { ...currentInputs, [key]: value };
      handleCalculate(newValues);
    }
  };

  const columns = [
    { title: '预测期', dataIndex: 'year', key: 'year' },
    { title: '收入', dataIndex: 'revenue', key: 'revenue' },
    { title: 'EBIT', dataIndex: 'ebit', key: 'ebit' },
    { title: 'NOPAT', dataIndex: 'nopat', key: 'nopat' },
    { title: '折旧', dataIndex: 'depreciation', key: 'depreciation' },
    { title: '资本支出', dataIndex: 'capex', key: 'capex' },
    { title: '营运资金变动', dataIndex: 'nwcChange', key: 'nwcChange' },
    { title: 'FCFF', dataIndex: 'fcff', key: 'fcff' },
  ];

  return (
    <div className="space-y-8">
      <Card title="FCFF建模参数">
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCalculate}
          initialValues={{
            revenueGrowthRate: 5,
            ebitMargin: 20,
            taxRate: 25,
            depreciationRate: 5,
            capexRate: 7,
            nwcRate: 2,
            projectionYears: 5,
          }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item
              label="收入增长率 (%)"
              name="revenueGrowthRate"
              rules={[{ required: true }]}
            >
              <InputNumber min={-100} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="EBIT利润率 (%)"
              name="ebitMargin"
              rules={[{ required: true }]}
            >
              <InputNumber min={-100} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="税率 (%)"
              name="taxRate"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="折旧率 (%)"
              name="depreciationRate"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="资本支出率 (%)"
              name="capexRate"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="营运资金变动率 (%)"
              name="nwcRate"
              rules={[{ required: true }]}
            >
              <InputNumber min={-100} max={100} step={0.1} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="预测年数"
              name="projectionYears"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={10} step={1} style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              计算FCFF
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {projections.length > 0 && currentInputs && (
        <>
          <FCFFCharts projections={projections} />
          
          <SensitivityAnalysis
            baseInputs={currentInputs}
            baseResult={projections[projections.length - 1].fcff}
            onParameterChange={handleSensitivityChange}
          />

          <AdvancedCharts
            historicalData={parseResult}
            projections={projections}
          />

          <Card title="FCFF预测明细">
            <Table
              columns={columns}
              dataSource={projections}
              scroll={{ x: true }}
              pagination={false}
            />
          </Card>
        </>
      )}
    </div>
  );
};

export default FCFFModelingForm;
