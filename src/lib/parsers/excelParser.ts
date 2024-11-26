import { ParseResult, FinancialData } from '../types';
import * as XLSX from 'xlsx';

export async function parseExcel(filePath: string): Promise<ParseResult> {
  try {
    // 读取Excel文件
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // 使用第一个工作表
    const worksheet = workbook.Sheets[sheetName];
    
    // 将工作表转换为JSON对象数组
    const data = XLSX.utils.sheet_to_json(worksheet);
    
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No valid data found in Excel file');
    }

    // 获取第一行数据
    const firstRow = data[0] as Record<string, any>;
    
    // 尝试识别年份
    const yearColumn = Object.keys(firstRow).find(key => 
      key.toLowerCase().includes('year') || 
      key.toLowerCase().includes('年份')
    );
    
    const year = yearColumn ? parseInt(firstRow[yearColumn].toString()) : undefined;

    // 定义Excel列名到财务数据字段的映射
    const columnMapping: { [key: string]: keyof FinancialData } = {
      '营业收入': 'revenue',
      'Revenue': 'revenue',
      '营业成本': 'costOfRevenue',
      'Cost of Revenue': 'costOfRevenue',
      '毛利润': 'grossProfit',
      'Gross Profit': 'grossProfit',
      '营业费用': 'operatingExpenses',
      'Operating Expenses': 'operatingExpenses',
      '营业利润': 'operatingIncome',
      'Operating Income': 'operatingIncome',
      '净利润': 'netIncome',
      'Net Income': 'netIncome',
      '总资产': 'totalAssets',
      'Total Assets': 'totalAssets',
      '总负债': 'totalLiabilities',
      'Total Liabilities': 'totalLiabilities',
      // ... 添加更多映射
    };

    // 构建财务数据对象
    const financialData: FinancialData = {};
    
    Object.entries(firstRow).forEach(([columnName, value]) => {
      const normalizedColumnName = normalizeColumnName(columnName);
      const mappedField = findMappedField(columnName, columnMapping);
      
      if (mappedField) {
        const numValue = parseNumericValue(value);
        if (numValue !== undefined) {
          financialData[mappedField] = numValue;
        }
      }
    });

    // 将工作表转换为文本以供AI分析
    const rawText = convertWorksheetToText(worksheet);

    return {
      success: true,
      year,
      data: financialData,
      rawText
    };

  } catch (error) {
    console.error('Excel parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during Excel parsing'
    };
  }
}

// 辅助函数：标准化列名
function normalizeColumnName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[\s_-]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .trim();
}

// 辅助函数：查找映射字段
function findMappedField(columnName: string, mapping: { [key: string]: keyof FinancialData }): keyof FinancialData | undefined {
  // 直接匹配
  if (mapping[columnName]) {
    return mapping[columnName];
  }
  
  // 标准化后匹配
  const normalizedName = normalizeColumnName(columnName);
  const mappedField = Object.entries(mapping).find(([key]) => 
    normalizeColumnName(key) === normalizedName
  );
  
  return mappedField ? mappedField[1] : undefined;
}

// 辅助函数：解析数值
function parseNumericValue(value: any): number | undefined {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const cleanValue = value.replace(/[,\s]/g, '');
    const number = parseFloat(cleanValue);
    return isNaN(number) ? undefined : number;
  }
  
  return undefined;
}

// 辅助函数：将工作表转换为文本
function convertWorksheetToText(worksheet: XLSX.WorkSheet): string {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  let text = '';
  
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell && cell.v !== undefined) {
        text += cell.v + '\t';
      } else {
        text += '\t';
      }
    }
    text += '\n';
  }
  
  return text;
}
