import { ParseResult, FinancialData } from '../types';
import { promises as fs } from 'fs';
import * as xml2js from 'xml2js';

export async function parseXBRL(filePath: string): Promise<ParseResult> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const parser = new xml2js.Parser({ explicitArray: false });
    
    // 将 XBRL 文件解析为 JavaScript 对象
    const result = await parser.parseStringPromise(fileContent);
    
    // 初始化财务数据对象
    const financialData: FinancialData = {};
    
    // XBRL标签到财务数据字段的映射
    const xbrlMapping: { [key: string]: keyof FinancialData } = {
      'Revenue': 'revenue',
      'CostOfRevenue': 'costOfRevenue',
      'GrossProfit': 'grossProfit',
      'OperatingExpenses': 'operatingExpenses',
      'OperatingIncome': 'operatingIncome',
      'NetIncome': 'netIncome',
      'TotalAssets': 'totalAssets',
      'TotalLiabilities': 'totalLiabilities',
      'TotalEquity': 'totalEquity',
      // ... 添加更多映射
    };

    // 尝试从XBRL文档中提取年份
    const year = extractYear(result);
    
    // 遍历XBRL文档查找财务数据
    traverseXBRL(result, xbrlMapping, financialData);

    return {
      success: true,
      year,
      data: financialData,
      rawText: fileContent // 保存原始内容用于后续分析
    };

  } catch (error) {
    console.error('XBRL parsing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during XBRL parsing'
    };
  }
}

// 辅助函数：从XBRL文档中提取年份
function extractYear(xbrlDoc: any): number | undefined {
  // 这里的实现需要根据具体的XBRL文档结构来调整
  try {
    // 尝试从context中提取年份
    if (xbrlDoc.xbrl && xbrlDoc.xbrl.context) {
      const context = xbrlDoc.xbrl.context;
      if (Array.isArray(context)) {
        for (const ctx of context) {
          if (ctx.period && ctx.period.instant) {
            const date = new Date(ctx.period.instant);
            return date.getFullYear();
          }
        }
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

// 辅助函数：遍历XBRL文档并提取数据
function traverseXBRL(
  obj: any, 
  mapping: { [key: string]: keyof FinancialData }, 
  data: FinancialData
) {
  if (!obj) return;

  // 如果是对象，遍历其属性
  if (typeof obj === 'object') {
    for (const key in obj) {
      if (mapping[key]) {
        // 如果找到匹配的标签，提取数值
        const value = extractNumericValue(obj[key]);
        if (value !== undefined) {
          data[mapping[key]] = value;
        }
      }
      // 递归遍历子对象
      traverseXBRL(obj[key], mapping, data);
    }
  }
}

// 辅助函数：提取数值
function extractNumericValue(value: any): number | undefined {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string') {
    const cleanValue = value.replace(/[,\s]/g, '');
    const number = parseFloat(cleanValue);
    return isNaN(number) ? undefined : number;
  }
  
  if (typeof value === 'object' && value !== null) {
    // 处理XBRL中可能的复杂数值表示
    if (value._) {
      return extractNumericValue(value._);
    }
  }
  
  return undefined;
}
