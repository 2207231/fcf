import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { fileContent, fileType } = await req.json();

    const message = await anthropic.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 4096,
      messages: [{
        role: "user",
        content: `你是一个专业的财务数据分析助手。请帮我分析以下${fileType}格式的财务数据，
        提取关键的财务指标（包括但不限于：营业收入、EBIT、净利润、折旧摊销、资本支出、营运资本等），
        并返回一个JSON格式的结果。如果发现任何异常或需要注意的地方，请在response中说明。
        
        数据内容：
        ${fileContent}`
      }]
    });

    // 解析AI响应
    const aiResponse = message.content[0].text;
    let parsedMetrics;
    try {
      // 尝试从AI响应中提取JSON部分
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedMetrics = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in AI response");
      }
    } catch (error) {
      console.error("Error parsing AI response:", error);
      return NextResponse.json({
        error: "Failed to parse AI response",
        rawResponse: aiResponse
      }, { status: 422 });
    }

    return NextResponse.json({
      metrics: parsedMetrics,
      analysis: aiResponse
    });

  } catch (error: any) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
