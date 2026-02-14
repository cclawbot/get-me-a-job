import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import puppeteer from 'puppeteer';
import { parseJobFromURL, generateCoverLetter, callAI } from '../services/ai';

const router = Router();
const prisma = new PrismaClient();
const ENABLE_AI = process.env.ENABLE_AI_FEATURES === 'true';

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

// Update resume (edit mode)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resumeId = parseInt(id);
    const { summary, experiences, keywords } = req.body;

    // Check if resume exists
    const resume = await prisma.tailoredResume.findUnique({
      where: { id: resumeId },
    });

    if (!resume) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    // Parse existing content
    const existingContent = JSON.parse(resume.content);

    // Update with new values
    const updatedContent = {
      ...existingContent,
      summary: summary || existingContent.summary,
      experiences: experiences || existingContent.experiences,
      keywords: keywords || existingContent.keywords,
    };

    // Save updated resume
    const updatedResume = await prisma.tailoredResume.update({
      where: { id: resumeId },
      data: {
        content: JSON.stringify(updatedContent),
        keywords: JSON.stringify(keywords || existingContent.keywords),
      },
    });

    res.json({ 
      message: 'Resume updated successfully', 
      id: resumeId,
      content: updatedContent
    });
  } catch (error) {
    console.error('Error updating resume:', error);
    res.status(500).json({ error: 'Failed to update resume' });
  }
});

// Tailor resume based on job description
router.post('/tailor', async (req, res) => {
  try {
    const userId = 'default';
    const { jobDescription, jobTitle, company, model } = req.body;

    if (!jobDescription || !jobTitle) {
      return res.status(400).json({ error: 'Job description and title are required' });
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

    // Build context for AI
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

    // Call AI to analyze JD and tailor resume
    const prompt = `You are an expert resume writer and ATS optimization specialist. Your task is to:
1. Analyze the job description to extract key requirements, skills, and keywords
2. Match the candidate's experience and stories to the job requirements
3. Generate a tailored resume that emphasizes relevant experience
4. Optimize for ATS by incorporating keywords naturally
5. Use strong action verbs and quantifiable achievements

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

Return a JSON object with this exact structure:
{
  "keywords": ["skill1", "skill2"],
  "summary": "tailored professional summary (2-3 sentences, NATURAL TONE)",
  "summaryReasoningPoints": ["Emphasized X per JD quote Y", "Added metrics for impact", "Short point 3"],
  "experiences": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM or Present",
      "bullets": ["achievement 1", "achievement 2"],
      "reasoningPoints": ["Why point 1 with JD quote", "Why point 2", "Why point 3"]
    }
  ],
  "tailoringNotesPoints": ["Key change 1 with JD quote", "Key change 2", "Key change 3"],
  "matchedStories": [1, 2, 3],
  "atsScore": 85
}

IMPORTANT FOR REASONING:
- Use reasoningPoints, summaryReasoningPoints, tailoringNotesPoints as STRING ARRAYS
- Each point is ONE string in the array (no newlines needed)
- Be concise, sacrifice grammar for brevity
- Include JD quotes in the point text
- Keep each point to 1 short sentence/phrase
- Example: ["Emphasized SQL per JD: 'strong SQL required'", "Added metrics to show impact", "Removed outdated tech"]

Return ONLY valid JSON, no markdown formatting, no code blocks, no extra text.`;

    const responseText = await callAI(prompt, model || 'google-gemini-cli/gemini-3-flash-preview');

    // Extract JSON from response (might be wrapped in markdown code blocks)
    let jsonText = responseText.trim();
    
    console.log('🔍 Raw AI response (first 200 chars):', jsonText.substring(0, 200));
    
    // Try to extract JSON from code blocks
    const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
      console.log('✅ Extracted from code block');
    } else {
      // Remove leading/trailing backticks if present
      jsonText = jsonText.replace(/^`+|`+$/g, '').trim();
    }
    
    // Find JSON object boundaries
    const jsonStart = jsonText.indexOf('{');
    const jsonEnd = jsonText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
      console.log('✅ Extracted JSON boundaries');
    }
    
    console.log('🔍 Final JSON (first 200 chars):', jsonText.substring(0, 200));

    let tailoredContent;
    try {
      tailoredContent = JSON.parse(jsonText);
    } catch (parseError: any) {
      console.error('❌ JSON Parse Error:', parseError.message);
      console.error('📄 Problematic JSON (first 500 chars):', jsonText.substring(0, 500));
      console.error('📄 Problematic JSON (last 200 chars):', jsonText.substring(jsonText.length - 200));
      
      // Try to fix common issues
      let fixedJson = jsonText
        .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas
        .replace(/\n/g, '\\n')  // Escape newlines in strings
        .replace(/\t/g, '\\t'); // Escape tabs
      
      try {
        tailoredContent = JSON.parse(fixedJson);
        console.log('✅ JSON fixed and parsed successfully');
      } catch (secondError) {
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }
    }

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

// Generate cover letter
router.post('/generate-cover-letter', async (req, res) => {
  try {
    const userId = 'default';
    const { jobDescription, tailoredResume } = req.body;

    if (!jobDescription || !tailoredResume) {
      return res.status(400).json({ error: 'Job description and tailored resume content are required' });
    }

    // Fetch user profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        experiences: { orderBy: { startDate: 'desc' } },
        educations: { orderBy: { endDate: 'desc' } },
        certifications: { orderBy: { date: 'desc' } },
      },
    });

    if (!profile) {
      return res.status(400).json({ error: 'Please create your profile first' });
    }

    const coverLetter = await generateCoverLetter(profile, jobDescription, tailoredResume);
    res.json({ coverLetter });
  } catch (error: any) {
    console.error('Error generating cover letter:', error);
    res.status(500).json({ error: 'Failed to generate cover letter', details: error.message });
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

    // Sanitize filename - remove special characters and normalize spaces
    const safeFilename = resume.jobTitle
      .replace(/[^\w\s-]/g, '')  // Remove special chars except word chars, spaces, hyphens
      .replace(/\s+/g, '-')       // Replace spaces with hyphens
      .replace(/-+/g, '-')        // Replace multiple hyphens with single
      .substring(0, 100);         // Limit length
    
    res.contentType('application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume-${safeFilename}.pdf"`);
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
