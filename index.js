import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import multer from 'multer';
import tus from 'tus-js-client';

import { createHash } from 'node:crypto'

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  next();
});

const PORT = 6969;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.get('/get-video/:videoId', async (req, res) => {
  const { videoId } = req.params;
  const url = `${process.env.BUNNY_API_URL}/library/${process.env.VIDEO_LIBRARY_ID}/videos/${videoId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        AccessKey: process.env.ACCESS_KEY,
      },
    });

    const { guid, title } = response.data;
    const videoUrl = `${process.env.BUNNY_HLS_URL}/${guid}/playlist.m3u8`;

    res.status(200).json({
      title,
      videoUrl,
    });
  } catch (error) {
    console.error('Erro ao buscar video:', error.message);
    res.status(500).send('Erro ao buscar video');
  }
})

app.post('/upload', upload.single('file'), async (req, res) => {
  const fileBuffer = req.file.buffer;
  const { title, collectionId } = req.body;
  
  try {
    const videoId = await createVideoOnBunny(title, collectionId);
    const response = await uploadVideoOnBunny(fileBuffer, videoId);

    if (response.statusCode !== 200) {
      throw new Error('Erro ao fazer upload');
    }

    res.status(200).json({ msg: 'Upload concluído com sucesso!' });
  } catch (error) {
    console.error('Erro no upload:', error.message);
    res.status(500).send('Erro no upload');
  }
 
})

app.post('/tus-upload', upload.single('file'), async (req, res) => {
  const fileBuffer = req.file.buffer;
  const { title, collectionId } = req.body;
  
  try {
    const videoId = await createVideoOnBunny(title);
    
    const PRESIGNED_REQUEST_SIGNATURE = 
      createHash('sha256')
      .update(`${process.env.VIDEO_LIBRARY_ID}${process.env.API_KEY}${new Date().setHours(24)}${videoId}`)
      .digest('hex');

    console.log(PRESIGNED_REQUEST_SIGNATURE);

    const videoUpload = new tus.Upload(fileBuffer, {
      endpoint: `${process.env.BUNNY_API_URL}/tusupload`,
      retryDelays: [0, 1000, 3000, 5000],
      metadata: {
        filetype: req.file.mimetype,
        title: title,
      },
      headers: {
        AuthorizationSignature: PRESIGNED_REQUEST_SIGNATURE,
        AuthorizationExpire: new Date().setHours(24),
        VideoId: videoId,
        LibraryId: process.env.VIDEO_LIBRARY_ID,
      },
      onError: (error) => {
        console.error('Erro no upload:', error.message);
        res.status(500).send('Erro no upload');
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percentage = ((bytesUploaded / bytesTotal) * 100).toFixed(2);
        console.log(`${bytesUploaded}/${bytesTotal} (${percentage}%)`);
      },
      onSuccess: () => {
        res.status(200).json({ msg: 'Upload concluído com sucesso!' });
      },
    });

    videoUpload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        videoUpload.resumeFromPreviousUpload(previousUploads[0]);
      }

      videoUpload.start();
    });
  } catch (error) {
    console.error('Erro no upload:', error.message);
    res.status(500).send('Erro no upload');
  }
})

async function createVideoOnBunny(title, collectionId) {
  try {
    const options = {
      url: `${process.env.BUNNY_API_URL}/library/${process.env.VIDEO_LIBRARY_ID}/videos`,
      data: JSON.stringify({ title, collectionId }),
    };
  
    const response = await axios.post(options.url, options.data, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        AccessKey: process.env.ACCESS_KEY,
      },
    });
    const videoId = response.data.guid;
  
    return videoId;  
  } catch (error) {
    console.error('Erro ao criar video:', error.message);
    throw error;
  }
}

async function uploadVideoOnBunny(buffer, videoId) {
  const urlUpload = `${process.env.BUNNY_API_URL}/library/${process.env.VIDEO_LIBRARY_ID}/videos/${videoId}`;
  
  const resp = await axios.put(urlUpload, buffer, {
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      AccessKey: process.env.ACCESS_KEY,
    },
  })

  return resp.data;
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
})