import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = file.originalname.split('.').pop().toLowerCase();
  if (ext === 'pdf' || ext === 'docx') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF and DOCX files are accepted.'), false);
  }
};

export const uploadSingle = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter
}).single('resume');
