import Redis from 'ioredis';

const redis = new Redis(process.env.STORAGE_REDIS_URL);

export default async function handler(req, res) {
  try {
    const raw = await redis.get('moodboard_data');
    if (!raw) return res.status(200).json({ cards: [] });
    return res.status(200).json(JSON.parse(raw));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}