import axios from 'axios';

const CLAUDE_API_BASE_URL = 'https://api.anthropic.com/v1';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  completion: string;
  stop_reason: string;
  model: string;
}

export class ClaudeAPI {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyze(messages: ClaudeMessage[]): Promise<string> {
    try {
      const response = await axios.post(
        `${CLAUDE_API_BASE_URL}/messages`,
        {
          model: 'claude-3-opus-20240229',
          max_tokens: 4096,
          messages: messages,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
        }
      );

      return response.data.content[0].text;
    } catch (error: any) {
      if (error.response) {
        throw new Error(`Claude API 错误: ${error.response.data.error.message}`);
      }
      throw new Error('调用 Claude API 时发生错误');
    }
  }

  async analyzeFinancials(financialData: any): Promise<string> {
    const message = {
      role: 'user' as const,
      content: `请分析以下财务数据并提供见解：${JSON.stringify(financialData, null, 2)}`,
    };

    return this.analyze([message]);
  }

  async generateProjections(historicalData: any, assumptions: any): Promise<string> {
    const message = {
      role: 'user' as const,
      content: `
        基于以下历史数据和假设，请生成未来5年的财务预测：
        历史数据：${JSON.stringify(historicalData, null, 2)}
        假设条件：${JSON.stringify(assumptions, null, 2)}
      `,
    };

    return this.analyze([message]);
  }

  async analyzeSensitivity(sensitivityData: any): Promise<string> {
    const message = {
      role: 'user' as const,
      content: `
        请分析以下敏感性分析结果，并提供关键见解：
        ${JSON.stringify(sensitivityData, null, 2)}
      `,
    };

    return this.analyze([message]);
  }

  async analyzeMonteCarloResults(results: any): Promise<string> {
    const message = {
      role: 'user' as const,
      content: `
        请分析以下蒙特卡洛模拟结果，并提供关键见解：
        ${JSON.stringify(results, null, 2)}
      `,
    };

    return this.analyze([message]);
  }
}
