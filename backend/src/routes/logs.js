import { Router } from 'express';
import { SendLogs } from '../store/index.js';

const router = Router();

// GET /api/logs?campaignId=...&status=...&channel=...&limit=...
router.get('/', async (req, res) => {
  try {
    const { campaignId, status, channel, limit = 200 } = req.query;
    const filter = {};
    if (campaignId) filter.campaign = campaignId;
    if (status)     filter.status   = status;
    if (channel)    filter.channel  = channel;

    const logs = await SendLogs.find(filter)
      .populate('contact', 'name username chatId')
      .populate('campaign', 'title')
      .sort({ sentAt: -1 })
      .limit(Number(limit));

    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
