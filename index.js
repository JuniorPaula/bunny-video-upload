import 'dotenv/config';
import express from 'express';
import axios from 'axios';
import multer from 'multer';

const app = express();
const PORT = 6969;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


app.post('/upload', upload.single('file'), async (req, res) => {
  const fileBuffer = req.file.buffer;
  const { title, collectionId } = req.body;
  
  try {
    const videoId = await createVideoOnBunny(title, collectionId);
    const response = await uploadVideoOnBunny(fileBuffer, videoId);

    if (response.statusCode !== 200) {
      throw new Error('Erro ao fazer upload');
    }

    res.status(200).send('Upload concluído com sucesso!');
  } catch (error) {
    console.error('Erro no upload:', error.message);
    res.status(500).send('Erro no upload');
  }
 
})

async function createVideoOnBunny(title, collectionId) {
  try {
    const options = {
      url: `http://video.bunnycdn.com/library/${process.env.VIDEO_LIBRARY_ID}/videos`,
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