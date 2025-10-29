// api/pull-dialfire.js
import axios from 'axios';

export default async function handler(req, res) {
  const token = process.env.DIALFIRE_CAMPAIGN_TOKEN;
  const campaignId = 'N4UMU8GPQKZMRM93';

  if (!token) return res.status(400).json({ error: 'Missing token' });

  try {
    let allContacts = [];
    let page = 1;
    const perPage = 100;
    const since = '2025-10-01T00:00:00Z';  // Earlier date to get data

    while (true) {
      const response = await axios.get(
        `https://api.dialfire.com/api/campaigns/${campaignId}/contacts/filter`,
        {
          params: { 
            page, 
            per_page: perPage,
            $status: 'success,declined',  // Filter for calls
            $entry_date_gte: '2025-10-01'  // Date filter
          },
          headers: { 'Authorization': `Bearer ${token}` },
          timeout: 20000
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
      const taskLog = contact.$task_log || [];
      const caller = contact.$$call_user?.split('@')[0] || 'Unknown';
      const callDate = contact.$$call_date?.split('T')[0] || 'Unknown';

      if (!callDate) return;

      if (!processedData[caller]) processedData[caller] = {};
      if (!processedData[caller][callDate]) {
        processedData[caller][callDate] = { calls: 0, success: 0, declines: 0 };
      }

      // Count calls from dial_result in task_log
      const dialResults = taskLog.filter(log => log.type === 'dial_result');
      processedData[caller][callDate].calls += dialResults.length;

      // Success/Declines from final status
      const finalStatus = contact.$status;
      const finalDetail = contact.$status_detail;

      if (finalStatus === 'success') {
        processedData[caller][callDate].success += 1;
      } else if (finalStatus === 'declined') {
        processedData[caller][callDate].declines += 1;
      }
    });

    res.status(200).json({
      processedData,
      totalCalls: allContacts.length,
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
