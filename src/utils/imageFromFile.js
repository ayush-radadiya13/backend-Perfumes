const cloudinary = require('../services/cloudinary');

async function imageFromFile(file, folder = 'uploads') {
  if (!file) return '';
  if (file.buffer && cloudinary.isEnabled()) {
    return cloudinary.uploadBuffer(file.buffer, folder);
  }
  if (file.buffer) {
    throw new Error('Image upload: configure Cloudinary or use local disk (unset Cloudinary env)');
  }
  return `/uploads/${file.filename}`;
}

module.exports = imageFromFile;
