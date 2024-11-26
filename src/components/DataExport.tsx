'use client';

import React from 'react';
import { Card, Button, Space, Typography, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import type { FCFFInputs, FCFFProjection } from '@/lib/types';
import * as XLSX from 'xlsx';

const { Text } = Typography;

interface DataExportProps {
  inputs: FCFFInputs;
  projections: FCFFProjection[];
  sensitivityData: any[];
  monteCarloResults: any[];
}

const DataExport: React.FC<DataExportProps> = ({
  inputs,
  projections,
  sensitivityData,
  monteCarloResults,
}) => {
  // 导出到Excel
  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // 输入参数工作表
      const inputsData = [
        ['参数', '值'],
        ['收入增长率', `${inputs.revenueGrowthRate}%`],
        ['EBIT利润率', `${inputs.ebitMargin}%`],
        ['税率', `${inputs.taxRate}%`],
        ['折旧率', `${inputs.depreciationRate}%`],
        ['资本支出率', `${inputs.capexRate}%`],
        ['营运资金变动率', `${inputs.nwcRate}%`],
        ['预测年数', inputs.projectionYears],
      ];
      const inputsSheet = XLSX.utils.aoa_to_sheet(inputsData);
      XLSX.utils.book_append_sheet(workbook, inputsSheet, '输入参数');

      // 预测结果工作表
      const projectionsData = [
        ['年份', '收入', 'EBIT', '税后EBIT', '折旧', '资本支出', '营运资金变动', 'FCFF'],
        ...projections.map((p, i) => [
          `第${i + 1}年`,
          p.revenue.toFixed(2),
          p.ebit.toFixed(2),
          p.nopat.toFixed(2),
          p.depreciation.toFixed(2),
          p.capex.toFixed(2),
          p.nwcChange.toFixed(2),
          p.fcff.toFixed(2),
        ]),
      ];
      const projectionsSheet = XLSX.utils.aoa_to_sheet(projectionsData);
      XLSX.utils.book_append_sheet(workbook, projectionsSheet, '预测结果');

      // 敏感性分析工作表
      if (sensitivityData.length > 0) {
        const sensitivitySheet = XLSX.utils.json_to_sheet(sensitivityData);
        XLSX.utils.book_append_sheet(workbook, sensitivitySheet, '敏感性分析');
      }

      // 蒙特卡洛模拟工作表
      if (monteCarloResults.length > 0) {
        const monteCarloSheet = XLSX.utils.json_to_sheet(monteCarloResults);
        XLSX.utils.book_append_sheet(workbook, monteCarloSheet, '蒙特卡洛模拟');
      }

      // 导出文件
      XLSX.writeFile(workbook, 'FCFF分析结果.xlsx');
      message.success('导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请稍后重试');
    }
  };

  // 导出到CSV
  const exportToCSV = () => {
    try {
      // 预测结果CSV
      const projectionsCSV = [
        'Year,Revenue,EBIT,NOPAT,Depreciation,CAPEX,NWC Change,FCFF',
        ...projections.map((p, i) => 
          `${i + 1},${p.revenue},${p.ebit},${p.nopat},${p.depreciation},${p.capex},${p.nwcChange},${p.fcff}`
        ),
      ].join('\n');

      const blob = new Blob([projectionsCSV], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'FCFF预测结果.csv';
      link.click();
      message.success('导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请稍后重试');
    }
  };

  // 导出到JSON
  const exportToJSON = () => {
    try {
      const data = {
        inputs,
        projections,
        sensitivityData,
        monteCarloResults,
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'FCFF分析结果.json';
      link.click();
      message.success('导出成功！');
    } catch (error) {
      console.error('导出失败:', error);
      message.error('导出失败，请稍后重试');
    }
  };

  return (
    <Card title="数据导出" className="mb-6">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Text type="secondary">
          导出FCFF分析结果，支持Excel、CSV和JSON格式。
          Excel格式包含所有分析数据，CSV格式仅包含预测结果，
          JSON格式包含完整的原始数据。
        </Text>
        
        <Space>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={exportToExcel}
          >
            导出到Excel
          </Button>
          
          <Button
            icon={<DownloadOutlined />}
            onClick={exportToCSV}
          >
            导出到CSV
          </Button>
          
          <Button
            icon={<DownloadOutlined />}
            onClick={exportToJSON}
          >
            导出到JSON
          </Button>
        </Space>
      </Space>
    </Card>
  );
};

export default DataExport;
