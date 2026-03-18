const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const memoryStorage = multer.memoryStorage();

function getUpload() {
  const useCloud = process.env.USE_CLOUDINARY === 'true';
  return multer({
    storage: useCloud ? memoryStorage : diskStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const ok = /^image\/(jpeg|png|webp|gif)/.test(file.mimetype);
      if (ok) cb(null, true);
      else cb(new Error('Only image files allowed'), false);
    },
  });
}

async function uploadBufferToCloudinary(buffer, folder = 'perfumes') {
  if (process.env.USE_CLOUDINARY !== 'true') return null;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({ folder }, (err, result) => {
      if (err) reject(err);
      else resolve(result.secure_url);
    });
    stream.end(buffer);
  });
}

function publicUrlForLocalFile(filename) {
  const base = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}`;
  return `${base.replace(/\/$/, '')}/uploads/${filename}`;
}

module.exports = { getUpload, uploadBufferToCloudinary, publicUrlForLocalFile, uploadsDir };
