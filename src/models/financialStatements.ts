// 检查解析函数是否正确映射这些字段
const mapFinancialData = (data: any) => {
  console.log('Raw data:', data);
  
  const mapped = {
    revenue: data['营业总收入'] || data['营业收入'],
    ebit: data['EBIT'] || data['息税前利润'],
    netIncome: data['净利润'],
    depreciation: data['折旧摊销'] || data['折旧与摊销'],
    capex: data['购建固定资产、无形资产和其他长期资产支付的现金'],
    workingCapital: Number(data['流动资产']) - Number(data['非流动负债'])
  };
  
  // 数据验证
  Object.entries(mapped).forEach(([key, value]) => {
    if (value === undefined || value === null || isNaN(value)) {
      console.warn(`Warning: ${key} is ${value}`);
    }
  });
  
  console.log('Mapped data:', mapped);
  return mapped;
}; 