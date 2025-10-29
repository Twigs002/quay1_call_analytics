import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { newData } = req.body;
    const filePath = path.join(process.cwd(), 'data.json');
    let existing = {};
    try { existing = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch (e) {}

    // Deep merge
    Object.keys(newData).forEach(caller => {
      if (!existing[caller]) existing[caller] = {};
      Object.keys(newData[caller]).forEach(date => {
        if (!existing[caller][date]) existing[caller][date] = { calls: 0, success: 0, declines: 0 };
        existing[caller][date].calls += newData[caller][date].calls;
        existing[caller][date].success += newData[caller][date].success;
        existing[caller][date].declines += newData[caller][date].declines;
      });
    });

    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
