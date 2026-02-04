import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import puppeteer from 'puppeteer';

const router = Router();
const prisma = new PrismaClient();

// Initialize OpenAI (will be null if API key not set)
let openai: OpenAI | null = null;
try {
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI:', error);
}

// Get all tailored resumes
router.get('/', async (req, res) => {
  try {
    const userId = 'default';
    const resumes = await prisma.tailoredResume.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        jobTitle: true,
        company: true,
        createdAt: true,
      },
    });

    res.json(resumes);
  } catch (error) {
    console.error('Error fetching resumes:', error);
    res.status(500).json({ error: 'Failed to fetch resumes' });
  }
});

// Get single resume
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resume = await prisma.tailoredResume.findUnique({
      where: { id: parseInt(id) },
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    res.json(resume);
  } catch (error) {
    console.error('Error fetching resume:', error);
    res.status(500).json({ error: 'Failed to fetch resume' });
  }
});

// Tailor resume based on job description
router.post('/tailor', async (req, res) => {
  try {
    const userId = 'default';
    const { jobDescription, jobTitle, company } = req.body;

    if (!jobDescription || !jobTitle) {
      return res.status(400).json({ error: 'Job description and title are required' });
    }

    // Check if OpenAI is configured
    if (!openai) {
      return res.status(400).json({ 
        error: 'OpenAI API key not configured. Please set OPENAI_API_KEY in backend/.env file',
        demo: true 
      });
    }

    // Fetch user profile and stories
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        experiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { endDate: 'desc' } },
        certifications: { orderBy: { date: 'desc' } },
      },
    });

    const stories = await prisma.story.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!profile) {
      return res.status(400).json({ error: 'Please create your profile first' });
    }

    // Build context for OpenAI
    const profileContext = {
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      summary: profile.summary,
      skills: JSON.parse(profile.skills),
      experiences: profile.experiences,
      educations: profile.educations,
      certifications: profile.certifications,
    };

    const storiesContext = stories.map(s => ({
      title: s.title,
      situation: s.situation,
      task: s.task,
      action: s.action,
      result: s.result,
      tags: JSON.parse(s.tags),
      metrics: s.metrics,
    }));

    // Call OpenAI to analyze JD and tailor resume
    const systemPrompt = `You are an expert resume writer and ATS optimization specialist. Your task is to:
1. Analyze the job description to extract key requirements, skills, and keywords
2. Match the candidate's experience and stories to the job requirements
3. Generate a tailored resume that emphasizes relevant experience
4. Optimize for ATS by incorporating keywords naturally
5. Use strong action verbs and quantifiable achievements

Return a JSON object with:
- keywords: array of key skills/terms from JD
- summary: tailored professional summary (2-3 sentences)
- experiences: array of work experiences with tailored bullet points
- matchedStories: array of story IDs that best match this job
- atsScore: estimated ATS match score (0-100)`;

    const userPrompt = `Job Description:
${jobDescription}

Candidate Profile:
${JSON.stringify(profileContext, null, 2)}

Achievement Stories:
${JSON.stringify(storiesContext, null, 2)}

Please tailor this candidate's resume for the job description above.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const tailoredContent = JSON.parse(completion.choices[0].message.content || '{}');

    // Save tailored resume
    const resume = await prisma.tailoredResume.create({
      data: {
        userId,
        jobTitle,
        company: company || '',
        jobDescription,
        content: JSON.stringify(tailoredContent),
        keywords: JSON.stringify(tailoredContent.keywords || []),
      },
    });

    res.json({
      id: resume.id,
      ...tailoredContent,
      profile: profileContext,
    });
  } catch (error: any) {
    console.error('Error tailoring resume:', error);
    res.status(500).json({ 
      error: 'Failed to tailor resume',
      details: error.message 
    });
  }
});

// Export resume as PDF
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    
    const resume = await prisma.tailoredResume.findUnique({
      where: { id: parseInt(id) },
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: resume.userId },
      include: {
        experiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { endDate: 'desc' } },
        certifications: { orderBy: { date: 'desc' } },
      },
    });

    const content = JSON.parse(resume.content);
    const skills = JSON.parse(profile?.skills || '[]');

    // Generate HTML for PDF
    const html = generateResumeHTML(profile, content, skills);

    // Generate PDF using puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
      printBackground: true,
    });

    await browser.close();

    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume-${resume.jobTitle.replace(/\s+/g, '-')}.pdf"`);
    res.send(pdf);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
});

// Helper function to generate resume HTML
function generateResumeHTML(profile: any, content: any, skills: string[]): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #2c3e50;
    }
    .header h1 {
      font-size: 24pt;
      color: #2c3e50;
      margin-bottom: 5px;
    }
    .header .contact {
      font-size: 10pt;
      color: #666;
    }
    .section {
      margin-bottom: 20px;
    }
    .section-title {
      font-size: 14pt;
      font-weight: bold;
      color: #2c3e50;
      border-bottom: 1px solid #ccc;
      padding-bottom: 3px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .summary {
      margin-bottom: 15px;
      text-align: justify;
    }
    .experience-item {
      margin-bottom: 15px;
    }
    .experience-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .job-title {
      font-weight: bold;
      font-size: 12pt;
    }
    .company {
      font-weight: bold;
      color: #2c3e50;
    }
    .date {
      color: #666;
      font-style: italic;
    }
    .experience-item ul {
      margin-left: 20px;
      margin-top: 5px;
    }
    .experience-item li {
      margin-bottom: 3px;
    }
    .skills-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .skill-tag {
      background: #ecf0f1;
      padding: 4px 10px;
      border-radius: 3px;
      font-size: 10pt;
    }
    .education-item {
      margin-bottom: 10px;
    }
    .degree {
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>${profile?.name || 'Your Name'}</h1>
    <div class="contact">
      ${profile?.email ? profile.email + ' • ' : ''}
      ${profile?.phone || ''}
    </div>
  </div>

  ${content.summary ? `
  <div class="section">
    <div class="section-title">Professional Summary</div>
    <div class="summary">${content.summary}</div>
  </div>
  ` : ''}

  ${skills.length > 0 ? `
  <div class="section">
    <div class="section-title">Skills</div>
    <div class="skills-list">
      ${skills.map((skill: string) => `<span class="skill-tag">${skill}</span>`).join('')}
    </div>
  </div>
  ` : ''}

  ${content.experiences && content.experiences.length > 0 ? `
  <div class="section">
    <div class="section-title">Professional Experience</div>
    ${content.experiences.map((exp: any) => `
      <div class="experience-item">
        <div class="experience-header">
          <div>
            <div class="job-title">${exp.title}</div>
            <div class="company">${exp.company}</div>
          </div>
          <div class="date">${exp.startDate} - ${exp.endDate || 'Present'}</div>
        </div>
        ${exp.bullets ? `
          <ul>
            ${exp.bullets.map((bullet: string) => `<li>${bullet}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${profile?.educations && profile.educations.length > 0 ? `
  <div class="section">
    <div class="section-title">Education</div>
    ${profile.educations.map((edu: any) => `
      <div class="education-item">
        <div class="degree">${edu.degree}${edu.field ? ' in ' + edu.field : ''}</div>
        <div>${edu.institution}</div>
        ${edu.endDate ? `<div class="date">${edu.endDate}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}

  ${profile?.certifications && profile.certifications.length > 0 ? `
  <div class="section">
    <div class="section-title">Certifications</div>
    ${profile.certifications.map((cert: any) => `
      <div>${cert.name} - ${cert.issuer}${cert.date ? ' (' + cert.date + ')' : ''}</div>
    `).join('')}
  </div>
  ` : ''}
</body>
</html>
  `.trim();
}

export default router;
