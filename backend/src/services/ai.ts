import { execSync, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const ENABLE_AI = process.env.ENABLE_AI_FEATURES === 'true';

// Model options
export const MODELS = {
  GEMINI_FLASH: 'google-gemini-cli/gemini-3-flash-preview',
  GEMINI_PRO: 'google-gemini-cli/gemini-3-pro-preview',
} as const;

export type AIModel = typeof MODELS[keyof typeof MODELS];

const DEFAULT_MODEL = MODELS.GEMINI_FLASH;

// Fallback logic: if a model fails, try these in order
const FALLBACK_ORDER: AIModel[] = [
  MODELS.GEMINI_FLASH,
  MODELS.GEMINI_PRO,
];

export async function callAI(prompt: string, model: string, isFallback = false): Promise<string> {
  console.log(`🤖 AI Call Request: model=${model}, isFallback=${isFallback}`);
  if (!ENABLE_AI) {
    throw new Error('AI features are disabled by feature flag (ENABLE_AI_FEATURES).');
  }

  try {
    if (model.startsWith('google-gemini-cli/')) {
      const geminiModel = model.replace('google-gemini-cli/', '');
      console.log(`📡 Executing Gemini CLI (${geminiModel})...`);
      
      try {
        console.log(`📡 Sending prompt to Gemini CLI (${prompt.length} chars)...`);
        
        const result = spawnSync('gemini', [
          '--model', geminiModel,
          '--output-format', 'text',
          '-p', ''
        ], { 
          encoding: 'utf8', 
          maxBuffer: 10 * 1024 * 1024,
          input: prompt,
          env: { ...process.env, GOOGLE_GENAI_USE_GCA: 'true' }
        });

        if (result.error) {
          throw result.error;
        }

        const output = (result.stdout || '').toString();
        const stderr = (result.stderr || '').toString();

        if (result.status !== 0) {
          console.error(`❌ Gemini CLI exited with status ${result.status}`);
          console.error(`Stderr: ${stderr}`);
          throw new Error(`Gemini CLI failed with status ${result.status}`);
        }

        console.log(`✅ Gemini CLI responded (${output.length} chars)`);
        if (output.length > 0) {
          const preview = output.length > 200 
            ? `${output.substring(0, 100).replace(/\n/g, ' ')}...${output.substring(output.length - 100).replace(/\n/g, ' ')}`
            : output.replace(/\n/g, ' ');
          console.log(`   Preview: ${preview}`);
        }
        return output;
      } catch (error) {
        console.error(`❌ Gemini CLI error (${model}):`, error);
        throw new Error(`Failed to get response from Gemini CLI (${model})`);
      }
    }
    
    throw new Error(`Unsupported model: ${model}`);
  } catch (error) {
    console.error(`Error calling ${model}:`, error);
    
    // If it's not already a fallback call, try the fallback chain
    if (!isFallback) {
      console.log('🔄 Attempting fallback chain...');
      for (const fallbackModel of FALLBACK_ORDER) {
        if (fallbackModel === model) continue; // Skip if it's the one that just failed
        
        try {
          console.log(`📡 Trying fallback model: ${fallbackModel}`);
          return await callAI(prompt, fallbackModel, true);
        } catch (fallbackError) {
          console.error(`Fallback failed for ${fallbackModel}, trying next...`);
        }
      }
    }
    throw error; // If all fallbacks fail, or it's a fallback call itself
  }
}

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

export async function parseResume(resumeText: string, model: AIModel = DEFAULT_MODEL): Promise<ParsedResume> {
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
      "description": "Full description with bullet points exactly as they appear in the resume. Include all responsibilities, achievements, and details. Preserve formatting with bullet points (•) or dashes (-). This is the complete role description."
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
- For experience descriptions, extract the COMPLETE text including ALL bullet points, responsibilities, and achievements. Don't summarize - capture everything.
- Preserve bullet point formatting using • or - characters
- Return ONLY valid JSON, no other text`;

  const responseText = await callAI(prompt, model);

  let jsonText = responseText.trim();
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

export async function generateStory(userNotes: string, model: AIModel = DEFAULT_MODEL): Promise<GeneratedStory> {
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

  const responseText = await callAI(prompt, model);

  let jsonText = responseText.trim();
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
}, model: AIModel = DEFAULT_MODEL): Promise<GeneratedStory> {
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

  const responseText = await callAI(prompt, model);

  let jsonText = responseText.trim();
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

export interface ParsedJobDescription {
  jobTitle: string;
  company: string;
  jobDescription: string;
}

export async function parseJobFromURL(pageContent: string, url: string, model: AIModel = DEFAULT_MODEL): Promise<ParsedJobDescription> {
  const prompt = `You are a job description parser. Extract the job title, company name, and full job description from the following webpage content.

URL: ${url}

Webpage Content:
${pageContent.substring(0, 15000)} 

Return a JSON object with this exact structure:
{
  "jobTitle": "The job title/position",
  "company": "The company/organization name",
  "jobDescription": "The complete job description including responsibilities, requirements, qualifications, etc. Keep all details and formatting."
}

Important:
- Extract the COMPLETE job description text, including all sections (responsibilities, requirements, qualifications, benefits, etc.)
- If the company name is not obvious, look for clues in the content
- Return ONLY valid JSON, no other text

Return ONLY valid JSON, no markdown or other formatting.`;

  const responseText = await callAI(prompt, model);

  let jsonText = responseText.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonText);
    return parsed as ParsedJobDescription;
  } catch (error) {
    console.error('Failed to parse AI response:', jsonText);
    throw new Error('Failed to parse job description from AI response');
  }
}

export async function storyToScript(story: {
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics?: string;
}, model: AIModel = DEFAULT_MODEL): Promise<InterviewScript> {
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

  const responseText = await callAI(prompt, model);

  let jsonText = responseText.trim();
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

export async function generateCoverLetter(
  profile: any,
  jobDescription: string,
  tailoredResume: any,
  model: AIModel = DEFAULT_MODEL
): Promise<string> {
  const prompt = `You are an expert career coach. Write a professional, compelling, and highly tailored cover letter based on the user's profile, a specific job description, and the tailored resume we just generated.

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

User Profile:
${JSON.stringify(profile)}

Tailored Resume Content:
${JSON.stringify(tailoredResume)}

Requirements:
- Professional business letter format
- Strong opening hook
- Connect specific achievements from the profile/resume to the job requirements
- Show enthusiasm for the company and role
- Keep it to 3-4 impactful paragraphs
- Use a professional but engaging tone
- Do not use placeholders like "[Company Name]" if the information is available in the JD; if not, use brackets.

Return ONLY the text of the cover letter, no other commentary.`;

  return await callAI(prompt, model);
}
