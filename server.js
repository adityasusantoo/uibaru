/**
 * ADITYA .AI — Backend Server (Versi Normal & Stabil)
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_UPLOAD_MB = 115;

app.use(cors());
app.use(express.json({ limit: '200mb' }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
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

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 2 } });

function scheduleCleanup(files) {
  if (!files) return;
  setTimeout(async () => {
    const allFiles = Array.isArray(files) ? files : Object.values(files).flat();
    for (const file of allFiles) {
      try { await fs.remove(file.path); console.log('[CLEANUP] Dihapus:', file.filename); } catch (e) {}
    }
  }, 15 * 60 * 1000);
}

async function immediateCleanup(files) {
  if (!files) return;
  const allFiles = Array.isArray(files) ? files : Object.values(files).flat();
  for (const file of allFiles) {
    try { await fs.remove(file.path); } catch (e) {}
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
    'kling-v3-pro': 'kling-v3-pro'
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

app.post('/api/generate-motion', upload.fields([{ name: 'image', maxCount: 1 }, { name: 'video', maxCount: 1 }]), async (req, res) => {
  const files = req.files;
  let apiKey = extractApiKey(req) || process.env.MAGNIFIC_API_KEY;

  if (!apiKey) {
    await immediateCleanup(files);
    return res.status(401).json({ success: false, error: 'API Key diperlukan.', statusCode: 401 });
  }

  try {
    const jsonBody = {};
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.get('host');
    const baseUrl = `${protocol}://${host}`;

    if (files && files.image && files.image[0]) {
      jsonBody.image_url = `${baseUrl}/uploads/${files.image[0].filename}`;
    } else {
      await immediateCleanup(files);
      return res.status(400).json({ success: false, error: 'Image reference wajib diupload.', statusCode: 400 });
    }

    if (files && files.video && files.video[0]) {
      jsonBody.video_url = `${baseUrl}/uploads/${files.video[0].filename}`;
    }

    if (req.body.prompt && req.body.prompt.trim()) jsonBody.prompt = req.body.prompt.trim();
    jsonBody.character_orientation = "video";
    
    const cfgScale = parseFloat(req.body.cfg_scale);
    if (!isNaN(cfgScale)) jsonBody.cfg_scale = cfgScale;

    const mappedModel = mapModelName(req.body.model || 'kling-v2-standard');
    const apiUrl = getApiEndpoint(mappedModel);

    const magnificRes = await axios.post(apiUrl, jsonBody, {
      headers: { 'x-magnific-api-key': apiKey, 'Content-Type': 'application/json' },
      maxContentLength: Infinity, maxBodyLength: Infinity, timeout: 120000
    });

    scheduleCleanup(files);
    return res.status(200).json({ success: true, data: magnificRes.data });

  } catch (error) {
    await immediateCleanup(files);
    const statusCode = error.response?.status || 500;
    const errorMsg = error.response?.data?.message || error.message || 'Server error';
    return res.status(statusCode).json({ success: false, error: errorMsg, statusCode });
  }
});

app.get('/api/task-status/:taskId', async (req, res) => {
  let apiKey = extractApiKey(req) || process.env.MAGNIFIC_API_KEY;
  if (!apiKey) return res.status(401).json({ success: false, error: 'API Key diperlukan.', statusCode: 401 });

  const taskId = req.params.taskId;
  const endpointsToCheck = [
    `https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std/${taskId}`,
    `https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro/${taskId}`,
    `https://api.magnific.com/v1/ai/video/kling-v2-6-motion-control-std/${taskId}`,
    `https://api.magnific.com/v1/ai/video/kling-v2-6-motion-control-pro/${taskId}`,
    `https://api.magnific.com/v1/ai/video/${taskId}`
  ];

  if (req.query.model) {
    const mappedModel = mapModelName(req.query.model);
    const preferredUrl = `${getApiEndpoint(mappedModel)}/${taskId}`;
    const index = endpointsToCheck.indexOf(preferredUrl);
    if (index > -1) endpointsToCheck.splice(index, 1);
    endpointsToCheck.unshift(preferredUrl);
  }

  for (const url of endpointsToCheck) {
    try {
      const magnificRes = await axios.get(url, { headers: { 'x-magnific-api-key': apiKey }, timeout: 20000 });
      return res.status(200).json({ success: true, data: magnificRes.data });
    } catch (error) {
      if (error.response && error.response.status !== 404) {
        const statusCode = error.response.status;
        const errorMsg = error.response.data?.message || 'Gagal mengecek status';
        return res.status(statusCode).json({ success: false, error: errorMsg, statusCode });
      }
    }
  }

  return res.status(404).json({ success: false, error: 'Task ID tidak ditemukan.', statusCode: 404 });
});

app.listen(PORT, () => {
  console.log('\n  ADITYA .AI Server Running on Port:' + PORT + '\n');
});
