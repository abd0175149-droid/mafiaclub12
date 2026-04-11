import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { Readable } from 'stream';
import { requireAuth } from '../middleware/auth.js';

const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

const router = Router();
const SERVICE_ACCOUNT_FILE = path.resolve(process.cwd(), 'google-service-account.json');

const getDriveService = () => {
  if (!fs.existsSync(SERVICE_ACCOUNT_FILE)) {
    throw new Error('ملف المصادقة google-service-account.json غير موجود في المجلد الجذري للمشروع.');
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_FILE,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });
  return google.drive({ version: 'v3', auth });
};

// GET /api/drive/list
router.get('/list', requireAuth, async (req: Request, res: Response) => {
  try {
    const folderId = req.query.folderId as string;
    const searchParams = req.query.q as string;
    if (!folderId) return res.status(400).json({ error: 'مطلوب folderId' });

    let q = `'${folderId}' in parents and trashed=false`;
    if (searchParams) {
      q += ` and name contains '${searchParams.replace(/'/g, "\\'")}'`;
    }

    const drive = getDriveService();
    const response = await drive.files.list({
      q,
      fields: 'files(id, name, mimeType, thumbnailLink, size, webViewLink, iconLink, folderColorRgb, description)',
      orderBy: 'folder, name'
    });

    res.json(response.data.files || []);
  } catch (error: any) {
    console.error('Drive API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drive/folder
router.post('/folder', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, parentId, folderColorRgb } = req.body;
    if (!name || !parentId) return res.status(400).json({ error: 'مطلوب name و parentId' });

    const drive = getDriveService();
    const requestBody: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    };
    if (folderColorRgb) requestBody.folderColorRgb = folderColorRgb;

    const response = await drive.files.create({
      requestBody,
      fields: 'id, name, webViewLink, folderColorRgb, mimeType'
    });
    res.status(201).json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/drive/file/:id
router.put('/file/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const { name, trashed, addParents, removeParents, folderColorRgb, description } = req.body;
    
    if (!fileId) return res.status(400).json({ error: 'مطلوب fileId' });

    const drive = getDriveService();
    const requestBody: any = {};
    if (name) requestBody.name = name;
    if (trashed !== undefined) requestBody.trashed = trashed;
    if (folderColorRgb !== undefined) requestBody.folderColorRgb = folderColorRgb;
    if (description !== undefined) requestBody.description = description;

    let updateParams: any = {
      fileId,
      requestBody,
      fields: 'id, name, webViewLink'
    };

    if (addParents) updateParams.addParents = addParents;
    if (removeParents) updateParams.removeParents = removeParents;

    const response = await drive.files.update(updateParams);
    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drive/file/:id/copy
router.post('/file/:id/copy', requireAuth, async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    if (!fileId) return res.status(400).json({ error: 'مطلوب fileId' });

    const drive = getDriveService();
    const fileMeta = await drive.files.get({ fileId, fields: 'name, parents' });
    const newName = `نسخة من ${fileMeta.data.name}`;

    const requestBody: any = {
      name: newName,
      parents: fileMeta.data.parents
    };

    const response = await drive.files.copy({
      fileId,
      requestBody,
      fields: 'id, name, mimeType, thumbnailLink, size, webViewLink'
    });

    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drive/file/:id/share
router.post('/file/:id/share', requireAuth, async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const { role = 'reader', type = 'anyone', emailAddress } = req.body;
    
    if (!fileId) return res.status(400).json({ error: 'مطلوب fileId' });

    const drive = getDriveService();
    const requestBody: any = { role, type };
    if (emailAddress) requestBody.emailAddress = emailAddress;

    const response = await drive.permissions.create({
      fileId,
      requestBody,
      fields: 'id'
    });

    res.json(response.data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/drive/upload
router.post('/upload', requireAuth, upload.single('media'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    const folderId = req.body.folderId as string;
    const replaceFileId = req.body.replaceFileId as string;

    if (!file) return res.status(400).json({ error: 'لم يتم إرسال أي ملف' });

    const drive = getDriveService();

    const bufferStream = new Readable();
    bufferStream.push(file.buffer);
    bufferStream.push(null);

    const media = {
      mimeType: file.mimetype,
      body: bufferStream,
    };

    let response;
    if (replaceFileId) {
       response = await drive.files.update({
         fileId: replaceFileId,
         media,
         fields: 'id, name, mimeType, thumbnailLink, size, webViewLink, iconLink'
       });
    } else {
       if (!folderId) return res.status(400).json({ error: 'مطلوب folderId' });
       response = await drive.files.create({
         requestBody: {
           name: file.originalname,
           parents: [folderId],
         },
         media,
         fields: 'id, name, mimeType, thumbnailLink, size, webViewLink, iconLink'
       });
    }

    res.status(201).json(response.data);
  } catch (error: any) {
    console.error('Drive Upload Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/drive/file/:id
router.get('/file/:id', async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    const drive = getDriveService();

    const fileMeta = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size'
    });

    const mimeType = fileMeta.data.mimeType || 'application/octet-stream';
    const size = fileMeta.data.size;

    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    res.setHeader('Content-Type', mimeType);
    if (size) {
      res.setHeader('Content-Length', size);
    }
    
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    
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

// DELETE /api/drive/file/:id
router.delete('/file/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const fileId = req.params.id;
    if (!fileId) return res.status(400).json({ error: 'مطلوب fileId' });

    const drive = getDriveService();
    
    await drive.files.delete({ fileId });

    res.json({ success: true, message: 'تم حذف الملف بنجاح' });
  } catch (error: any) {
    console.error('Drive Delete Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
