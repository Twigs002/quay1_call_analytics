// api/pull-dialfire.js
import axios from 'axios';

export default async function handler(req, res) {
  const campaignToken = process.env.DIALFIRE_CAMPAIGN_TOKEN;
  const campaignId = 'N4UMU8GPQKZMRM93';

  if (!campaignToken) {
    return res.status(400).json({ error: 'Missing campaign token' });
  }

  try {
    const response = await axios.get(
      `https://api.dialfire.com/api/campaigns/${campaignId}/activities/reports/`,
      {
        params: {
          from: '2025-10-28',
          to: '2025-10-30'
        },
        headers: {
          'Authorization': `Bearer ${campaignToken}`
        },
        timeout: 15000
      }
    );

    const data = response.data;
    const processedData = {};

    data.forEach(row => {
      const caller = row.user || 'Unknown';
      const date = row.date;
      if (!processedData[caller]) processedData[caller] = {};
      processedData[caller][date] = {
        calls: row.calls || 0,
        success: row.success || 0,
        declines: row.declined || 0
      };
    });

    res.status(200).json({
      processedData,
      totalCalls: data.reduce((sum, r) => sum + (r.calls || 0), 0),
      lastSync: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dialfire Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Sync failed',
      details: error.response?.data || error.message
    });
  }
}
