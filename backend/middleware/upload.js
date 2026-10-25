const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + ext);
  }
});

function fileFilter(req, file, cb) {
  const allowed = /\.(jpe?g|png|webp|heic|heif|gif)$/i;
  const mimeAllowed = /image\/(jpeg|png|webp|heic|heif|gif)/i;
  const okExt = allowed.test(path.extname(file.originalname).toLowerCase());
  const okMime = !file.mimetype || mimeAllowed.test(file.mimetype) || file.mimetype.startsWith('image/');

  if (okExt || okMime) {
    return cb(null, true);
  }
  cb(new Error('Only image files (JPG, PNG, WEBP, HEIC) are supported.'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max upload
});

module.exports = upload;
