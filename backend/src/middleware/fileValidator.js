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
  const isValidDocx = (ext === 'docx' || ext === 'doc') && (
    typeInfo?.mime === 'application/zip' || 
    typeInfo?.mime === 'application/x-zip-compressed' ||
    typeInfo?.mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    typeInfo?.mime === 'application/msword'
  );

  // Images (PNG, JPG, JPEG, WEBP)
  const isValidImage = ['png', 'jpg', 'jpeg', 'webp'].includes(ext) && (
    typeInfo?.mime?.startsWith('image/') ||
    typeInfo?.mime === 'image/png' ||
    typeInfo?.mime === 'image/jpeg' ||
    typeInfo?.mime === 'image/webp'
  );
  
  if (!isValidPdf && !isValidDocx && !isValidImage) {
    return res.status(400).json({ error: 'Invalid file type. Please upload a valid PDF, DOCX, or Image file (PNG, JPG, WEBP).' });
  }

  // Double-check size server-side (8MB limit)
  if (req.file.size > 8 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large. Maximum size is 8MB.' });
  }

  next();
};
