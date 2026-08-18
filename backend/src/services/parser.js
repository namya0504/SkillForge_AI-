import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

export async function extractText(buffer, mimeType) {
  let text = '';
  if (mimeType === 'application/pdf' || mimeType === 'pdf') {
    const data = await pdf(buffer);
    text = data.text || '';
  } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimeType === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value || '';
  } else {
    throw new Error('Unsupported file type. Only PDF and DOCX files are accepted.');
  }

  if (!text || text.trim().length < 20) {
    throw new Error('Could not extract readable text from this file. It appears to be a scanned image or empty. Please upload a text-based PDF or DOCX file.');
  }

  return text;
}
