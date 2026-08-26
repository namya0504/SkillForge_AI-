import fileType from 'file-type';

export const validateFileType = async (req, res, next) => {
  if (!req.file || !req.file.buffer) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const ext = req.file.originalname.toLowerCase().split('.').pop();

  // Check magic bytes
  const typeInfo = await fileType.fromBuffer(req.file.buffer);
  
  // Valid PDF must start with %PDF- header or have application/pdf MIME
  const isPdfHeader = req.file.buffer.toString('utf-8', 0, 5).startsWith('%PDF-');
  const isValidPdf = ext === 'pdf' && (isPdfHeader || typeInfo?.mime === 'application/pdf');

  // DOCX files are zip archives, so magic bytes return application/zip or openxmlformats MIME type
  const isValidDocx = ext === 'docx' && (
    typeInfo?.mime === 'application/zip' || 
    typeInfo?.mime === 'application/x-zip-compressed' ||
    typeInfo?.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  
  if (!isValidPdf && !isValidDocx) {
    return res.status(400).json({ error: 'Invalid file type. Only PDF and DOCX files are accepted.' });
  }

  // Double-check size server-side
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }

  next();
};
