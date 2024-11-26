import * as XLSX from 'xlsx';
import { ParseResult } from '../types';

interface FinancialMetric {
  name: string;
  aliases: string[];
  type: 'income' | 'balance' | 'cash_flow' | 'ratio';
  required: boolean;
  calculator?: (data: any) => number;
}

const financialMetrics: FinancialMetric[] = [
  // 基础必需指标
  { 
    name: 'revenue', 
    aliases: ['营业总收入', '营业收入', 'Revenue', 'Sales', 'Total Revenue'], 
    type: 'income', 
    required: true 
  },
  { 
    name: 'ebit', 
    aliases: ['EBIT', 'EBIT Margin', '息税前利润', 'Operating Income', 'Operating Profit', '营业利润'], 
    type: 'income', 
    required: true 
  },
  { 
    name: 'netIncome', 
    aliases: ['净利润', '归属于母公司股东的净利润', 'Net Income', 'Net Profit', 'Profit After Tax'], 
    type: 'income', 
    required: true 
  },
  { 
    name: 'depreciation', 
    aliases: ['折旧与摊销', '折旧', 'Depreciation', 'Depreciation & Amortization'], 
    type: 'cash_flow', 
    required: true 
  },
  { 
    name: 'capex', 
    aliases: ['资本支出', '购建固定资产、无形资产和其他长期资产支付的现金', 'Capital Expenditure', 'CAPEX', 'Fixed Assets Investment'], 
    type: 'cash_flow', 
    required: true 
  },
  { 
    name: 'workingCapital', 
    aliases: ['营运资金', '流动资产', 'Working Capital', 'Net Working Capital'], 
    type: 'balance', 
    required: true,
    calculator: (data: any) => {
      const currentAssets = parseFloat(data['流动资产'] || '0');
      const currentLiabilities = parseFloat(data['流动负债'] || '0');
      return currentAssets - currentLiabilities;
    }
  },

  // 扩展指标
  {
    name: 'ebitda',
    aliases: ['EBITDA', 'EBITDA Margin'],
    type: 'income',
    required: false
  },
  {
    name: 'totalAssets',
    aliases: ['资产总计', '总资产', 'Total Assets'],
    type: 'balance',
    required: false
  },
  {
    name: 'totalLiabilities',
    aliases: ['负债合计', '总负债', 'Total Liabilities'],
    type: 'balance',
    required: false
  },
  {
    name: 'shareholdersEquity',
    aliases: ['股东权益', '所有者权益', "Shareholders' Equity"],
    type: 'balance',
    required: false
  },
  {
    name: 'operatingCashFlow',
    aliases: ['经营活动产生的现金流量净额', '经营现金流', 'Operating Cash Flow'],
    type: 'cash_flow',
    required: false
  },
  {
    name: 'investingCashFlow',
    aliases: ['投资活动产生的现金流量净额', '投资现金流', 'Investing Cash Flow'],
    type: 'cash_flow',
    required: false
  },
  {
    name: 'financingCashFlow',
    aliases: ['筹资活动产生的现金流量净额', '筹资现金流', 'Financing Cash Flow'],
    type: 'cash_flow',
    required: false
  },
  {
    name: 'roe',
    aliases: ['ROE(加权)(%)', 'ROE', 'Return on Equity'],
    type: 'ratio',
    required: false,
    calculator: (data: any) => {
      const roeStr = data['ROE(加权)(%)'];
      return roeStr ? parseFloat(roeStr) / 100 : undefined;
    }
  },
  {
    name: 'roa',
    aliases: ['总资产报酬率ROA(%)', 'ROA', 'Return on Assets'],
    type: 'ratio',
    required: false,
    calculator: (data: any) => {
      const roaStr = data['总资产报酬率ROA(%)'];
      return roaStr ? parseFloat(roaStr) / 100 : undefined;
    }
  },
  {
    name: 'grossMargin',
    aliases: ['销售毛利率(%)', 'Gross Margin'],
    type: 'ratio',
    required: false,
    calculator: (data: any) => {
      const marginStr = data['销售毛利率(%)'];
      return marginStr ? parseFloat(marginStr) / 100 : undefined;
    }
  },
  {
    name: 'ebitMargin',
    aliases: ['EBIT Margin(%)', 'EBIT利润率'],
    type: 'ratio',
    required: false,
    calculator: (data: any) => {
      const marginStr = data['EBIT Margin(%)'];
      return marginStr ? parseFloat(marginStr) / 100 : undefined;
    }
  },
  {
    name: 'ebitdaMargin',
    aliases: ['EBITDA Margin(%)', 'EBITDA利润率'],
    type: 'ratio',
    required: false,
    calculator: (data: any) => {
      const marginStr = data['EBITDA Margin(%)'];
      return marginStr ? parseFloat(marginStr) / 100 : undefined;
    }
  },
  {
    name: 'debtRatio',
    aliases: ['资产负债率(%)', 'Debt Ratio'],
    type: 'ratio',
    required: false,
    calculator: (data: any) => {
      const ratioStr = data['资产负债率(%)'];
      return ratioStr ? parseFloat(ratioStr) / 100 : undefined;
    }
  },
  {
    name: 'assetTurnover',
    aliases: ['总资产周转率(次)', 'Asset Turnover'],
    type: 'ratio',
    required: false
  },
  {
    name: 'eps',
    aliases: ['EPS(基本)(元)', 'EPS', 'Earnings Per Share'],
    type: 'ratio',
    required: false
  }
];

// 缓存已匹配的列名
const columnMatchCache = new Map<string, string>();

// 添加默认值和估算逻辑
const defaultValues = {
  revenue: 0,
  ebit: 0,
  netIncome: 0,
  depreciation: 0,
  capex: 0,
  workingCapital: 0
};

const estimators = {
  ebit: (data: any) => {
    // 如果有营业利润，直接使用
    if (data['营业利润']) {
      return parseFloat(data['营业利润']);
    }
    // 如果有净利润和税率，反推EBIT
    if (data['净利润'] && data['ROE(加权)(%)']) {
      const netIncome = parseFloat(data['净利润']);
      const taxRate = 0.25; // 假设25%的税率
      return netIncome / (1 - taxRate);
    }
    // 如果有EBITDA和折旧，计算EBIT
    if (data['EBITDA'] && data['折旧与摊销']) {
      return parseFloat(data['EBITDA']) - parseFloat(data['折旧与摊销']);
    }
    return defaultValues.ebit;
  },
  
  workingCapital: (data: any) => {
    // 如果有流动资产和流动负债，计算营运资金
    if (data['流动资产'] && data['流动负债']) {
      return parseFloat(data['流动资产']) - parseFloat(data['流动负债']);
    }
    // 如果有营业收入，估算营运资金（假设为营业收入的15%）
    if (data['营业收入']) {
      return parseFloat(data['营业收入']) * 0.15;
    }
    return defaultValues.workingCapital;
  },
  
  depreciation: (data: any) => {
    // 如果有折旧与摊销，直接使用
    if (data['折旧与摊销']) {
      return parseFloat(data['折旧与摊销']);
    }
    // 如果有固定资产，估算折旧（假设10%的折旧率）
    if (data['固定资产']) {
      return parseFloat(data['固定资产']) * 0.1;
    }
    // 如果有营业收入，估算折旧（假设为营业收入的5%）
    if (data['营业收入']) {
      return parseFloat(data['营业收入']) * 0.05;
    }
    return defaultValues.depreciation;
  },
  
  capex: (data: any) => {
    // 如果有购建固定资产等支付的现金，直接使用
    if (data['购建固定资产、无形资产和其他长期资产支付的现金']) {
      return parseFloat(data['购建固定资产、无形资产和其他长期资产支付的现金']);
    }
    // 如果有固定资产变动，使用变动值
    if (data['固定资产'] && data['上期固定资产']) {
      return parseFloat(data['固定资产']) - parseFloat(data['上期固定资产']);
    }
    // 如果有营业收入，估算资本支出（假设为营业收入的7%）
    if (data['营业收入']) {
      return parseFloat(data['营业收入']) * 0.07;
    }
    return defaultValues.capex;
  }
};

export async function parseXLSX(buffer: ArrayBuffer): Promise<ParseResult> {
  try {
    // 读取工作簿
    const workbook = XLSX.read(buffer, { type: 'array' });
    
    // 获取第一个工作表
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // 转换为JSON
    const records = XLSX.utils.sheet_to_json(worksheet);

    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('Excel文件格式无效或为空');
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
          columnMatchCache.set(normalizedCol, metric.name);
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
      const metric = financialMetrics.find(m => m.name === metricName);
      
      try {
        if (metric?.calculator) {
          financialData[metricName] = metric.calculator(latestRecord);
        } else {
          const value = typeof latestRecord[colName] === 'number' 
            ? latestRecord[colName] 
            : parseFloat(latestRecord[colName]);
            
          if (!isNaN(value)) {
            financialData[metricName] = value;
          } else if (metric?.required && estimators[metricName]) {
            // 如果是必需指标且有估算器，使用估算值
            console.warn(`使用估算值计算 ${metricName}`);
            financialData[metricName] = estimators[metricName](latestRecord);
          } else if (metric?.required) {
            // 如果是必需指标但没有估算器，使用默认值
            console.warn(`使用默认值填充 ${metricName}`);
            financialData[metricName] = defaultValues[metricName];
          }
        }
      } catch (error) {
        if (metric?.required) {
          console.warn(`计算 ${metricName} 时出错，使用估算或默认值`);
          financialData[metricName] = estimators[metricName]?.(latestRecord) ?? defaultValues[metricName];
        }
      }
    }

    // 计算年度变化
    const yearlyChanges: Record<string, number> = {};
    if (latestRecords.length > 1) {
      const previousRecord = latestRecords[latestRecords.length - 2];
      for (const [colName, metricName] of metricMap) {
        const currentValue = financialData[metricName];
        const previousValue = typeof previousRecord[colName] === 'number'
          ? previousRecord[colName]
          : parseFloat(previousRecord[colName]);
          
        if (!isNaN(previousValue) && previousValue !== 0) {
          yearlyChanges[metricName] = ((currentValue - previousValue) / previousValue) * 100;
        }
      }
    }

    // 计算财务比率
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
          source: 'XLSX',
          metrics: Array.from(metricMap.keys()),
          years: records.length,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error('Excel解析错误:', error);
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '解析Excel文件时发生未知错误',
    };
  }
}
