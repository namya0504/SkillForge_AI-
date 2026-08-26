import pdf from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';

/**
 * Robust, resilient multi-format document parser
 * Handles text PDFs, DOCX, DOC, image files, and scanned documents
 */
export async function extractText(buffer, mimeType) {
  let text = '';
  const isPdf = mimeType === 'application/pdf' || mimeType === 'pdf';
  const isDocx = mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
              || mimeType === 'docx' 
              || mimeType === 'application/zip'
              || mimeType === 'application/x-zip-compressed'
              || mimeType === 'application/msword';
  const isImage = mimeType?.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp'].includes(mimeType);

  if (isImage) {
    return {
      text: '',
      isScanned: true,
      isImage: true,
      mimeType: mimeType?.startsWith('image/') ? mimeType : `image/${mimeType}`
    };
  }

  if (isPdf) {
    try {
      const data = await pdf(buffer);
      text = data.text || '';
    } catch (pdfErr) {
      console.warn('PDF text parse warning, marking for multimodal OCR fallback:', pdfErr.message);
      return {
        text: '',
        isScanned: true,
        mimeType: 'application/pdf'
      };
    }
  } else if (isDocx) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value || '';
    } catch (docxErr) {
      console.warn('Mammoth zip extraction warning, attempting raw buffer text fallback:', docxErr.message);
      text = buffer.toString('utf-8').replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F]/g, ' ');
    }
  }

  const cleanText = (text || '').trim();
  const isScanned = cleanText.length < 25;

  return {
    text: cleanText,
    isScanned,
    mimeType: isPdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
}
