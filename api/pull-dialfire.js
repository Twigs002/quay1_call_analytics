// api/pull-dialfire.js
import axios from 'axios';

export default async function handler(req, res) {
  const token = process.env.DIALFIRE_CAMPAIGN_TOKEN;
  const campaignId = 'N4UMU8GPQKZMRM93';

  if (!token) {
    return res.status(400).json({ error: 'Missing token' });
  }

  try {
    let allContacts = [];
    let page = 1;
    const perPage = 100;
    const since = '2025-10-28T00:00:00Z';

    while (true) {
      const response = await axios.get(
        `https://api.dialfire.com/api/campaigns/${campaignId}/contacts/flat_view`,
        {
          params: {
            page,
            per_page: perPage,
            updated_since: since
          },
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 15000
        }
      );

      const contacts = response.data.items || [];
      if (contacts.length === 0) break;
      allContacts = allContacts.concat(contacts);
      if (contacts.length < perPage) break;
      page++;
    }

    const processedData = {};

    allContacts.forEach(contact => {
      // Look for outbound call task
      const taskLog = contact.$task_log || [];
      taskLog.forEach(log => {
        if (log.task?.includes('Outbound') || log.task?.includes('Call')) {
          const caller = log.user || 'Unknown';
          const date = log.date?.split('T')[0];
          if (!date) return;

          if (!processedData[caller]) processedData[caller] = {};
          if (!processedData[caller][date]) {
            processedData[caller][date] = { calls: 0, success: 0, declines: 0 };
          }

          processedData[caller][date].calls += 1;
          if (log.status_detail === 'success') processedData[caller][date].success += 1;
          if (log.status_detail === 'declined') processedData[caller][date].declines += 1;
        }
      });
    });

    res.status(200).json({
      processedData,
      totalCalls: allContacts.length,
      lastSync: new Date().toISOString(),
      source: 'flat_view'
    });

  } catch (error) {
    console.error('Dialfire Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Sync failed',
      details: error.response?.data || error.message
    });
  }
}
