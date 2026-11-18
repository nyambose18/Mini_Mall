import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../utils/errors.js';

fs.mkdirSync(config.uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploadDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError(400, 'INVALID_FILE', 'Only image files can be uploaded.'));
    }
    return cb(null, true);
  },
});

const router = express.Router();

router.post(
  '/',
  requireAuth,
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      throw new AppError(400, 'NO_FILE', 'Choose an image to upload.');
    }
    res.status(201).json({ url: `/uploads/${req.file.filename}` });
  },
);

export default router;