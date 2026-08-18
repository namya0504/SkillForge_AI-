import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

export async function extractText(buffer, mimeType) {
  let text = '';
  const isPdf = mimeType === 'application/pdf' || mimeType === 'pdf';
  const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
              || mimeType === 'docx' 
              || mimeType === 'application/zip'
              || mimeType === 'application/x-zip-compressed'
              || mimeType === 'application/msword';

  if (isPdf) {
    const data = await pdf(buffer);
    text = data.text || '';
  } else if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
    } catch (docxErr) {
      console.warn('Mammoth zip extraction warning, attempting raw buffer text fallback:', docxErr.message);
      text = buffer.toString('utf-8').replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, ' ');
    }
  } else {
    throw new Error('Unsupported file type. Only PDF and DOCX files are accepted.');
  }

  if (!text || text.trim().length < 20) {
    throw new Error('Could not extract readable text from this file. It appears to be a scanned image or empty. Please upload a text-based PDF or DOCX file.');
  }

  return text;
}
