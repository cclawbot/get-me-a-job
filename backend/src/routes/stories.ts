import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { generateStory, optimizeStory, storyToScript } from '../services/ai';

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

// AI: Generate story from notes
router.post('/generate', async (req, res) => {
  try {
    const { notes, model } = req.body;

    if (!notes || typeof notes !== 'string') {
      return res.status(400).json({ error: 'Notes are required' });
    }

    console.log(`Generating story with AI (${model || 'default'})...`);
    const generatedStory = await generateStory(notes, model);
    console.log('Story generated successfully');

    res.json(generatedStory);
  } catch (error) {
    console.error('Error generating story:', error);
    res.status(500).json({ 
      error: 'Failed to generate story', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// AI: Optimize existing story
router.post('/optimize', async (req, res) => {
  try {
    const { title, situation, task, action, result, metrics, model } = req.body;

    if (!title || !situation || !task || !action || !result) {
      return res.status(400).json({ error: 'All STAR fields are required' });
    }

    console.log(`Optimizing story with AI (${model || 'default'})...`);
    const optimized = await optimizeStory({ title, situation, task, action, result, metrics }, model);
    console.log('Story optimized successfully');

    res.json(optimized);
  } catch (error) {
    console.error('Error optimizing story:', error);
    res.status(500).json({ 
      error: 'Failed to optimize story', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// AI: Convert story to interview script (with caching)
router.post('/to-script', async (req, res) => {
  try {
    const { storyId, title, situation, task, action, result, metrics, model, regenerate } = req.body;

    console.log('📥 Received to-script request:', { storyId, regenerate, model, hasStoryId: !!storyId });

    if (!title || !situation || !task || !action || !result) {
      return res.status(400).json({ error: 'All STAR fields are required' });
    }

    // Check for cached script if storyId provided and not forcing regeneration
    if (storyId && !regenerate) {
      console.log(`🔍 Checking cache for story ${storyId}...`);
      const story = await prisma.story.findUnique({
        where: { id: parseInt(storyId) },
        select: { interviewScript: true },
      });

      if (story?.interviewScript) {
        console.log(`✅ Cache HIT! Returning cached interview script for story ${storyId}`);
        return res.json(JSON.parse(story.interviewScript));
      } else {
        console.log(`❌ Cache MISS for story ${storyId}`);
      }
    }

    // Generate new script
    console.log(`🤖 ${regenerate ? 'Regenerating' : 'Generating'} interview script (${model || 'default'})...`);
    const script = await storyToScript({ title, situation, task, action, result, metrics }, model);
    console.log('✅ Script generated successfully');

    // Save to database if storyId provided
    if (storyId) {
      await prisma.story.update({
        where: { id: parseInt(storyId) },
        data: { interviewScript: JSON.stringify(script) },
      });
      console.log(`💾 Saved script to cache for story ${storyId}`);
    } else {
      console.log('⚠️  No storyId provided - script not cached');
    }

    res.json(script);
  } catch (error) {
    console.error('Error generating interview script:', error);
    res.status(500).json({ 
      error: 'Failed to generate interview script', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});
