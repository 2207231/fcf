'use client';

import React from 'react';
import { Card, Tabs } from 'antd';
import { Line, Waterfall, DualAxes } from '@ant-design/plots';
import type { ParseResult } from '@/lib/types';

interface AdvancedChartsProps {
  historicalData: ParseResult;
  projections: any[];
}

const AdvancedCharts: React.FC<AdvancedChartsProps> = ({
  historicalData,
  projections,
}) => {
  // 准备历史数据和预测数据的对比
  const prepareComparisonData = () => {
    const historical = historicalData.data || {};
    const historicalYears = Object.keys(historical).sort();
    
    const historicalData: any[] = [];
    const metrics = ['revenue', 'ebit', 'fcff'];
    
    historicalYears.forEach(year => {
      metrics.forEach(metric => {
        historicalData.push({
          year,
          value: historical[year]?.[metric] || 0,
          metric: metric === 'revenue' ? '收入' :
                 metric === 'ebit' ? 'EBIT' : 'FCFF',
          type: '历史',
        });
      });
    });

    const projectionData = projections.flatMap(proj => 
      metrics.map(metric => ({
        year: proj.year,
        value: proj[metric],
        metric: metric === 'revenue' ? '收入' :
               metric === 'ebit' ? 'EBIT' : 'FCFF',
        type: '预测',
      }))
    );

    return [...historicalData, ...projectionData];
  };

  // 准备瀑布图数据
  const prepareWaterfallData = () => {
    if (projections.length === 0) return [];
    
    const lastYear = projections[projections.length - 1];
    return [
      { item: '税前利润(EBIT)', value: lastYear.ebit },
      { item: '税费', value: -(lastYear.ebit - lastYear.nopat) },
      { item: '折旧', value: lastYear.depreciation },
      { item: '资本支出', value: -lastYear.capex },
      { item: '营运资金变动', value: -lastYear.nwcChange },
      { item: 'FCFF', value: lastYear.fcff, isTotal: true },
    ];
  };

  // 历史对比图配置
  const comparisonConfig = {
    data: prepareComparisonData(),
    xField: 'year',
    yField: 'value',
    seriesField: 'metric',
    groupField: 'type',
    smooth: true,
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1500,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return { 
          name: `${datum.metric} (${datum.type})`,
          value: datum.value.toLocaleString(),
        };
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
    point: {
      shape: 'circle',
      style: (datum: any) => ({
        r: datum.type === '历史' ? 4 : 3,
        fill: datum.type === '历史' ? '#fff' : undefined,
        stroke: datum.type === '历史' ? '#333' : undefined,
      }),
    },
  };

  // 瀑布图配置
  const waterfallConfig = {
    data: prepareWaterfallData(),
    xField: 'item',
    yField: 'value',
    risingFill: '#f6bd16',
    fallingFill: '#5b8ff9',
    total: {
      style: {
        fill: '#5AD8A6',
      },
    },
    animation: {
      appear: {
        animation: 'wave-in',
        duration: 1500,
      },
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${(parseFloat(v) / 1000000).toFixed(1)}M`,
      },
    },
    label: {
      style: {
        fontSize: 12,
      },
      formatter: (datum: any) => `${(datum.value / 1000000).toFixed(1)}M`,
    },
  };

  const items = [
    {
      key: 'comparison',
      label: '历史对比',
      children: (
        <div style={{ height: 400 }}>
          <Line {...comparisonConfig} />
        </div>
      ),
    },
    {
      key: 'waterfall',
      label: 'FCFF构成',
      children: (
        <div style={{ height: 400 }}>
          <Waterfall {...waterfallConfig} />
        </div>
      ),
    },
  ];

  return (
    <Card title="高级分析" className="mb-6">
      <Tabs items={items} />
    </Card>
  );
};

export default AdvancedCharts;
