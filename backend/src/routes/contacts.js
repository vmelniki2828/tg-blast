import { Router } from 'express';
import { Contacts } from '../store/index.js';

const router = Router();

// GET /api/contacts/tags — все уникальные теги (должен быть ДО /:id)
router.get('/tags', async (req, res) => {
  try {
    const tags = await Contacts.distinct('tags');
    res.json(tags);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/contacts
router.get('/', async (req, res) => {
  try {
    const { tag, search, active } = req.query;
    const filter = {};
    if (tag) filter.tags = tag;
    if (active !== undefined) filter.active = active === 'true';
    if (search) {
      filter.$or = [
        { name:     { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
        { chatId:   { $regex: search, $options: 'i' } },
        { phone:    { $regex: search, $options: 'i' } },
      ];
    }
    const contacts = await Contacts.find(filter);
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/contacts
router.post('/', async (req, res) => {
  try {
    if (!req.body.name) return res.status(400).json({ error: 'name обязателен' });
    const contact = await Contacts.create(req.body);
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/contacts/:id
router.put('/:id', async (req, res) => {
  try {
    const contact = await Contacts.findByIdAndUpdate(req.params.id, req.body);
    if (!contact) return res.status(404).json({ error: 'Контакт не найден' });
    res.json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/contacts/:id
router.delete('/:id', async (req, res) => {
  try {
    const contact = await Contacts.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ error: 'Контакт не найден' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
