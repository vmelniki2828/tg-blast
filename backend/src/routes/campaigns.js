import { Router } from 'express';
import { Campaigns } from '../store/index.js';
import { runCampaign } from '../services/schedulerService.js';

const router = Router();

// GET /api/campaigns
router.get('/', async (req, res) => {
  try {
    const campaigns = await Campaigns.find();
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/campaigns/:id
router.get('/:id', async (req, res) => {
  try {
    const campaign = await Campaigns.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Не найдено' });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/campaigns
router.post('/', async (req, res) => {
  try {
    const { title, text, recipients, channel, scheduledAt } = req.body;
    if (!title || !text) return res.status(400).json({ error: 'title и text обязательны' });

    const campaign = await Campaigns.create({
      title, text,
      recipients: recipients || 'all',
      channel: channel || 'telegram',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
    });

    res.status(201).json(campaign);

    if (!scheduledAt) {
      runCampaign(campaign).catch(console.error);
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/campaigns/:id — отменить
router.delete('/:id', async (req, res) => {
  try {
    const campaign = await Campaigns.findById(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Не найдено' });
    if (campaign.status !== 'pending') {
      return res.status(400).json({ error: 'Можно отменить только ожидающую рассылку' });
    }
    await Campaigns.findByIdAndUpdate(req.params.id, { status: 'cancelled' });
    res.json({ ...campaign, status: 'cancelled' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
