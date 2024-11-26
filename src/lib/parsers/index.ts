import { ParseResult } from '../types';
import { parsePDF } from './pdfParser';
import { parseCSV } from './csvParser';
import { parseExcel } from './excelParser';
import { parseXBRL } from './xbrlParser';

export async function parseFile(file: File, filePath: string): Promise<ParseResult> {
  const fileType = file.name.split('.').pop()?.toLowerCase();

  switch (fileType) {
    case 'pdf':
      return await parsePDF(filePath);
    case 'csv':
      return await parseCSV(filePath);
    case 'xlsx':
    case 'xls':
      return await parseExcel(filePath);
    case 'xbrl':
      return await parseXBRL(filePath);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}
