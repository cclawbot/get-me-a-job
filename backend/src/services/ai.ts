import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-3-5-sonnet-20241022';

export interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  summary: string;
  skills: string[];
  experiences: Array<{
    company: string;
    title: string;
    location: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }>;
  educations: Array<{
    institution: string;
    degree: string;
    field?: string;
    startDate?: string;
    endDate?: string;
    gpa?: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    date?: string;
    url?: string;
  }>;
}

export async function parseResume(resumeText: string): Promise<ParsedResume> {
  const prompt = `You are a resume parser. Extract structured information from the following resume text and return it as valid JSON.

Resume text:
${resumeText}

Return a JSON object with this exact structure:
{
  "name": "Full Name",
  "email": "email@example.com",
  "phone": "phone number",
  "summary": "professional summary/objective",
  "skills": ["skill1", "skill2", ...],
  "experiences": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "location": "City, State",
      "startDate": "Jan 2020",
      "endDate": "Dec 2022",
      "current": false,
      "description": "Brief description or key achievements"
    }
  ],
  "educations": [
    {
      "institution": "University Name",
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "startDate": "2016",
      "endDate": "2020",
      "gpa": "3.8"
    }
  ],
  "certifications": [
    {
      "name": "AWS Certified Solutions Architect",
      "issuer": "Amazon Web Services",
      "date": "2021",
      "url": "credential url if available"
    }
  ]
}

Important:
- Extract all information accurately
- If information is missing, use empty string or empty array
- For current positions, set "current": true and "endDate": ""
- Parse dates into readable format (e.g., "Jan 2020", "2020-2022")
- Return ONLY valid JSON, no other text`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI');
  }

  // Extract JSON from response (might be wrapped in markdown code blocks)
  let jsonText = textContent.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonText);
    return parsed as ParsedResume;
  } catch (error) {
    console.error('Failed to parse AI response:', jsonText);
    throw new Error('Failed to parse resume data from AI response');
  }
}

export interface GeneratedStory {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics?: string;
  tags: string[];
}

export async function generateStory(userNotes: string): Promise<GeneratedStory> {
  const prompt = `You are an expert career coach helping someone create a compelling STAR story for job interviews.

User's rough notes:
${userNotes}

Create a well-structured STAR (Situation, Task, Action, Result) story based on these notes. Make it:
- Specific and concrete
- Achievement-focused with quantifiable results when possible
- Professional and compelling
- Interview-ready

Return a JSON object with this structure:
{
  "title": "Brief 3-5 word title for the story",
  "situation": "Context and background (2-3 sentences)",
  "task": "What needed to be done and why (1-2 sentences)",
  "action": "Specific actions you took (3-4 bullet points or sentences)",
  "result": "Outcomes and impact (2-3 sentences with metrics if possible)",
  "metrics": "Key quantifiable achievements (e.g., '30% improvement', '$50K cost savings')",
  "tags": ["tag1", "tag2", "tag3"] // Relevant skills/competencies demonstrated
}

Return ONLY valid JSON, no other text.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI');
  }

  let jsonText = textContent.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonText);
    return parsed as GeneratedStory;
  } catch (error) {
    console.error('Failed to parse AI response:', jsonText);
    throw new Error('Failed to generate story from AI response');
  }
}

export async function optimizeStory(story: {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics?: string;
}): Promise<GeneratedStory> {
  const prompt = `You are an expert career coach. Improve this STAR story to make it more compelling and interview-ready.

Current story:
Title: ${story.title}
Situation: ${story.situation}
Task: ${story.task}
Action: ${story.action}
Result: ${story.result}
${story.metrics ? `Metrics: ${story.metrics}` : ''}

Enhance this story by:
- Making it more specific and concrete
- Strengthening the action section with clear steps
- Emphasizing quantifiable results and impact
- Using stronger action verbs
- Keeping it concise but impactful

Return a JSON object with this structure:
{
  "title": "Improved title",
  "situation": "Enhanced situation",
  "task": "Enhanced task",
  "action": "Enhanced action with specific steps",
  "result": "Enhanced result with stronger impact",
  "metrics": "Key quantifiable achievements",
  "tags": ["relevant", "skills", "demonstrated"]
}

Return ONLY valid JSON, no other text.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI');
  }

  let jsonText = textContent.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonText);
    return parsed as GeneratedStory;
  } catch (error) {
    console.error('Failed to parse AI response:', jsonText);
    throw new Error('Failed to optimize story from AI response');
  }
}

export interface InterviewScript {
  naturalOpening: string;
  keyPoints: string[];
  closingStatement: string;
  practiceQuestions: string[];
}

export async function storyToScript(story: {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics?: string;
}): Promise<InterviewScript> {
  const prompt = `You are an interview coach. Convert this STAR story into a natural, conversational interview script.

Story:
Title: ${story.title}
Situation: ${story.situation}
Task: ${story.task}
Action: ${story.action}
Result: ${story.result}
${story.metrics ? `Metrics: ${story.metrics}` : ''}

Create an interview script that:
- Flows naturally in conversation
- Hits all key STAR points without sounding robotic
- Is easy to remember and deliver
- Stays under 2 minutes when spoken

Return a JSON object:
{
  "naturalOpening": "Natural way to start telling this story in an interview",
  "keyPoints": [
    "First key point to mention",
    "Second key point",
    "Third key point",
    "etc."
  ],
  "closingStatement": "Strong closing that emphasizes the impact",
  "practiceQuestions": [
    "Interview question this story could answer",
    "Another relevant question",
    "etc."
  ]
}

Return ONLY valid JSON, no other text.`;

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const textContent = message.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI');
  }

  let jsonText = textContent.text.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonText);
    return parsed as InterviewScript;
  } catch (error) {
    console.error('Failed to parse AI response:', jsonText);
    throw new Error('Failed to generate interview script from AI response');
  }
}
