import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { parseResume } from '../services/ai';

const router = Router();
const prisma = new PrismaClient();

// Get or create profile
router.get('/', async (req, res) => {
  try {
    const userId = 'default'; // Single user for MVP
    let profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        experiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { endDate: 'desc' } },
        certifications: { orderBy: { date: 'desc' } },
      },
    });

    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId,
          name: 'Your Name',
          skills: JSON.stringify([]),
        },
        include: {
          experiences: true,
          educations: true,
          certifications: true,
        },
      });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update profile
router.post('/', async (req, res) => {
  try {
    const userId = 'default';
    const { name, email, phone, summary, skills, experiences, educations, certifications } = req.body;

    // Update or create profile
    let profile = await prisma.profile.findUnique({ where: { userId } });
    
    if (!profile) {
      profile = await prisma.profile.create({
        data: {
          userId,
          name: name || 'Your Name',
          email,
          phone,
          summary,
          skills: JSON.stringify(skills || []),
        },
      });
    } else {
      profile = await prisma.profile.update({
        where: { userId },
        data: {
          name,
          email,
          phone,
          summary,
          skills: JSON.stringify(skills || []),
        },
      });
    }

    // Delete existing related records
    await prisma.workExperience.deleteMany({ where: { profileId: profile.id } });
    await prisma.education.deleteMany({ where: { profileId: profile.id } });
    await prisma.certification.deleteMany({ where: { profileId: profile.id } });

    // Create new experiences
    if (experiences && experiences.length > 0) {
      await prisma.workExperience.createMany({
        data: experiences.map((exp: any) => ({
          ...exp,
          profileId: profile!.id,
        })),
      });
    }

    // Create new educations
    if (educations && educations.length > 0) {
      await prisma.education.createMany({
        data: educations.map((edu: any) => ({
          ...edu,
          profileId: profile!.id,
        })),
      });
    }

    // Create new certifications
    if (certifications && certifications.length > 0) {
      await prisma.certification.createMany({
        data: certifications.map((cert: any) => ({
          ...cert,
          profileId: profile!.id,
        })),
      });
    }

    // Fetch updated profile with all relations
    const updatedProfile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        experiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { endDate: 'desc' } },
        certifications: { orderBy: { date: 'desc' } },
      },
    });

    res.json(updatedProfile);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

// Parse resume with AI
router.post('/parse-resume', async (req, res) => {
  try {
    const { resumeText, model } = req.body;

    if (!resumeText || typeof resumeText !== 'string') {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    console.log(`Parsing resume with AI (${model || 'default'})...`);
    const parsedData = await parseResume(resumeText, model);
    console.log('Resume parsed successfully');

    res.json(parsedData);
  } catch (error) {
    console.error('Error parsing resume:', error);
    res.status(500).json({ 
      error: 'Failed to parse resume', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});
