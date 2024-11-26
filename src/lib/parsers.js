import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import * as pdfjsLib from 'pdfjs-dist';
import { XMLParser } from 'fast-xml-parser';
// 处理Excel文件
async function parseExcel(buffer) {
    const workbook = XLSX.read(buffer);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
    const columns = jsonData[0];
    const data = jsonData.slice(1);
    return {
        data,
        metadata: {
            columns,
            rowCount: data.length,
            fileType: 'excel'
        }
    };
}
// 处理CSV文件
async function parseCsv(buffer) {
    const content = buffer.toString();
    const records = csvParse(content, {
        columns: true,
        skip_empty_lines: true
    });
    const columns = Object.keys(records[0]);
    return {
        data: records,
        metadata: {
            columns,
            rowCount: records.length,
            fileType: 'csv'
        }
    };
}
// 处理XML文件
async function parseXml(buffer) {
    const parser = new XMLParser();
    const content = buffer.toString();
    const jsonObj = parser.parse(content);
    // 将XML数据转换为扁平化的数组格式
    const flattenedData = flattenXmlData(jsonObj);
    const columns = Object.keys(flattenedData[0] || {});
    return {
        data: flattenedData,
        metadata: {
            columns,
            rowCount: flattenedData.length,
            fileType: 'xml'
        }
    };
}
// 处理PDF文件
async function parsePdf(buffer) {
    const data = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdf = await loadingTask.promise;
    const textContent = [];
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        textContent.push(...content.items.map(item => item.str));
    }
    return {
        data: textContent,
        metadata: {
            columns: ['content', 'page'],
            rowCount: textContent.length,
            fileType: 'pdf'
        }
    };
}
// 辅助函数：将XML数据扁平化
function flattenXmlData(obj, prefix = '') {
    let result = [];
    for (const key in obj) {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(value)) {
            result = result.concat(value.map(item => {
                if (typeof item === 'object') {
                    return flattenXmlData(item, newKey)[0];
                }
                return { [newKey]: item };
            }));
        }
        else if (typeof value === 'object' && value !== null) {
            result = result.concat(flattenXmlData(value, newKey));
        }
        else {
            if (result.length === 0)
                result.push({});
            result[0][newKey] = value;
        }
    }
    return result;
}
// 数据清洗和标准化
function cleanData(data) {
    return data.map(row => {
        const cleanedRow = { ...row };
        for (const key in cleanedRow) {
            // 处理数值型数据
            if (typeof cleanedRow[key] === 'string' && !isNaN(Number(cleanedRow[key]))) {
                cleanedRow[key] = Number(cleanedRow[key]);
            }
            // 处理日期型数据
            if (typeof cleanedRow[key] === 'string' && isValidDate(cleanedRow[key])) {
                cleanedRow[key] = new Date(cleanedRow[key]);
            }
            // 处理空值
            if (cleanedRow[key] === '' || cleanedRow[key] === undefined) {
                cleanedRow[key] = null;
            }
        }
        return cleanedRow;
    });
}
// 辅助函数：验证日期
function isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
}
// 定义财务指标的映射关系
const financialMetricsMapping = {
    revenue: ['revenue', 'operating_revenue', 'total_revenue', '营业收入', '营业总收入'],
    ebit: ['ebit', 'operating_income', 'operating_profit', 'operatingincome', 'operatingprofit', 'EBIT', '营业利润', 'EBIT'],
    netIncome: ['net_income', 'netincome', 'net_profit', 'netprofit', 'profit_after_tax', '净利润', '归属于母公司股东的净利润'],
    depreciation: ['depreciation', 'depreciation_amortization', 'dep_amort', '折旧与摊销', '折旧', '折旧摊销'],
    capex: [
        'capital_expenditure',
        'capex',
        'capital_spending',
        'capitalexpenditures',
        '购建固定资产、无形资产和其他长期资产支付的现金',
        '购建固定资产_无形资产和其他长期资产支付的现金'
    ],
    workingCapital: ['working_capital', 'workingcapital', 'net_working_capital', '营运资本']
};
// 验证必需的财务指标
function validateRequiredMetrics(data) {
    console.log('Validating data:', data);
    const metrics = {};
    const foundColumns = new Set();
    // 遍历所有列名，查找匹配的财务指标
    Object.keys(data).forEach(column => {
        console.log('Checking column:', column);
        const originalColumn = column;
        const lowerColumn = column.toLowerCase().replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '_');
        for (const [metric, possibleNames] of Object.entries(financialMetricsMapping)) {
            if (possibleNames.some(name => {
                const normalizedName = name.toLowerCase().replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '_');
                return lowerColumn.includes(normalizedName) || normalizedName.includes(lowerColumn);
            })) {
                const value = Number(data[originalColumn]);
                if (!isNaN(value)) {
                    metrics[metric] = Math.abs(value);
                    foundColumns.add(metric);
                    console.log(`Found ${metric}:`, value);
                    break;
                }
            }
        }
    });
    // 如果找不到某些指标，尝试其他方法计算
    if (!foundColumns.has('workingCapital')) {
        try {
            metrics.workingCapital = calculateWorkingCapital(data);
            foundColumns.add('workingCapital');
        }
        catch (error) {
            console.warn('Failed to calculate working capital:', error.message);
        }
    }
    // 检查是否所有必需的指标都找到了
    const missingMetrics = Object.keys(financialMetricsMapping).filter(metric => !foundColumns.has(metric));
    if (missingMetrics.length > 0) {
        console.warn('Found columns:', Object.keys(data));
        console.warn('Found metrics:', Array.from(foundColumns));
        console.warn('Missing metrics:', missingMetrics);
        throw new Error(`Missing required financial metrics: ${missingMetrics.join(', ')}`);
    }
    return metrics;
}
// 计算工作资本（如果未直接提供）
function calculateWorkingCapital(data) {
    const currentAssets = findValue(data, [
        'current_assets', 
        'currentassets', 
        '流动资产', 
        '流动资产合计',
        '流动资产总计'
    ]);
    
    const currentLiabilities = findValue(data, [
        'current_liabilities', 
        'currentliabilities', 
        '流动负债', 
        '流动负债合计',
        '流动负债总计'
    ]);

    if (currentAssets !== null && currentLiabilities !== null) {
        return currentAssets - currentLiabilities;
    }
    
    throw new Error('Cannot calculate working capital: missing current assets or current liabilities');
}
// 辅助函数：查找值
function findValue(data, possibleNames) {
    // 首先尝试直接匹配
    for (const name of possibleNames) {
        if (data[name] !== undefined) {
            const value = Number(data[name]);
            if (!isNaN(value)) {
                return value;
            }
        }
    }
    // 如果直接匹配失败，尝试模糊匹配
    for (const name of possibleNames) {
        const normalizedSearchName = name.toLowerCase().replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '_');
        const matchingKey = Object.keys(data).find(key => {
            const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_\u4e00-\u9fa5]/g, '_');
            return normalizedKey.includes(normalizedSearchName) ||
                normalizedSearchName.includes(normalizedKey);
        });
        if (matchingKey) {
            const value = Number(data[matchingKey]);
            if (!isNaN(value)) {
                return value;
            }
        }
    }
    return null;
}
// 主解析函数
export async function parseFile(buffer, fileType) {
    let processedData;
    try {
        switch (fileType) {
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            case 'application/vnd.ms-excel':
                processedData = await parseExcel(buffer);
                break;
            case 'text/csv':
                processedData = await parseCsv(buffer);
                break;
            case 'application/xml':
            case 'text/xml':
                processedData = await parseXml(buffer);
                break;
            case 'application/pdf':
                processedData = await parsePdf(buffer);
                break;
            default:
                throw new Error('Unsupported file type');
        }
        // 清洗和标准化数据
        processedData.data = cleanData(processedData.data);
        // 验证和提取财务指标
        processedData.data = processedData.data.map((row, index) => {
            try {
                const metrics = validateRequiredMetrics(row);
                return {
                    ...row,
                    financialMetrics: metrics,
                    year: row['年份'] || row['年度'] || `Year ${index + 1}`
                };
            }
            catch (error) {
                console.warn(`Row processing warning for year ${row['年份'] || row['年度'] || index}:`, error.message);
                return {
                    ...row,
                    financialMetrics: null,
                    processingError: error.message
                };
            }
        });
        // 添加财务指标相关的元数据
        processedData.metadata = {
            ...processedData.metadata,
            hasFinancialMetrics: processedData.data.some(row => row.financialMetrics !== null),
            missingMetricsRows: processedData.data.filter(row => row.financialMetrics === null).length,
            totalRows: processedData.data.length
        };
        return processedData;
    }
    catch (error) {
        console.error('Error processing file:', error);
        throw error;
    }
}
export { financialMetricsMapping, validateRequiredMetrics, calculateWorkingCapital, findValue };
