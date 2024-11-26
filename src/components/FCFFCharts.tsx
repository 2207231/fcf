'use client';

import React from 'react';
import { Card, Row, Col } from 'antd';
import { Line, Column } from '@ant-design/plots';

interface FCFFChartsProps {
  projections: any[];
}

const FCFFCharts: React.FC<FCFFChartsProps> = ({ projections }) => {
  // 准备图表数据
  const prepareLineData = () => {
    const metrics = ['revenue', 'ebit', 'fcff'];
    const data: any[] = [];

    projections.forEach((proj) => {
      metrics.forEach((metric) => {
        data.push({
          year: proj.year,
          value: proj[metric],
          metric: metric === 'revenue' ? '收入' :
                 metric === 'ebit' ? 'EBIT' : 'FCFF',
        });
      });
    });

    return data;
  };

  const prepareColumnData = () => {
    return projections.map((proj) => ({
      year: proj.year,
      value: proj.fcff,
    }));
  };

  // 趋势线图配置
  const lineConfig = {
    data: prepareLineData(),
    xField: 'year',
    yField: 'value',
    seriesField: 'metric',
    smooth: true,
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1500,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: datum.metric, value: datum.value.toLocaleString() };
      },
    },
    legend: {
      position: 'top',
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${(parseFloat(v) / 1000000).toFixed(1)}M`,
      },
    },
  };

  // 柱状图配置
  const columnConfig = {
    data: prepareColumnData(),
    xField: 'year',
    yField: 'value',
    label: {
      position: 'top',
      formatter: (v: any) => `${(v.value / 1000000).toFixed(1)}M`,
    },
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1500,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return { name: 'FCFF', value: datum.value.toLocaleString() };
      },
    },
    color: '#1890ff',
  };

  return (
    <div className="space-y-6">
      <Card title="关键指标趋势">
        <div style={{ height: 400 }}>
          <Line {...lineConfig} />
        </div>
      </Card>

      <Card title="自由现金流预测">
        <div style={{ height: 400 }}>
          <Column {...columnConfig} />
        </div>
      </Card>
    </div>
  );
};

export default FCFFCharts;
