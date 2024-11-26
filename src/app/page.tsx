'use client';

import React, { useState, Suspense } from 'react';
import { Upload, Button, Card, Steps, message, Spin, Space } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { FinancialDataDisplay } from '@/components/FinancialDataDisplay';
import dynamic from 'next/dynamic';
import APIKeyConfig from '@/components/APIKeyConfig';
import { ClaudeAPI } from '@/lib/claude';
import { parseXLSX } from '@/lib/parsers/xlsxParser';

// 动态导入组件以提高性能
const FCFFModelingForm = dynamic(() => import('@/components/FCFFModelingForm'), {
  loading: () => <Spin />,
  ssr: false,
});

const FCFFCharts = dynamic(() => import('@/components/FCFFCharts'), {
  loading: () => <Spin />,
  ssr: false,
});

const SensitivityAnalysis = dynamic(() => import('@/components/SensitivityAnalysis'), {
  loading: () => <Spin />,
  ssr: false,
});

const MonteCarloSimulation = dynamic(() => import('@/components/MonteCarloSimulation'), {
  loading: () => <Spin />,
  ssr: false,
});

const DataExport = dynamic(() => import('@/components/DataExport'), {
  loading: () => <Spin />,
  ssr: false,
});

interface UploadResponse {
  success: boolean;
  message: string;
  data?: {
    originalFile: string;
    processedFile: string;
    metadata: {
      aiAnalysis?: {
        metrics: any;
        analysis: string;
      };
      traditionalParsing: any;
      finalMetrics: any;
    };
  };
  error?: string;
}

export default function Home() {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [modelingResult, setModelingResult] = useState<any>(null);
  const [currentInputs, setCurrentInputs] = useState<any>(null);
  const [currentProjections, setCurrentProjections] = useState<any>(null);
  const [claudeAPI, setClaudeAPI] = useState<ClaudeAPI | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [processingStatus, setProcessingStatus] = useState<string>('');

  const handleAPIKeySave = (apiKey: string) => {
    setClaudeAPI(new ClaudeAPI(apiKey));
  };

  const handleFileUpload = async (file: File) => {
    try {
      setLoading(true);
      setProcessingStatus('正在上传并分析文件...');
      let result: ParseResult | null = null;

      const buffer = await file.arrayBuffer();
      
      switch (file.type) {
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
          result = await parseXLSX(buffer);
          break;
        case 'text/csv':
          result = await parseCSV(await file.text());
          break;
        case 'application/pdf':
          result = await parsePDF(buffer);
          break;
        default:
          throw new Error('不支持的文件格式');
      }

      if (!result.success || !result.data) {
        throw new Error(result.error || '解析文件失败');
      }

      setParseResult(result);
      setCurrentStep(1);
      message.success('文件解析成功');
    } catch (error) {
      console.error('文件处理错误:', error);
      message.error(error instanceof Error ? error.message : '处理文件时发生错误');
    } finally {
      setLoading(false);
      setProcessingStatus('文件处理完成');
    }
  };

  const handleModelingComplete = (results: any) => {
    setModelingResult(results);
    setCurrentStep(3);
  };

  const handleParameterChange = (newInputs: any) => {
    setCurrentInputs(newInputs);
  };

  const generateSensitivityData = () => {
    if (!modelingResult?.inputs || !modelingResult?.projections) return [];

    const baseInputs = modelingResult.inputs;
    const parameters = [
      { name: '收入增长率', key: 'revenueGrowthRate', range: [-5, -2.5, 0, 2.5, 5] },
      { name: 'EBIT利润率', key: 'ebitMargin', range: [-4, -2, 0, 2, 4] },
      { name: '税率', key: 'taxRate', range: [-3, -1.5, 0, 1.5, 3] },
      { name: '折旧率', key: 'depreciationRate', range: [-2, -1, 0, 1, 2] },
      { name: '资本支出率', key: 'capexRate', range: [-3, -1.5, 0, 1.5, 3] },
      { name: '营运资金变动率', key: 'nwcRate', range: [-2, -1, 0, 1, 2] },
    ];

    const data: any[] = [];
    parameters.forEach(param => {
      param.range.forEach(change => {
        const modifiedInputs = { ...baseInputs };
        modifiedInputs[param.key] = baseInputs[param.key] + change;
        
        // 计算修改后的FCFF
        const lastProjection = calculateFCFF(modifiedInputs)[modifiedInputs.projectionYears - 1];
        const baseProjection = modelingResult.projections[modelingResult.projections.length - 1];
        const impact = ((lastProjection.fcff - baseProjection.fcff) / baseProjection.fcff) * 100;

        data.push({
          parameter: param.name,
          change: `${change >= 0 ? '+' : ''}${change}%`,
          value: modifiedInputs[param.key],
          impact: impact,
        });
      });
    });

    return data;
  };

  const generateMonteCarloData = () => {
    if (!modelingResult?.inputs || !modelingResult?.projections) return [];

    const baseInputs = modelingResult.inputs;
    const data: any[] = [];
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const randomInputs = {
        ...baseInputs,
        revenueGrowthRate: baseInputs.revenueGrowthRate + (Math.random() - 0.5) * 4,
        ebitMargin: baseInputs.ebitMargin + (Math.random() - 0.5) * 3,
        taxRate: baseInputs.taxRate + (Math.random() - 0.5) * 2,
        depreciationRate: baseInputs.depreciationRate + (Math.random() - 0.5) * 1,
        capexRate: baseInputs.capexRate + (Math.random() - 0.5) * 2,
        nwcRate: baseInputs.nwcRate + (Math.random() - 0.5) * 1,
      };

      const projections = calculateFCFF(randomInputs);
      projections.forEach((proj, year) => {
        data.push({
          iteration: i + 1,
          year: year + 1,
          fcff: proj.fcff,
          revenue: proj.revenue,
          ebit: proj.ebit,
          nopat: proj.nopat,
        });
      });
    }

    return data;
  };

  const calculateFCFF = (inputs: any) => {
    const projections = [];
    let revenue = modelingResult.projections[0].revenue;

    for (let year = 1; year <= inputs.projectionYears; year++) {
      revenue *= (1 + inputs.revenueGrowthRate / 100);
      const ebit = revenue * (inputs.ebitMargin / 100);
      const tax = ebit * (inputs.taxRate / 100);
      const nopat = ebit - tax;
      const depreciation = revenue * (inputs.depreciationRate / 100);
      const capex = revenue * (inputs.capexRate / 100);
      const nwcChange = revenue * (inputs.nwcRate / 100);
      const fcff = nopat + depreciation - capex - nwcChange;

      projections.push({
        revenue,
        ebit,
        nopat,
        depreciation,
        capex,
        nwcChange,
        fcff,
      });
    }

    return projections;
  };

  const steps = [
    {
      title: '上传文件',
      description: '上传年报或CSV文件',
    },
    {
      title: '数据提取',
      description: 'AI辅助数据提取',
    },
    {
      title: 'FCFF建模',
      description: '进行现金流预测',
    },
    {
      title: '可视化展示',
      description: '查看分析结果',
    },
  ];

  return (
    <main className="min-h-screen p-4 md:p-8 bg-gray-50">
      <Card className="max-w-6xl mx-auto">
        <APIKeyConfig onSave={handleAPIKeySave} />
        
        <Steps
          current={currentStep}
          items={steps}
          className="mb-8"
        />

        <div className="relative min-h-[400px]">
          <Spin spinning={loading}>
            {currentStep === 0 && (
              <Upload
                accept=".csv,.pdf,.xlsx"
                fileList={fileList}
                beforeUpload={handleFileUpload}
                onRemove={() => {
                  setFileList([]);
                  return true;
                }}
              >
                <Button icon={<UploadOutlined />}>上传财务报表</Button>
              </Upload>
            )}

            {currentStep === 1 && parseResult && (
              <Suspense fallback={<Spin />}>
                <FinancialDataDisplay data={parseResult.data} />
              </Suspense>
            )}

            {currentStep === 2 && parseResult && (
              <Suspense fallback={<Spin />}>
                <FCFFModelingForm
                  initialData={parseResult.data}
                  onComplete={handleModelingComplete}
                />
              </Suspense>
            )}

            {currentStep === 3 && modelingResult && (
              <div className="space-y-6">
                <Suspense fallback={<Spin />}>
                  <FCFFCharts projections={modelingResult.projections} />
                </Suspense>

                <Suspense fallback={<Spin />}>
                  <SensitivityAnalysis
                    baseInputs={modelingResult.inputs}
                    baseResult={modelingResult.projections[modelingResult.projections.length - 1]?.fcff || 0}
                    onParameterChange={handleParameterChange}
                  />
                </Suspense>

                <Suspense fallback={<Spin />}>
                  <MonteCarloSimulation
                    baseInputs={modelingResult.inputs}
                    baseProjections={modelingResult.projections}
                    iterations={1000}
                  />
                </Suspense>

                <Suspense fallback={<Spin />}>
                  <DataExport
                    inputs={modelingResult.inputs}
                    projections={modelingResult.projections}
                    sensitivityData={generateSensitivityData()}
                    monteCarloResults={generateMonteCarloData()}
                  />
                </Suspense>

                <Space className="mt-4 justify-end w-full">
                  <Button onClick={() => setCurrentStep(2)}>
                    修改参数
                  </Button>
                  <Button type="primary" onClick={() => setCurrentStep(0)}>
                    新建模型
                  </Button>
                </Space>
              </div>
            )}
          </Spin>
        </div>

        {/* 处理状态显示 */}
        {processingStatus && (
          <div className="mt-4 p-4 bg-gray-100 rounded-lg">
            <p className="text-gray-700">{processingStatus}</p>
          </div>
        )}

        {/* AI分析结果显示 */}
        {aiAnalysis && (
          <div className="mt-6 p-6 bg-white rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">AI 分析结果</h3>
            <div className="whitespace-pre-wrap text-gray-700">
              {aiAnalysis}
            </div>
          </div>
        )}
      </Card>
    </main>
  );
}
