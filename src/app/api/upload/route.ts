import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { parseFile } from '@/lib/parsers';
import { processFile } from '@/lib/parsers';

// 创建uploads目录（如果不存在）
const createUploadsDir = async () => {
  const uploadsDir = path.join(process.cwd(), 'uploads');
  try {
    await fs.access(uploadsDir);
  } catch {
    await fs.mkdir(uploadsDir);
  }
  return uploadsDir;
};

export async function POST(req: NextRequest) {
  try {
    const uploadsDir = await createUploadsDir();
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // 验证文件类型
    const allowedTypes = [
      'application/pdf',
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/xml',
      'text/xml'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '不支持的文件类型' },
        { status: 400 }
      );
    }

    // 将文件保存到uploads目录
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filePath = path.join(uploadsDir, file.name);
    await fs.writeFile(filePath, buffer);

    // 读取文件内容
    const fileContent = await file.text();
    const fileType = file.name.split('.').pop()?.toLowerCase();

    // 首先使用AI辅助解析
    const aiResponse = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileContent,
        fileType,
      }),
    });

    const aiResult = await aiResponse.json();

    // 使用传统解析方法
    const processedData = await parseFile(buffer, file.type);

    // 合并AI解析结果和传统解析结果
    const combinedResults = {
      aiAnalysis: aiResult,
      traditionalParsing: processedData,
      // 如果AI解析成功，使用AI的结果作为首选
      finalMetrics: aiResult.metrics || processedData
    };

    // 保存处理后的数据
    const processedFilePath = path.join(uploadsDir, `processed_${file.name}.json`);
    await fs.writeFile(processedFilePath, JSON.stringify(combinedResults, null, 2));

    return NextResponse.json({
      success: true,
      message: '文件上传成功',
      data: {
        originalFile: file.name,
        processedFile: `processed_${file.name}.json`,
        metadata: combinedResults.finalMetrics
      }
    });

  } catch (error: any) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
