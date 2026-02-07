import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  scrapeSeek, 
  scrapeLinkedIn, 
  scrapeIndeed, 
  searchAllSources,
  fetchJobDescription,
  SearchParams,
  ScrapedJob 
} from '../services/jobScraper';
import { parseJobFromURL } from '../services/ai';

const router = Router();
const prisma = new PrismaClient();

// Search for jobs across sources
router.post('/search', async (req, res) => {
  try {
    const { keywords, location, sources, maxResults } = req.body;
    
    if (!keywords) {
      return res.status(400).json({ error: 'Keywords are required' });
    }
    
    console.log(`🔍 Job search request: ${keywords} in ${location || 'any location'}`);
    
    const params: SearchParams = {
      keywords,
      location,
      maxResults: maxResults || 10,
    };
    
    let jobs: ScrapedJob[] = [];
    
    // Search specified sources or all
    const sourcesToSearch = sources || ['seek', 'linkedin', 'indeed'];
    
    if (sourcesToSearch.length === 3 || sourcesToSearch.includes('all')) {
      jobs = await searchAllSources(params);
    } else {
      const searchPromises: Promise<ScrapedJob[]>[] = [];
      
      if (sourcesToSearch.includes('seek')) {
        searchPromises.push(scrapeSeek(params));
      }
      if (sourcesToSearch.includes('linkedin')) {
        searchPromises.push(scrapeLinkedIn(params));
      }
      if (sourcesToSearch.includes('indeed')) {
        searchPromises.push(scrapeIndeed(params));
      }
      
      const results = await Promise.all(searchPromises);
      jobs = results.flat();
    }
    
    // Save jobs to database
    const userId = 'default';
    const savedJobs: any[] = [];
    
    for (const job of jobs) {
      try {
        // Upsert to avoid duplicates
        const saved = await prisma.job.upsert({
          where: { url: job.url },
          update: {
            title: job.title,
            company: job.company,
            location: job.location,
            salary: job.salary,
            postedDate: job.postedDate,
            workType: job.workType,
            remote: job.remote || false,
            source: job.source,
            updatedAt: new Date(),
          },
          create: {
            title: job.title,
            company: job.company,
            location: job.location,
            salary: job.salary,
            url: job.url,
            postedDate: job.postedDate,
            workType: job.workType,
            remote: job.remote || false,
            source: job.source,
            status: 'new',
            userId,
          },
        });
        savedJobs.push(saved);
      } catch (dbError) {
        console.error(`Failed to save job: ${job.title}`, dbError);
      }
    }
    
    console.log(`💾 Saved ${savedJobs.length} jobs to database`);
    
    res.json({
      count: savedJobs.length,
      jobs: savedJobs,
    });
  } catch (error) {
    console.error('Job search error:', error);
    res.status(500).json({ 
      error: 'Failed to search jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get all saved jobs
router.get('/', async (req, res) => {
  try {
    const userId = 'default';
    const { status, source, search } = req.query;
    
    const where: any = { userId };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    if (source && source !== 'all') {
      where.source = source;
    }
    if (search) {
      where.OR = [
        { title: { contains: search as string } },
        { company: { contains: search as string } },
        { location: { contains: search as string } },
      ];
    }
    
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// Get single job with full description
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    res.json(job);
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// Fetch and parse full job description
router.post('/:id/fetch-description', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await prisma.job.findUnique({
      where: { id: parseInt(id) },
    });
    
    if (!job || !job.url) {
      return res.status(404).json({ error: 'Job not found or has no URL' });
    }
    
    console.log(`📄 Fetching full description for: ${job.title}`);
    
    // Fetch page content
    const pageContent = await fetchJobDescription(job.url);
    
    // Parse with AI
    const parsed = await parseJobFromURL(pageContent, job.url);
    
    // Update job with full description
    const updated = await prisma.job.update({
      where: { id: parseInt(id) },
      data: {
        description: parsed.jobDescription,
        title: parsed.jobTitle || job.title,
        company: parsed.company || job.company,
      },
    });
    
    console.log(`✅ Updated job description for: ${updated.title}`);
    
    res.json(updated);
  } catch (error) {
    console.error('Error fetching job description:', error);
    res.status(500).json({ 
      error: 'Failed to fetch job description',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Update job status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const updated = await prisma.job.update({
      where: { id: parseInt(id) },
      data: {
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      },
    });
    
    res.json(updated);
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({ error: 'Failed to update job' });
  }
});

// Delete job
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.job.delete({
      where: { id: parseInt(id) },
    });
    
    res.json({ message: 'Job deleted', id: parseInt(id) });
  } catch (error) {
    console.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// Bulk delete jobs
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'IDs array is required' });
    }
    
    await prisma.job.deleteMany({
      where: { id: { in: ids.map((id: number) => parseInt(id.toString())) } },
    });
    
    res.json({ message: `Deleted ${ids.length} jobs` });
  } catch (error) {
    console.error('Error bulk deleting jobs:', error);
    res.status(500).json({ error: 'Failed to delete jobs' });
  }
});

// Cleanup: Delete jobs with specific statuses
router.post('/cleanup', async (req, res) => {
  try {
    const { statuses } = req.body;
    const userId = 'default';

    if (!statuses || !Array.isArray(statuses)) {
      return res.status(400).json({ error: 'Statuses array is required' });
    }

    const result = await prisma.job.deleteMany({
      where: {
        userId,
        status: { in: statuses }
      }
    });

    res.json({ message: `Cleaned up ${result.count} jobs`, count: result.count });
  } catch (error) {
    console.error('Error cleaning up jobs:', error);
    res.status(500).json({ error: 'Failed to cleanup jobs' });
  }
});

// Get job stats
router.get('/stats/summary', async (req, res) => {
  try {
    const userId = 'default';
    
    const [total, byStatus, bySource] = await Promise.all([
      prisma.job.count({ where: { userId } }),
      prisma.job.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
      prisma.job.groupBy({
        by: ['source'],
        where: { userId },
        _count: true,
      }),
    ]);
    
    res.json({
      total,
      byStatus: byStatus.reduce((acc, item) => {
        acc[item.status] = item._count;
        return acc;
      }, {} as Record<string, number>),
      bySource: bySource.reduce((acc, item) => {
        acc[item.source] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
