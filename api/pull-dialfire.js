import axios from 'axios';

export default async function handler(req, res) {
  const token = process.env.DIALFIRE_KEY_NO_ANSWER;
  const campaignId = 'N4UMU8GPQKZMRM93';

  if (!token) return res.status(400).json({ error: 'Missing API key' });

  try {
    let allCalls = [];
    let page = 1;
    const since = '2025-10-28T00:00:00Z';

    while (true) {
      const { data } = await axios.get(
        `https://app.dialfire.com/api/campaigns/${campaignId}/connections`,
        {
          params: { page, per_page: 100, since },
          headers: { Authorization: token }
        }
      );

      const items = data.items || [];
      if (!items.length) break;
      allCalls = allCalls.concat(items);
      if (items.length < 100) break;
      page++;
    }

    let processedData = {};
    if (req.method === 'POST') {
      try { Object.assign(processedData, JSON.parse(req.body).existingData || {}); }
      catch (e) {}
    }

    allCalls.forEach(call => {
      const caller = call.agent_name || 'Unknown';
      const period = call.created_at?.split('T')[0] || 'Unknown';
      if (!processedData[caller]) processedData[caller] = {};
      if (!processedData[caller][period]) {
        processedData[caller][period] = { calls: 0, success: 0, declines: 0 };
      }
      processedData[caller][period].calls += 1;
      if (call.status_detail === 'success') processedData[caller][period].success += 1;
      else if (call.status_detail === 'declined') processedData[caller][period].declines += 1;
    });

    res.status(200).json({ processedData, totalCalls: allCalls.length });
  } catch (error) {
    res.status(500).json({ error: 'Sync failed', details: error.message });
  }
}
