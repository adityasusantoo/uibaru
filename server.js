/**
 * ADITYA .AI — Backend Server
 * Proxy ke Magnific API dengan Multipart Form-Data (Upload Langsung)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB) || 115;

app.use(cors());
app.use(express.json({ limit: '200mb' }));
app.use(express.static(path.join(__dirname)));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedImage = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideo = ['video/mp4', 'video/quicktime', 'video/webm'];
  if (file.fieldname === 'image' && allowedImage.includes(file.mimetype)) cb(null, true);
  else if (file.fieldname === 'video' && allowedVideo.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Tipe file tidak didukung: ' + file.mimetype), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 2 }
});

async function cleanupFiles(files) {
  if (!files) return;
  const allFiles = Array.isArray(files) ? files : Object.values(files).flat();
  for (const file of allFiles) {
    try { await fs.remove(file.path); } catch (e) { console.warn('Cleanup:', e.message); }
  }
}

function extractApiKey(req) {
  const auth = req.headers.authorization;
  if (!auth) return null;
  const parts = auth.split(' ');
  return parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : auth;
}

function mapModelName(model) {
  const modelMap = {
    'kling-v2-standard': 'kling-v2-standard',
    'kling-v2-pro': 'kling-v2-pro',
    'kling-v3-standard': 'kling-v3-standard',
    'kling-v3-pro': 'kling-v3-pro',
    'kling-2.6-std': 'kling-v2-standard',
    'kling-2.6-pro': 'kling-v2-pro',
    'kling-3.0-std': 'kling-v3-standard',
    'kling-3.0-pro': 'kling-v3-pro',
  };
  return modelMap[model] || model;
}

function getApiEndpoint(modelName) {
  const endpoints = {
    'kling-v2-standard': 'https://api.magnific.com/v1/ai/video/kling-v2-6-motion-control-std',
    'kling-v2-pro': 'https://api.magnific.com/v1/ai/video/kling-v2-6-motion-control-pro',
    'kling-v3-standard': 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std',
    'kling-v3-pro': 'https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro'
  };
  return endpoints[modelName] || endpoints['kling-v2-standard'];
}

/* POST /api/generate-motion */
app.post('/api/generate-motion', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  const files = req.files;
  let apiKey = extractApiKey(req) || process.env.MAGNIFIC_API_KEY;

  if (!apiKey) {
    await cleanupFiles(files);
    return res.status(401).json({ success: false, error: 'API Key diperlukan.', statusCode: 401 });
  }

  try {
    const formData = new FormData();

    if (files && files.image && files.image[0]) {
      const imgFile = files.image[0];
      console.log('Attaching image file...', imgFile.originalname);
      formData.append('image', fs.createReadStream(imgFile.path));
    } else {
      await cleanupFiles(files);
      return res.status(400).json({ success: false, error: 'Image reference wajib diupload.', statusCode: 400 });
    }

    if (files && files.video && files.video[0]) {
      const vidFile = files.video[0];
      console.log('Attaching video file...', vidFile.originalname);
      formData.append('video', fs.createReadStream(vidFile.path));
    }

    if (req.body.prompt && req.body.prompt.trim()) {
      formData.append('prompt', req.body.prompt.trim());
    }

    formData.append('character_orientation', 'video');

    const cfgScale = parseFloat(req.body.cfg_scale);
    if (!isNaN(cfgScale)) {
      formData.append('cfg_scale', cfgScale);
    }

    const mappedModel = mapModelName(req.body.model || 'kling-v2-standard');
    const apiUrl = getApiEndpoint(mappedModel);

    console.log('--- Request ke Magnific API (Multipart Upload) ---');
    console.log('Endpoint:', apiUrl);
    console.log('Model:', mappedModel);
    console.log('--------------------------------------------------');

    const magnificRes = await axios.post(
      apiUrl,
      formData,
      {
        headers: { 
          'x-magnific-api-key': apiKey, 
          ...formData.getHeaders() 
        },
        maxContentLength: Infinity, 
        maxBodyLength: Infinity, 
        timeout: 120000
      }
    );

    await cleanupFiles(files);
    console.log('Magnific Response:', magnificRes.status);
    return res.status(200).json({ success: true, data: magnificRes.data });

  } catch (error) {
    await cleanupFiles(files);
    
    console.error('=== Magnific API Error ===');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data || {}).substring(0, 1000));
    console.error('===========================');

    const statusCode = error.response?.status || 500;
    let errorMsg = 'Server error';

    if (error.response?.data) {
      const errData = error.response.data;
      if (errData.message && errData.invalid_params) {
        errorMsg = errData.message + ' — ' + errData.invalid_params.map(p => p.field + ': ' + p.reason).join('; ');
      } else if (errData.detail) {
        errorMsg = Array.isArray(errData.detail) ? errData.detail.map(d => (d.loc ? d.loc.join(' > ') + ': ' : '') + d.msg).join('; ') : String(errData.detail);
      } else if (errData.error) {
        errorMsg = typeof errData.error === 'string' ? errData.error : JSON.stringify(errData.error);
      } else if (errData.message) {
        errorMsg = String(errData.message);
      } else {
        errorMsg = JSON.stringify(errData).substring(0, 300);
      }
    } else {
      errorMsg = error.message || 'Server error';
    }

    return res.status(statusCode).json({ success: false, error: errorMsg, statusCode: statusCode });
  }
});

/* GET /api/task-status/:taskId */
app.get('/api/task-status/:taskId', async (req, res) => {
  let apiKey = extractApiKey(req) || process.env.MAGNIFIC_API_KEY;
  if (!apiKey) return res.status(401).json({ success: false, error: 'API Key diperlukan.', statusCode: 401 });

  try {
    const model = req.query.model || 'kling-v2-standard';
    const statusApiUrl = `${getApiEndpoint(model)}/${req.params.taskId}`;

    const magnificRes = await axios.get(
      statusApiUrl,
      { headers: { 'x-magnific-api-key': apiKey }, timeout: 30000 }
    );

    console.log('=== Task Status ===');
    console.log('Task ID:', req.params.taskId, '| Model:', model);
    console.log('===================');

    return res.status(200).json({ success: true, data: magnificRes.data });

  } catch (error) {
    console.error('Status Check Error:', error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    const errorMsg = error.response?.data?.error || error.response?.data?.message || error.response?.data?.detail || error.message || 'Gagal mengecek status';
    return res.status(statusCode).json({ success: false, error: typeof errorMsg === 'object' ? JSON.stringify(errorMsg) : errorMsg, statusCode: statusCode });
  }
});

/* Error Handler */
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ success: false, error: 'File melebihi batas ' + MAX_UPLOAD_MB + 'MB', statusCode: 413 });
    return res.status(400).json({ success: false, error: 'Upload error: ' + err.message, statusCode: 400 });
  }
  if (err) return res.status(500).json({ success: false, error: err.message || 'Server error', statusCode: 500 });
  next();
});

app.listen(PORT, () => {
  console.log('\n  ADITYA .AI Server Running on http://localhost:' + PORT + '\n');
});
