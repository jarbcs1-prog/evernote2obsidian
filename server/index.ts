import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { convertEnexToObsidian } from './converter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.post('/api/convert', upload.single('enex'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const result = await convertEnexToObsidian(req.file.buffer.toString('utf-8'));
    res.json(result);
  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({ error: 'Failed to convert file' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});