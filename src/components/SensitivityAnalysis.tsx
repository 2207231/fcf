'use client';

import React, { useState } from 'react';
import { Card, Tabs, Select, Space, Typography } from 'antd';
import { Heatmap, Scatter } from '@ant-design/plots';
import type { FCFFInputs } from '@/lib/types';

const { Text } = Typography;
const { Option } = Select;

interface SensitivityAnalysisProps {
  baseInputs: FCFFInputs;
  baseResult: number;
  onParameterChange: (param: string, value: number) => void;
}

const SensitivityAnalysis: React.FC<SensitivityAnalysisProps> = ({
  baseInputs,
  baseResult,
  onParameterChange,
}) => {
  const [selectedParams, setSelectedParams] = useState<string[]>(['收入增长率', 'EBIT利润率']);

  // 定义所有可分析的参数
  const allParameters = [
    { name: '收入增长率', key: 'revenueGrowthRate', range: [-5, -2.5, 0, 2.5, 5] },
    { name: 'EBIT利润率', key: 'ebitMargin', range: [-4, -2, 0, 2, 4] },
    { name: '税率', key: 'taxRate', range: [-3, -1.5, 0, 1.5, 3] },
    { name: '折旧率', key: 'depreciationRate', range: [-2, -1, 0, 1, 2] },
    { name: '资本支出率', key: 'capexRate', range: [-3, -1.5, 0, 1.5, 3] },
    { name: '营运资金变动率', key: 'nwcRate', range: [-2, -1, 0, 1, 2] },
  ];

  // 生成热力图数据
  const generateHeatmapData = () => {
    const data: any[] = [];
    const parameters = allParameters.filter(p => selectedParams.includes(p.name));

    parameters.forEach(param => {
      param.range.forEach(change => {
        const value = baseInputs[param.key as keyof FCFFInputs] + change;
        const impact = ((value - baseInputs[param.key as keyof FCFFInputs]) / baseInputs[param.key as keyof FCFFInputs]) * 100;
        data.push({
          parameter: param.name,
          change: `${change >= 0 ? '+' : ''}${change}%`,
          impact: impact,
          value: value,
        });
      });
    });

    return data;
  };

  // 生成散点图数据
  const generateScatterData = () => {
    const data: any[] = [];
    const samples = 50;

    allParameters.forEach(param => {
      const baseValue = baseInputs[param.key as keyof FCFFInputs];
      const range = Math.max(...param.range) - Math.min(...param.range);

      for (let i = 0; i < samples; i++) {
        const change = (Math.random() - 0.5) * range;
        const value = baseValue + change;
        const impact = ((value - baseValue) / baseValue) * 100;
        data.push({
          parameter: param.name,
          value: value,
          impact: impact,
        });
      }
    });

    return data;
  };

  const heatmapConfig = {
    data: generateHeatmapData(),
    xField: 'change',
    yField: 'parameter',
    colorField: 'impact',
    color: ['#4575b4', '#91bfdb', '#e0f3f8', '#fee090', '#fc8d59', '#d73027'],
    legend: {
      position: 'right',
    },
    axis: {
      grid: {
        alignTick: false,
        line: {
          style: {
            lineDash: [4, 2],
          },
        },
      },
    },
    meta: {
      impact: {
        min: -50,
        max: 50,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.parameter,
          value: `变化: ${datum.change}\n影响: ${datum.impact.toFixed(2)}%`,
        };
      },
    },
    interactions: [
      {
        type: 'element-active',
      },
    ],
    onClick: (event: any, chart: any) => {
      const { data } = event.data;
      if (data) {
        onParameterChange(data.parameter, data.value);
      }
    },
  };

  const scatterConfig = {
    data: generateScatterData(),
    xField: 'value',
    yField: 'impact',
    colorField: 'parameter',
    size: 5,
    shape: 'circle',
    pointStyle: {
      fillOpacity: 0.8,
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.parameter,
          value: `参数值: ${datum.value.toFixed(2)}%\n影响: ${datum.impact.toFixed(2)}%`,
        };
      },
    },
  };

  const items = [
    {
      key: 'heatmap',
      label: '敏感性热力图',
      children: (
        <>
          <Space direction="vertical" style={{ width: '100%', marginBottom: 16 }}>
            <Text type="secondary">选择要分析的参数：</Text>
            <Select
              mode="multiple"
              style={{ width: '100%' }}
              value={selectedParams}
              onChange={setSelectedParams}
              placeholder="选择参数"
            >
              {allParameters.map(param => (
                <Option key={param.name} value={param.name}>
                  {param.name}
                </Option>
              ))}
            </Select>
          </Space>
          <div style={{ height: 300 }}>
            <Heatmap {...heatmapConfig} />
          </div>
        </>
      ),
    },
    {
      key: 'scatter',
      label: '参数影响散点图',
      children: (
        <div style={{ height: 400 }}>
          <Scatter {...scatterConfig} />
        </div>
      ),
    },
  ];

  return (
    <Card title="敏感性分析" className="mb-6">
      <Tabs items={items} />
    </Card>
  );
};

export default SensitivityAnalysis;
