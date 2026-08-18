import fileType from 'file-type';

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
  
  // DOCX files are zip archives, so magic bytes return 'application/zip' or openxmlformats MIME type
  const ext = req.file.originalname.toLowerCase().split('.').pop();
  const isValidDocx = ext === 'docx' && (
    !typeInfo || 
    typeInfo?.mime === 'application/zip' || 
    typeInfo?.mime === 'application/x-zip-compressed' ||
    typeInfo?.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  );
  const isValidPdf = ext === 'pdf' && (!typeInfo || typeInfo?.mime === 'application/pdf');
  
  if (!isValidPdf && !isValidDocx) {
    return res.status(400).json({ error: 'Invalid file type. Only PDF and DOCX files are accepted.' });
  }

  // Double-check size server-side
  if (req.file.size > 5 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
  }

  next();
};
