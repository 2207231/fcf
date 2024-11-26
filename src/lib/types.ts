// 定义财务数据的基本结构
export interface FinancialData {
  // 利润表数据
  revenue?: number;              // 营业收入
  costOfRevenue?: number;        // 营业成本
  grossProfit?: number;         // 毛利润
  operatingExpenses?: number;   // 营业费用
  operatingIncome?: number;     // 营业利润
  netIncome?: number;           // 净利润
  
  // 资产负债表数据
  totalAssets?: number;         // 总资产
  totalLiabilities?: number;    // 总负债
  totalEquity?: number;         // 所有者权益
  currentAssets?: number;       // 流动资产
  currentLiabilities?: number;  // 流动负债
  
  // 现金流量表数据
  operatingCashFlow?: number;   // 经营活动现金流
  investingCashFlow?: number;   // 投资活动现金流
  financingCashFlow?: number;   // 筹资活动现金流
  capex?: number;              // 资本支出
  
  // 其他重要指标
  workingCapital?: number;      // 营运资金
  taxRate?: number;            // 税率
}

// 定义解析结果的结构
export interface ParseResult {
  success: boolean;
  data: {
    [year: string]: {
      revenue?: number;
      ebit?: number;
      fcff?: number;
      [key: string]: any;
    };
  };
  year?: string;
  error?: string;
}

// 定义FCFF模型的输入参数
export interface FCFFModelParams {
  projectionYears: number;     // 预测年数
  growthRate: number;          // 增长率
  terminalGrowthRate: number;  // 永续增长率
  wacc: number;               // 加权平均资本成本
}

// 定义FCFF模型的计算结果
export interface FCFFModelResult {
  yearlyProjections: {
    year: number;
    fcff: number;
    revenue: number;
    operatingIncome: number;
    workingCapitalChange: number;
    capex: number;
  }[];
  terminalValue: number;
  enterpriseValue: number;
}

// 定义FCFF模型的输入参数
export interface FCFFInputs {
  revenueGrowthRate: number;
  ebitMargin: number;
  taxRate: number;
  depreciationRate: number;
  capexRate: number;
  nwcRate: number;
  projectionYears: number;
}

// 定义FCFF模型的预测结果
export interface FCFFProjection {
  year: string;
  revenue: number;
  ebit: number;
  nopat: number;
  depreciation: number;
  capex: number;
  nwcChange: number;
  fcff: number;
}

// 定义敏感性分析数据
export interface SensitivityData {
  parameter: string;
  change: string;
  impact: number;
  value: number;
}
