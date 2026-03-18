const { uploadBufferToCloudinary, publicUrlForLocalFile } = require('../middleware/upload');

async function uploadImage(req, res) {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    if (process.env.USE_CLOUDINARY === 'true') {
      const url = await uploadBufferToCloudinary(req.file.buffer, 'perfumes');
      return res.json({ url });
    }
    const filename = req.file.filename;
    return res.json({ url: publicUrlForLocalFile(filename) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: e.message || 'Upload failed' });
  }
}

module.exports = { uploadImage };
