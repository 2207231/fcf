import { ParseResult } from '../types';
import * as pdf from 'pdf-parse';

interface TableData {
  headers: string[];
  rows: string[][];
}

interface ExtractedData {
  tables: TableData[];
  text: string;
}

const financialKeywords = {
  revenue: ['营业收入', '营业总收入', '主营业务收入', 'Revenue', 'Sales', 'Operating Revenue'],
  ebit: ['息税前利润', 'EBIT', '营业利润', 'Operating Profit', 'Operating Income'],
  netIncome: ['净利润', '归属于母公司所有者的净利润', 'Net Income', 'Net Profit'],
  depreciation: ['折旧', '折旧与摊销', 'Depreciation', 'Depreciation & Amortization'],
  capex: ['资本支出', '购建固定资产、无形资产和其他长期资产支付的现金', 'Capital Expenditure', 'CAPEX'],
  workingCapital: ['营运资金', '流动资产净额', 'Working Capital', 'Net Working Capital'],
};

export async function parsePDF(buffer: Buffer): Promise<ParseResult> {
  try {
    const data = await pdf(buffer);
    const extractedData = extractTablesAndText(data.text);
    const financialData = processFinancialData(extractedData);

    if (!financialData) {
      throw new Error('无法从PDF中提取有效的财务数据');
    }

    // 计算财务比率
    const ratios = calculateFinancialRatios(financialData);

    return {
      success: true,
      data: {
        financialData,
        ratios,
        metadata: {
          source: 'PDF',
          pageCount: data.numpages,
          documentInfo: data.info,
        },
      },
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : '解析PDF文件时发生未知错误',
    };
  }
}

function extractTablesAndText(text: string): ExtractedData {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const tables: TableData[] = [];
  let currentTable: string[][] = [];
  let isInTable = false;
  let normalText: string[] = [];

  // 表格识别的正则表达式
  const tablePatterns = [
    /^[\s\t]*[\d,\.]+[\s\t]+[\d,\.]+/, // 数字列
    /^[\s\t]*项目[\s\t]+\d{4}/, // 常见的财务报表表头
    /^[\s\t]*单位：/, // 金额单位说明
  ];

  lines.forEach(line => {
    // 检查是否是表格行
    const isTableRow = tablePatterns.some(pattern => pattern.test(line));

    if (isTableRow) {
      if (!isInTable) {
        isInTable = true;
        currentTable = [];
      }
      // 分割表格行
      const cells = line.split(/\s{2,}/).map(cell => cell.trim());
      currentTable.push(cells);
    } else {
      if (isInTable && currentTable.length > 0) {
        // 结束当前表格
        if (currentTable.length > 1) { // 至少有表头和一行数据
          tables.push({
            headers: currentTable[0],
            rows: currentTable.slice(1),
          });
        }
        currentTable = [];
        isInTable = false;
      }
      normalText.push(line);
    }
  });

  // 处理最后一个表格
  if (isInTable && currentTable.length > 1) {
    tables.push({
      headers: currentTable[0],
      rows: currentTable.slice(1),
    });
  }

  return {
    tables,
    text: normalText.join('\n'),
  };
}

function processFinancialData(extractedData: ExtractedData): Record<string, number> | null {
  const financialData: Record<string, number> = {};
  const { tables, text } = extractedData;

  // 处理表格数据
  tables.forEach(table => {
    table.rows.forEach(row => {
      for (const [metric, keywords] of Object.entries(financialKeywords)) {
        const matchingCell = row.find(cell =>
          keywords.some(keyword => cell.includes(keyword))
        );
        if (matchingCell) {
          // 查找同一行中的数值
          const value = extractNumberFromRow(row);
          if (value !== null) {
            financialData[metric] = value;
          }
        }
      }
    });
  });

  // 处理文本数据
  const textLines = text.split('\n');
  textLines.forEach(line => {
    for (const [metric, keywords] of Object.entries(financialKeywords)) {
      if (keywords.some(keyword => line.includes(keyword))) {
        const value = extractNumberFromText(line);
        if (value !== null && !financialData[metric]) {
          financialData[metric] = value;
        }
      }
    }
  });

  // 验证是否获取到所有必需的数据
  const requiredMetrics = ['revenue', 'ebit', 'netIncome', 'depreciation', 'capex', 'workingCapital'];
  const hasAllRequired = requiredMetrics.every(metric => metric in financialData);

  return hasAllRequired ? financialData : null;
}

function extractNumberFromRow(row: string[]): number | null {
  // 查找包含数字的单元格
  const numberCell = row.find(cell => /[\d,\.]+/.test(cell));
  if (numberCell) {
    return parseFloat(numberCell.replace(/[^\d.-]/g, ''));
  }
  return null;
}

function extractNumberFromText(text: string): number | null {
  // 匹配金额模式
  const patterns = [
    /(?:¥|RMB|USD)?\s*([\d,]+(?:\.\d{2})?)/,
    /([\d,]+(?:\.\d{2})?)\s*(?:万元|亿元|元|万|亿)/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = parseFloat(match[1].replace(/,/g, ''));
      // 根据单位调整数值
      if (text.includes('亿')) {
        return value * 100000000;
      } else if (text.includes('万')) {
        return value * 10000;
      }
      return value;
    }
  }

  return null;
}

function calculateFinancialRatios(financialData: Record<string, number>) {
  return {
    ebitMargin: (financialData.ebit / financialData.revenue) * 100,
    depreciationRate: (financialData.depreciation / financialData.revenue) * 100,
    capexRate: (financialData.capex / financialData.revenue) * 100,
    nwcRate: (financialData.workingCapital / financialData.revenue) * 100,
  };
}
