'use client';

import React, { useMemo } from 'react';
import { Card, Slider, Space, Typography } from 'antd';
import { Area, Violin } from '@ant-design/plots';
import type { FCFFInputs, FCFFProjection } from '@/lib/types';

const { Text } = Typography;

interface MonteCarloSimulationProps {
  baseInputs: FCFFInputs;
  baseProjections: FCFFProjection[];
  iterations?: number;
}

const MonteCarloSimulation: React.FC<MonteCarloSimulationProps> = ({
  baseInputs,
  baseProjections,
  iterations = 1000,
}) => {
  // 生成随机变异的输入参数
  const generateRandomInputs = (base: FCFFInputs): FCFFInputs => {
    return {
      revenueGrowthRate: base.revenueGrowthRate + (Math.random() - 0.5) * 4,
      ebitMargin: base.ebitMargin + (Math.random() - 0.5) * 3,
      taxRate: base.taxRate + (Math.random() - 0.5) * 2,
      depreciationRate: base.depreciationRate + (Math.random() - 0.5) * 1,
      capexRate: base.capexRate + (Math.random() - 0.5) * 2,
      nwcRate: base.nwcRate + (Math.random() - 0.5) * 1,
      projectionYears: base.projectionYears,
    };
  };

  // 使用变异的输入参数计算FCFF
  const calculateFCFF = (inputs: FCFFInputs, baseYear: number): number[] => {
    const fcffs = [];
    let revenue = baseYear;

    for (let year = 1; year <= inputs.projectionYears; year++) {
      revenue *= (1 + inputs.revenueGrowthRate / 100);
      const ebit = revenue * (inputs.ebitMargin / 100);
      const tax = ebit * (inputs.taxRate / 100);
      const nopat = ebit - tax;
      const depreciation = revenue * (inputs.depreciationRate / 100);
      const capex = revenue * (inputs.capexRate / 100);
      const nwcChange = revenue * (inputs.nwcRate / 100);
      const fcff = nopat + depreciation - capex - nwcChange;
      fcffs.push(fcff);
    }

    return fcffs;
  };

  // 运行Monte Carlo模拟
  const simulationResults = useMemo(() => {
    const results: { year: string; fcff: number; percentile: number }[] = [];
    const baseYear = baseProjections[0]?.revenue || 1000;

    // 为每年生成多次模拟
    for (let year = 1; year <= baseInputs.projectionYears; year++) {
      const yearFcffs: number[] = [];

      // 运行多次模拟
      for (let i = 0; i < iterations; i++) {
        const randomInputs = generateRandomInputs(baseInputs);
        const fcffs = calculateFCFF(randomInputs, baseYear);
        yearFcffs.push(fcffs[year - 1]);
      }

      // 计算不同百分位的FCFF值
      yearFcffs.sort((a, b) => a - b);
      const percentiles = [10, 25, 50, 75, 90];
      
      percentiles.forEach(p => {
        const index = Math.floor((p / 100) * yearFcffs.length);
        results.push({
          year: `第${year}年`,
          fcff: yearFcffs[index],
          percentile: p,
        });
      });
    }

    return results;
  }, [baseInputs, baseProjections, iterations]);

  // 生成小提琴图数据
  const violinData = useMemo(() => {
    const data: { year: string; fcff: number }[] = [];
    const baseYear = baseProjections[0]?.revenue || 1000;

    for (let i = 0; i < 200; i++) {
      const randomInputs = generateRandomInputs(baseInputs);
      const fcffs = calculateFCFF(randomInputs, baseYear);
      
      fcffs.forEach((fcff, index) => {
        data.push({
          year: `第${index + 1}年`,
          fcff: fcff,
        });
      });
    }

    return data;
  }, [baseInputs, baseProjections]);

  const areaConfig = {
    data: simulationResults,
    xField: 'year',
    yField: 'fcff',
    seriesField: 'percentile',
    color: ['#FFB6C1', '#87CEEB', '#98FB98', '#87CEEB', '#FFB6C1'],
    areaStyle: {
      fillOpacity: 0.15,
    },
    line: {
      style: {
        lineWidth: 2,
      },
    },
    yAxis: {
      label: {
        formatter: (v: string) => `${(parseFloat(v) / 1000000).toFixed(1)}M`,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: `${datum.percentile}分位数`,
          value: `${(datum.fcff / 1000000).toFixed(1)}M`,
        };
      },
    },
  };

  const violinConfig = {
    data: violinData,
    xField: 'year',
    yField: 'fcff',
    yAxis: {
      label: {
        formatter: (v: string) => `${(parseFloat(v) / 1000000).toFixed(1)}M`,
      },
    },
    tooltip: {
      formatter: (datum: any) => {
        return {
          name: datum.year,
          value: `${(datum.fcff / 1000000).toFixed(1)}M`,
        };
      },
    },
    animation: false,
  };

  return (
    <Card title="蒙特卡洛模拟" className="mb-6">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <Text type="secondary">
            通过模拟{iterations}次参数变化，生成FCFF的可能分布范围。
            区域图显示了不同百分位的FCFF预测值，小提琴图展示了完整的分布情况。
          </Text>
        </div>

        <div style={{ height: 400 }}>
          <Area {...areaConfig} />
        </div>

        <div style={{ height: 300 }}>
          <Violin {...violinConfig} />
        </div>
      </Space>
    </Card>
  );
};

export default MonteCarloSimulation;
