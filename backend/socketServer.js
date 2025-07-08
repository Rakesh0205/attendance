// Socket.io server setup for attendance updates
import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import http from 'http';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

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
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Fetch failed:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Example: emit update when attendance changes (replace with real logic)
function notifyAttendanceUpdate(student_id) {
  io.emit('attendanceUpdated', { student_id });
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  // Optionally, handle room join for specific student_id
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

export { notifyAttendanceUpdate };
