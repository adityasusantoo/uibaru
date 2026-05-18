/**
 * ADITYA .AI — Backend Server
 * Mendukung Penuh: Kling V2 Standard, Kling V2 Pro, Kling V3 Standard, Kling V3 Pro
 * Fitur: Auto HTTPS File Hosting, Multi-Endpoint Status Scan Matrix, & Proxy Support (Bypass 403)
 * FIX: Added Rate Limiter & Smart Polling to prevent IP Block (403)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const rateLimit = require('express-rate-limit'); // Tambahkan Rate Limiter
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_UPLOAD_MB = parseInt(process.env.MAX_UPLOAD_MB) || 115;

// Konfigurasi Instansiasi Proxy Agent secara Dinamis
const proxyUrl = process.env.PROXY_URL; 
const proxyAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

if (proxyAgent) {
  console.log('[PROXY] Sistem mendeteksi PROXY_URL. Sesi request ke Magnific dialihkan via Proxy.');
} else {
  console.log('[PROXY] Berjalan tanpa proxy. Menggunakan koneksi IP default server.');
}

app.use(cors());
app.use(express.json({ limit: '200mb' }));

// Menyajikan folder uploads secara publik
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

// Rate Limiter untuk mencegah frontend polling terlalu cepat (Maks 6 request per 15 detik)
const statusLimiter = rateLimit({
  windowMs: 15 * 1000, // 15 detik
  max: 6, // Maksimal 6 pengecekan dalam 15 detik
  message: { success: false, error: 'Polling terlalu cepat. Coba lagi beberapa saat.', statusCode: 429 },
  standardHeaders: true,
  legacyHeaders: false,
});

// Helper function untuk delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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

function scheduleCleanup(files) {
  if (!files) return;
  const delayMs = 15 * 60 * 1000; 
  setTimeout(async () => {
    const allFiles = Array.isArray(files) ? files : Object.values(files).flat();
    for (const file of allFiles) {
      try { await fs.remove(file.path); console.log('[CLEANUP] File berhasil dihapus:', file.filename); } 
      catch (e) { console.warn('[CLEANUP] Gagal menghapus file:', e.message); }
    }
  }, delayMs);
}

async function immediateCleanup(files) {
  if (!files) return;
  const allFiles = Array.isArray(files) ? files : Object.values(files).flat();
  for (const file of allFiles) {
    try { await fs.remove(file.path); } catch (e) { }
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

/* POST /api/generate-motion */
app.post('/api/generate-motion', upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
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
      const imgFile = files.image[0];
      jsonBody.image_url = `${baseUrl}/uploads/${imgFile.filename}`;
      console.log('[UPLOAD] Image URL Hosted:', jsonBody.image_url);
    } else {
      await immediateCleanup(files);
      return res.status(400).json({ success: false, error: 'Image reference wajib diupload.', statusCode: 400 });
    }

    if (files && files.video && files.video[0]) {
      const vidFile = files.video[0];
      jsonBody.video_url = `${baseUrl}/uploads/${vidFile.filename}`;
      console.log('[UPLOAD] Video URL Hosted:', jsonBody.video_url);
    }

    if (req.body.prompt && req.body.prompt.trim()) {
      jsonBody.prompt = req.body.prompt.trim();
    }

    jsonBody.character_orientation = "video";

    const cfgScale = parseFloat(req.body.cfg_scale);
    if (!isNaN(cfgScale)) {
      jsonBody.cfg_scale = cfgScale;
    }

    const mappedModel = mapModelName(req.body.model || 'kling-v2-standard');
    const apiUrl = getApiEndpoint(mappedModel);

    console.log('--- Requesting Magnific Kling Generation ---');
    console.log('Target API:', apiUrl);
    console.log('Using Proxy:', !!proxyAgent);
    console.log('---------------------------------------------');

    const axiosConfig = {
      headers: { 
        'x-magnific-api-key': apiKey, 
        'Content-Type': 'application/json' 
      },
      maxContentLength: Infinity, 
      maxBodyLength: Infinity, 
      timeout: 120000
    };

    if (proxyAgent) {
      axiosConfig.httpsAgent = proxyAgent;
    }

    const magnificRes = await axios.post(apiUrl, jsonBody, axiosConfig);

    scheduleCleanup(files);
    console.log('[API_RESPONSE] Success Status:', magnificRes.status);
    return res.status(200).json({ success: true, data: magnificRes.data });

  } catch (error) {
    await immediateCleanup(files);
    console.error('=== Magnific API Error ===');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data || {}));
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

/* GET /api/task-status/:taskId - DILINDUNGI RATE LIMITER */
app.get('/api/task-status/:taskId', statusLimiter, async (req, res) => {
  let apiKey = extractApiKey(req) || process.env.MAGNIFIC_API_KEY;
  if (!apiKey) return res.status(401).json({ success: false, error: 'API Key diperlukan.', statusCode: 401 });

  const taskId = req.params.taskId;

  let endpointsToCheck = [
    `https://api.magnific.com/v1/ai/video/kling-v3-motion-control-std/${taskId}`,
    `https://api.magnific.com/v1/ai/video/kling-v3-motion-control-pro/${taskId}`,
    `https://api.magnific.com/v1/ai/video/kling-v2-6-motion-control-std/${taskId}`,
    `https://api.magnific.com/v1/ai/video/kling-v2-6-motion-control-pro/${taskId}`,
    `https://api.magnific.com/v1/ai/video/${taskId}`
  ];

  // OPTIMASI PENTING: Jika frontend mengirim model, HANYA cek endpoint model tersebut!
  // Ini mencegah 4 request tidak perlu yang memicu blokir IP.
  if (req.query.model) {
    const mappedModel = mapModelName(req.query.model);
    const preferredUrl = `${getApiEndpoint(mappedModel)}/${taskId}`;
    endpointsToCheck = [preferredUrl]; // Override array, hanya cek 1 endpoint
  }

  console.log(`[POLLING] Cek status ID: ${taskId} | Jumlah Endpoint: ${endpointsToCheck.length} | Proxy: ${!!proxyAgent}`);

  for (let i = 0; i < endpointsToCheck.length; i++) {
    const url = endpointsToCheck[i];
    try {
      const axiosConfig = { 
        headers: { 'x-magnific-api-key': apiKey }, 
        timeout: 20000 
      };

      if (proxyAgent) {
        axiosConfig.httpsAgent = proxyAgent;
      }

      const magnificRes = await axios.get(url, axiosConfig);
      console.log(`[POLLING_SUCCESS] Data ditemukan di jalur: ${url}`);
      return res.status(200).json({ success: true, data: magnificRes.data });

    } catch (error) {
      if (error.response) {
        // JIKA KENA 403, LANGSUNG HENTIKAN PENCARIAN! Jangan lanjut cek endpoint lain.
        if (error.response.status === 403) {
          console.error(`[POLLING_BLOCKED] IP Diblokir (403). Berhenti memeriksa endpoint lain agar tidak makin parah.`);
          return res.status(403).json({ 
            success: false, 
            error: 'Sementara diblokir oleh Magnific (Rate Limit). Harap tunggu beberapa saat sebelum polling lagi.', 
            statusCode: 403 
          });
        }
        
        // Jika error selain 404 (misal 500), langsung lempar error
        if (error.response.status !== 404) {
          const statusCode = error.response.status;
          const errorMsg = error.response.data?.message || error.response.data?.error || 'Gagal mengecek status';
          return res.status(statusCode).json({ success: false, error: errorMsg, statusCode });
        }
      }
      
      // Jika 404, beri jeda 1 detik sebelum mencoba endpoint berikutnya (jika ada)
      if (i < endpointsToCheck.length - 1) {
        console.log(`[404 Skip] Jalur nihil pada: ${url}. Menunggu 1 detik sebelum mencoba fallback...`);
        await delay(1000); // Jeda 1 detik agar tidak spam server
      }
    }
  }

  return res.status(404).json({ 
    success: false, 
    error: 'Task ID tidak ditemukan di rute manapun pada server Magnific Kling.', 
    statusCode: 404 
  });
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
