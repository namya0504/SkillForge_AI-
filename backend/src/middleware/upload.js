import multer from 'multer';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ext = file.originalname.split('.').pop().toLowerCase();
  const validExtensions = ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'webp'];
  if (validExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Accepted formats: PDF, DOCX, PNG, JPG, WEBP.'), false);
  }
};

export const uploadSingle = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024 // 8MB limit
  },
  fileFilter
}).single('resume');
