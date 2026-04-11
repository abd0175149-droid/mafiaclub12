import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const SERVICE_ACCOUNT_FILE = path.resolve(process.cwd(), 'google-service-account.json');

const getDriveService = () => {
  if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    throw new Error('ملف المصادقة google-service-account.json غير موجود في المجلد الجذري للمشروع.');
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
};

// GET /api/drive/list?folderId=XYZ
router.get('/list', requireAuth, async (req: Request, res: Response) => {
  try {
    const folderId = req.query.folderId as string;
    if (!folderId) {
      return res.status(400).json({ error: 'مطلوب folderId' });
    }

    const drive = getDriveService();
    // Query to list files in the folder (excluding sub-folders for simplicity, or include them if needed).
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, thumbnailLink, size)',
      orderBy: 'folder, name'
    });

    res.json(response.data.files || []);
  } catch (error: any) {
    console.error('Drive API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/drive/file/:id
router.get('/file/:id', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const drive = getDriveService();

    // Fetch the file metadata to get the MIME type
    const fileMeta = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size'
    });

    const mimeType = fileMeta.data.mimeType || 'application/octet-stream';
    const size = fileMeta.data.size;

    // Stream the file content directly
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', mimeType);
    if (size) {
      res.setHeader('Content-Length', size);
    }
    
    // Allows progressive loading for media / browser caching handling
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    
    response.data
      .on('end', () => {})
      .on('error', (err: any) => {
        console.error('Error during streaming file:', err.message);
      })
      .pipe(res);

  } catch (error: any) {
    console.error('Error streaming file:', error.message);
    res.status(500).send(error.message);
  }
});

export default router;
