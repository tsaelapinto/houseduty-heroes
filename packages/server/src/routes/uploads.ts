import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../db/client';

const router = Router();

// Ensure upload dir exists
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `photo_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// ─── POST /uploads/photo ───────────────────────────────────────────────────
router.post('/photo', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const retentionDays = parseInt(process.env.PHOTO_RETENTION_DAYS ?? '30', 10);
    const deleteAt = new Date(Date.now() + retentionDays * 24 * 60 * 60 * 1000);

    const asset = await prisma.photoAsset.create({
      data: {
        storageProvider: 'local',
        storagePath: req.file.filename,
        deleteAt,
      },
    });

    return res.status(201).json({
      id: asset.id,
      url: `/uploads/${req.file.filename}`,
      deleteAt: asset.deleteAt,
    });
  } catch (err) {
    console.error('POST /uploads/photo error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

// ─── DELETE /uploads/photo/:id ─────────────────────────────────────────────
router.delete('/photo/:id', async (req, res) => {
  try {
    const asset = await prisma.photoAsset.findUnique({ where: { id: req.params.id } });
    if (!asset) return res.status(404).json({ error: 'Not found' });

    // Delete file from disk
    const filePath = path.join(UPLOAD_DIR, asset.storagePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.photoAsset.delete({ where: { id: asset.id } });
    return res.status(204).send();
  } catch (err) {
    console.error('DELETE /uploads/photo error:', err);
    return res.status(500).json({ error: 'Delete failed' });
  }
});

export default router;
