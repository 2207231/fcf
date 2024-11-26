const testData = {
    '2023年': {
        '营业总收入': 40091704.49,
        '营业收入': 40091704.49,
        '营业利润': 5371830.21,
        'EBIT': 4903876.69,
        '净利润': 4676103.45,
        '归属于母公司股东的净利润': 4412124.83,
        '折旧与摊销': 2264598.18,
        '购建固定资产、无形资产和其他长期资产支付的现金': 3362489.65,
        '流动资产': 44978800.17,
        '流动负债': 28700106.91
    },
    '2022年': {
        '营业总收入': 32859398.75,
        '营业收入': 32859398.75,
        '营业利润': 3682198.31,
        'EBIT': 3481786.64,
        '净利润': 3345714.35,
        '归属于母公司股东的净利润': 3072916.35,
        '折旧与摊销': 1325254.10,
        '购建固定资产、无形资产和其他长期资产支付的现金': 4821526.81,
        '流动资产': 38773485.70,
        '流动负债': 29576141.93
    }
};
function validateMetrics(yearData) {
    const metrics = {
        revenue: yearData['营业收入'] || yearData['营业总收入'],
        ebit: yearData['EBIT'] || yearData['营业利润'],
        netIncome: yearData['归属于母公司股东的净利润'] || yearData['净利润'],
        depreciation: yearData['折旧与摊销'],
        capex: yearData['购建固定资产、无形资产和其他长期资产支付的现金'],
        workingCapital: yearData['流动资产'] - yearData['流动负债']
    };
    // 验证所有指标是否存在且为数字
    Object.entries(metrics).forEach(([key, value]) => {
        if (value === undefined || value === null || isNaN(value)) {
            throw new Error(`Missing or invalid ${key} value`);
        }
    });
    return metrics;
}
// 测试数据处理
Object.entries(testData).forEach(([year, data]) => {
    try {
        const metrics = validateMetrics(data);
        console.log(`\n${year} 财务指标:`);
        console.log('营业收入:', metrics.revenue.toLocaleString('zh-CN'));
        console.log('EBIT:', metrics.ebit.toLocaleString('zh-CN'));
        console.log('净利润:', metrics.netIncome.toLocaleString('zh-CN'));
        console.log('折旧与摊销:', metrics.depreciation.toLocaleString('zh-CN'));
        console.log('资本支出:', metrics.capex.toLocaleString('zh-CN'));
        console.log('营运资本:', metrics.workingCapital.toLocaleString('zh-CN'));
    }
    catch (error) {
        console.error(`${year} 数据处理错误:`, error.message);
    }
});
export {};
