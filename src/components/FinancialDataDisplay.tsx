import React from 'react';
import { Table, Card, Descriptions, Alert } from 'antd';
import { FinancialData } from '@/lib/types';

interface FinancialDataDisplayProps {
  data: FinancialData;
  year?: number;
  error?: string;
}

export function FinancialDataDisplay({ data, year, error }: FinancialDataDisplayProps) {
  if (error) {
    return <Alert type="error" message="数据解析错误" description={error} />;
  }

  // 将财务数据转换为表格数据
  const tableData = Object.entries(data)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      item: getDisplayName(key),
      value: formatNumber(value as number),
    }));

  // 表格列定义
  const columns = [
    {
      title: '项目',
      dataIndex: 'item',
      key: 'item',
    },
    {
      title: '金额',
      dataIndex: 'value',
      key: 'value',
      align: 'right' as const,
    },
  ];

  return (
    <div className="space-y-4">
      <Card title={`财务数据概览 ${year ? `(${year}年)` : ''}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card type="inner" title="利润表数据">
            <Descriptions column={1}>
              {data.revenue !== undefined && (
                <Descriptions.Item label="营业收入">
                  {formatNumber(data.revenue)}
                </Descriptions.Item>
              )}
              {data.costOfRevenue !== undefined && (
                <Descriptions.Item label="营业成本">
                  {formatNumber(data.costOfRevenue)}
                </Descriptions.Item>
              )}
              {data.grossProfit !== undefined && (
                <Descriptions.Item label="毛利润">
                  {formatNumber(data.grossProfit)}
                </Descriptions.Item>
              )}
              {data.operatingIncome !== undefined && (
                <Descriptions.Item label="营业利润">
                  {formatNumber(data.operatingIncome)}
                </Descriptions.Item>
              )}
              {data.netIncome !== undefined && (
                <Descriptions.Item label="净利润">
                  {formatNumber(data.netIncome)}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card type="inner" title="资产负债表数据">
            <Descriptions column={1}>
              {data.totalAssets !== undefined && (
                <Descriptions.Item label="总资产">
                  {formatNumber(data.totalAssets)}
                </Descriptions.Item>
              )}
              {data.totalLiabilities !== undefined && (
                <Descriptions.Item label="总负债">
                  {formatNumber(data.totalLiabilities)}
                </Descriptions.Item>
              )}
              {data.totalEquity !== undefined && (
                <Descriptions.Item label="所有者权益">
                  {formatNumber(data.totalEquity)}
                </Descriptions.Item>
              )}
              {data.currentAssets !== undefined && (
                <Descriptions.Item label="流动资产">
                  {formatNumber(data.currentAssets)}
                </Descriptions.Item>
              )}
              {data.currentLiabilities !== undefined && (
                <Descriptions.Item label="流动负债">
                  {formatNumber(data.currentLiabilities)}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card type="inner" title="现金流量表数据">
            <Descriptions column={1}>
              {data.operatingCashFlow !== undefined && (
                <Descriptions.Item label="经营活动现金流">
                  {formatNumber(data.operatingCashFlow)}
                </Descriptions.Item>
              )}
              {data.investingCashFlow !== undefined && (
                <Descriptions.Item label="投资活动现金流">
                  {formatNumber(data.investingCashFlow)}
                </Descriptions.Item>
              )}
              {data.financingCashFlow !== undefined && (
                <Descriptions.Item label="筹资活动现金流">
                  {formatNumber(data.financingCashFlow)}
                </Descriptions.Item>
              )}
              {data.capex !== undefined && (
                <Descriptions.Item label="资本支出">
                  {formatNumber(data.capex)}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>

          <Card type="inner" title="其他指标">
            <Descriptions column={1}>
              {data.workingCapital !== undefined && (
                <Descriptions.Item label="营运资金">
                  {formatNumber(data.workingCapital)}
                </Descriptions.Item>
              )}
              {data.taxRate !== undefined && (
                <Descriptions.Item label="税率">
                  {(data.taxRate * 100).toFixed(2)}%
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        </div>
      </Card>

      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        className="mt-4"
      />
    </div>
  );
}

// 辅助函数：获取字段的显示名称
function getDisplayName(key: string): string {
  const displayNames: { [key: string]: string } = {
    revenue: '营业收入',
    costOfRevenue: '营业成本',
    grossProfit: '毛利润',
    operatingExpenses: '营业费用',
    operatingIncome: '营业利润',
    netIncome: '净利润',
    totalAssets: '总资产',
    totalLiabilities: '总负债',
    totalEquity: '所有者权益',
    currentAssets: '流动资产',
    currentLiabilities: '流动负债',
    operatingCashFlow: '经营活动现金流',
    investingCashFlow: '投资活动现金流',
    financingCashFlow: '筹资活动现金流',
    capex: '资本支出',
    workingCapital: '营运资金',
    taxRate: '税率',
  };
  return displayNames[key] || key;
}

// 辅助函数：格式化数字
function formatNumber(num: number): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}
