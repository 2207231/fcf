import { parse } from 'csv-parse/sync';
import { ParseResult } from '../types';

interface FinancialMetric {
  name: string;
  aliases: string[];
  type: 'income' | 'balance' | 'cash_flow';
  required: boolean;
}

// 使用Map缓存已匹配的列名
const columnMatchCache = new Map<string, string>();

const financialMetrics: FinancialMetric[] = [
  { name: 'revenue', aliases: ['营业收入', '收入', 'Revenue', 'Sales', 'Total Revenue'], type: 'income', required: true },
  { name: 'ebit', aliases: ['EBIT', '息税前利润', 'Operating Income', 'Operating Profit'], type: 'income', required: true },
  { name: 'netIncome', aliases: ['净利润', 'Net Income', 'Net Profit', 'Profit After Tax'], type: 'income', required: true },
  { name: 'depreciation', aliases: ['折旧', 'Depreciation', 'Depreciation & Amortization'], type: 'cash_flow', required: true },
  { name: 'capex', aliases: ['资本支出', 'Capital Expenditure', 'CAPEX', 'Fixed Assets Investment'], type: 'cash_flow', required: true },
  { name: 'workingCapital', aliases: ['营运资金', 'Working Capital', 'Net Working Capital'], type: 'balance', required: true },
  { name: 'totalAssets', aliases: ['总资产', 'Total Assets'], type: 'balance', required: false },
  { name: 'totalLiabilities', aliases: ['总负债', 'Total Liabilities'], type: 'balance', required: false },
  { name: 'operatingCashFlow', aliases: ['经营活动现金流', 'Operating Cash Flow', 'Cash from Operations'], type: 'cash_flow', required: false },
];

// 预编译正则表达式
const numberPattern = /^-?\d+\.?\d*$/;
const datePattern = /^\d{4}[-/]?\d{2}[-/]?\d{2}$/;

export async function parseCSV(fileContent: string): Promise<ParseResult> {
  try {
    // 使用Worker进行异步解析
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: true,
      cast_date: true,
    });

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('CSV文件格式无效或为空');
    }

    // 标准化列名并使用缓存
    const columns = Object.keys(records[0]);
    const metricMap = new Map<string, string>();

    columns.forEach(col => {
      const normalizedCol = col.toLowerCase().trim();
      
      // 检查缓存
      if (columnMatchCache.has(normalizedCol)) {
        metricMap.set(col, columnMatchCache.get(normalizedCol)!);
        return;
      }

      // 如果没有缓存，进行匹配
      for (const metric of financialMetrics) {
        if (metric.aliases.some(alias => 
          normalizedCol.includes(alias.toLowerCase()) || 
          alias.toLowerCase().includes(normalizedCol)
        )) {
          metricMap.set(col, metric.name);
          columnMatchCache.set(normalizedCol, metric.name); // 添加到缓存
          break;
        }
      }
    });

    // 验证必需的指标
    const missingMetrics = financialMetrics
      .filter(m => m.required)
      .filter(m => !Array.from(metricMap.values()).includes(m.name));

    if (missingMetrics.length > 0) {
      throw new Error(`缺少必需的财务指标: ${missingMetrics.map(m => m.name).join(', ')}`);
    }

    // 使用批处理优化数据提取
    const batchSize = 1000;
    const latestRecords = records.slice(-Math.min(batchSize, records.length));
    
    // 提取最近的财务数据
    const latestRecord = latestRecords[latestRecords.length - 1];
    const financialData: Record<string, number> = {};

    // 批量处理数值转换
    for (const [colName, metricName] of metricMap) {
      const value = parseFloat(latestRecord[colName]);
      if (isNaN(value)) {
        throw new Error(`无法解析 ${metricName} 的数值`);
      }
      financialData[metricName] = value;
    }

    // 计算年度变化（使用批处理）
    const yearlyChanges: Record<string, number> = {};
    if (latestRecords.length > 1) {
      const previousRecord = latestRecords[latestRecords.length - 2];
      for (const [colName, metricName] of metricMap) {
        const currentValue = financialData[metricName];
        const previousValue = parseFloat(previousRecord[colName]);
        if (!isNaN(previousValue) && previousValue !== 0) {
          yearlyChanges[metricName] = ((currentValue - previousValue) / previousValue) * 100;
        }
      }
    }

    // 计算财务比率（使用批处理）
    const ratios = {
      ebitMargin: (financialData.ebit / financialData.revenue) * 100,
      depreciationRate: (financialData.depreciation / financialData.revenue) * 100,
      capexRate: (financialData.capex / financialData.revenue) * 100,
      nwcRate: (financialData.workingCapital / financialData.revenue) * 100,
    };

    return {
      success: true,
      data: {
        financialData,
        yearlyChanges,
        ratios,
        metadata: {
          source: 'CSV',
          metrics: Array.from(metricMap.keys()),
          years: records.length,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error('CSV解析错误:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '解析CSV文件时发生未知错误',
    };
  }
}
