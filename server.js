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
