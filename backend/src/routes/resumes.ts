import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import { parseJobFromURL } from '../services/ai';

const router = Router();
const prisma = new PrismaClient();

// Initialize Anthropic (will be null if API key not set)
let anthropic: Anthropic | null = null;
try {
  if (process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
} catch (error) {
  console.error('Failed to initialize Anthropic:', error);
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

// Delete resume
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resumeId = parseInt(id);

    // Check if resume exists
    const resume = await prisma.tailoredResume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Delete the resume
    await prisma.tailoredResume.delete({
      where: { id: resumeId },
    });

    res.json({ message: 'Resume deleted successfully', id: resumeId });
  } catch (error) {
    console.error('Error deleting resume:', error);
    res.status(500).json({ error: 'Failed to delete resume' });
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

    // Check if Anthropic is configured
    if (!anthropic) {
      return res.status(400).json({ 
        error: 'Anthropic API key not configured. Please set ANTHROPIC_API_KEY in backend/.env file',
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

    // Call Claude to analyze JD and tailor resume
    const prompt = `You are an expert resume writer and ATS optimization specialist. Your task is to:
1. Analyze the job description to extract key requirements, skills, and keywords
2. Match the candidate's experience and stories to the job requirements
3. Generate a tailored resume that emphasizes relevant experience
4. Optimize for ATS by incorporating keywords naturally
5. Use strong action verbs and quantifiable achievements
6. PROVIDE DETAILED CHANGE REASONING - explain WHY each change was made and cite the JD

CRITICAL WRITING STYLE RULES - AVOID AI SLOP:
- Write like a real person, not a robot
- Use natural, conversational language (while staying professional)
- Be specific and concrete - avoid vague buzzwords
- NO generic AI phrases like: "I am passionate about", "leverage synergies", "utilize", "spearheaded", "game-changer"
- NO excessive corporate jargon or buzzwords
- NO robotic sentence patterns or overly formal language
- Use simple, clear, powerful words instead of complicated ones
- Focus on WHAT YOU DID and RESULTS, not fluffy descriptions
- Make it sound like something a confident human would actually say

Good: "Led 5-person team to redesign checkout flow, reducing cart abandonment by 23%"
Bad: "Leveraged innovative leadership capabilities to spearhead transformational UX initiatives that optimized conversion metrics"

Job Description:
${jobDescription}

Candidate Profile:
${JSON.stringify(profileContext, null, 2)}

Achievement Stories:
${JSON.stringify(storiesContext, null, 2)}

Please tailor this candidate's resume for the job description above.

Return a JSON object with:
- keywords: array of key skills/terms from JD
- summary: tailored professional summary (2-3 sentences, NATURAL TONE)
- summaryReasoning: explanation of why the summary was written this way, with direct JD quotes
- experiences: array of work experiences with tailored bullet points (HUMAN-SOUNDING)
- experienceChanges: array of objects explaining each change, format: { experienceIndex: number, bulletIndex: number, original: string, tailored: string, reasoning: string, jdQuote: string }
- matchedStories: array of story IDs that best match this job
- atsScore: estimated ATS match score (0-100)

IMPORTANT: For experienceChanges, compare the ORIGINAL experience bullets from the candidate profile with the TAILORED bullets you create. Include the exact original text, the new tailored text, reasoning for the change, and the relevant quote from the JD that motivated it.

Return ONLY valid JSON, no other text.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const textContent = message.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Extract JSON from response (might be wrapped in markdown code blocks)
    let jsonText = textContent.text.trim();
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const tailoredContent = JSON.parse(jsonText);

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
        references: { orderBy: { createdAt: 'asc' } },
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
    res.end(pdf, 'binary');
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

  ${profile?.references && profile.references.length > 0 ? `
  <div class="section">
    <div class="section-title">References</div>
    ${profile.references.map((ref: any) => `
      <div class="education-item" style="margin-bottom: 10px;">
        <div class="degree">${ref.name}${ref.relationship ? ' (' + ref.relationship + ')' : ''}</div>
        <div>${ref.title}${ref.company ? ' at ' + ref.company : ''}</div>
        ${ref.email || ref.phone ? `<div class="date">${ref.email ? ref.email : ''}${ref.email && ref.phone ? ' • ' : ''}${ref.phone ? ref.phone : ''}</div>` : ''}
      </div>
    `).join('')}
  </div>
  ` : ''}
</body>
</html>
  `.trim();
}

// Parse job description from URL
router.post('/parse-url', async (req, res) => {
  try {
    const { url, model } = req.body;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log(`🔗 Fetching job description from URL: ${url}`);

    // Fetch the webpage content using Puppeteer (handles anti-scraping sites)
    let pageContent: string;
    try {
      console.log('🌐 Launching browser...');
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set realistic viewport and user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      console.log('📄 Loading page...');
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Get the text content
      pageContent = await page.evaluate(() => document.body.innerText);
      
      await browser.close();
      console.log(`✅ Fetched ${pageContent.length} characters`);
    } catch (fetchError) {
      console.error('Failed to fetch URL:', fetchError);
      return res.status(400).json({ 
        error: 'Failed to fetch URL. Please check the link and try again.',
        details: fetchError instanceof Error ? fetchError.message : 'Unknown error'
      });
    }

    // Parse with AI
    console.log(`🤖 Parsing job description with AI (${model || 'default'})...`);
    const parsed = await parseJobFromURL(pageContent, url, model);
    console.log(`✅ Successfully parsed job: ${parsed.jobTitle} at ${parsed.company}`);

    res.json(parsed);
  } catch (error) {
    console.error('Error parsing job URL:', error);
    res.status(500).json({ 
      error: 'Failed to parse job description', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;
