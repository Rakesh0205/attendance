import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/attendance', async (req, res) => {
  const { student_id, password } = req.query;

  if (!student_id || !password) {
    return res.status(400).json({ error: 'Missing student_id or password' });
  }

  try {
    const response = await fetch(`https://a0qna69x15.execute-api.ap-southeast-2.amazonaws.com/dev/attendance?student_id=${student_id}&password=${password}`);
    console.log("ekjrbekreh");
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
