import Redis from 'ioredis';

const redis = new Redis(process.env.STORAGE_REDIS_URL);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method Not Allowed' });

  try {
    const { cards } = req.body;
    await redis.set('moodboard_data', JSON.stringify({ cards }));
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}