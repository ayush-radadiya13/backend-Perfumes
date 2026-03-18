/**
 * Optional Cloudinary upload. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.
 */
let _configured = false;
let cloudinary = null;

function init() {
  if (_configured) return !!cloudinary;
  _configured = true;
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    return false;
  }
  try {
    // eslint-disable-next-line global-require
    cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    });
    return true;
  } catch {
    return false;
  }
}

exports.isEnabled = () => init();

exports.uploadBuffer = (buffer, folder = 'perfumes') =>
  new Promise((resolve, reject) => {
    if (!init()) {
      return reject(new Error('Cloudinary not configured'));
    }
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (err, result) => (err ? reject(err) : resolve(result.secure_url))
    );
    uploadStream.end(buffer);
  });

exports.uploadMany = async (files) => {
  if (!files?.length) return [];
  const urls = [];
  for (const file of files) {
    if (file.buffer) {
      urls.push(await exports.uploadBuffer(file.buffer));
    }
  }
  return urls;
};
