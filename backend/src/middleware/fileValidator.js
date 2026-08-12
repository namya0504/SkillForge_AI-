import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fileType = require('file-type');

export const validateFileType = async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const allowedMimes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

  // Check magic bytes
  const typeInfo = await fileType.fromBuffer(req.file.buffer);
  
  // DOCX files are detected as 'application/zip' by magic bytes, so also check extension
  const ext = req.file.originalname.toLowerCase().split('.').pop();
  const isValidDocx = ext === 'docx' && typeInfo?.mime === 'application/zip';
  const isValidPdf = typeInfo?.mime === 'application/pdf';
  
  if (!isValidPdf && !isValidDocx) {
    return res.status(400).json({ error: 'Invalid file type. Only PDF and DOCX files are accepted.' });
  }

  // Double-check size server-side
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }

  next();
};
