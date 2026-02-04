import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Get all stories
router.get('/', async (req, res) => {
  try {
    const userId = 'default';
    const stories = await prisma.story.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(stories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    res.status(500).json({ error: 'Failed to fetch stories' });
  }
});

// Create story
router.post('/', async (req, res) => {
  try {
    const userId = 'default';
    const { title, situation, task, action, result, tags, metrics } = req.body;

    const story = await prisma.story.create({
      data: {
        userId,
        title,
        situation,
        task,
        action,
        result,
        tags: JSON.stringify(tags || []),
        metrics,
      },
    });

    res.json(story);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({ error: 'Failed to create story' });
  }
});

// Update story
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, situation, task, action, result, tags, metrics } = req.body;

    const story = await prisma.story.update({
      where: { id: parseInt(id) },
      data: {
        title,
        situation,
        task,
        action,
        result,
        tags: JSON.stringify(tags || []),
        metrics,
      },
    });

    res.json(story);
  } catch (error) {
    console.error('Error updating story:', error);
    res.status(500).json({ error: 'Failed to update story' });
  }
});

// Delete story
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.story.delete({
      where: { id: parseInt(id) },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting story:', error);
    res.status(500).json({ error: 'Failed to delete story' });
  }
});

export default router;
