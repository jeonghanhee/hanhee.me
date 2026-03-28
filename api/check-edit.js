export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { password } = req.body
  const secret = process.env.MB_SECRET

  if (!secret) return res.status(500).json({ error: 'MB_SECRET not set' })
  if (password !== secret) return res.status(401).json({ error: 'wrong' })

  res.status(200).json({ ok: true })
}