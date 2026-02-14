import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import { callAI, MODELS } from './ai';

// Initialize stealth plugin
puppeteer.use(StealthPlugin());

const ENABLE_AI = process.env.ENABLE_AI_FEATURES === 'true';

export interface ScrapedJob {
  title: string;
  company: string;
  location: string;
  salary?: string;
  url: string;
  description?: string;
  postedDate?: string;
  workType?: string;
  remote?: boolean;
  source: 'seek' | 'linkedin' | 'indeed';
}

export interface SearchParams {
  keywords: string;
  location?: string;
  workType?: string; // full-time, part-time, contract
  maxResults?: number;
}

// Helper for random delay (jitter)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms + Math.random() * 1000));

// Human-like scrolling
async function humanScroll(page: Page) {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight || totalHeight > 3000) {
          clearInterval(timer);
          resolve();
        }
      }, 100 + Math.random() * 200);
    });
  });
}

// Helper to create a stealth browser
export async function createBrowser(): Promise<Browser> {
  // @ts-ignore - puppeteer-extra launch type mismatch with puppeteer Browser
  return puppeteer.launch({
    headless: true, // LinkedIn/Indeed often flag 'shell' headless, but stealth helps
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
  });
}

// Helper to set up a stealth page
export async function setupPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Randomized User-Agent from a modern pool would be better, but this is a solid start
  await page.setUserAgent(
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
  );

  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Cache-Control': 'max-age=0',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  });
  
  return page;
}

// Parse job listings with AI
async function parseJobListingsWithAI(
  pageContent: string,
  source: string
): Promise<Partial<ScrapedJob>[]> {
  if (!ENABLE_AI) {
    console.log('AI parsing disabled, falling back to basic scraping');
    return [];
  }

  const prompt = `You are a job listing parser. Extract job listings from the following ${source} search results page.

Page Content:
${pageContent.substring(0, 15000)}

Extract up to 10 visible job listings. For each job, provide:
- title: Job title
- company: Company name
- location: Location/city
- salary: Salary if shown (or null)
- postedDate: When posted (e.g., "2 days ago", "Posted today")
- workType: full-time, part-time, contract, casual (if shown)
- remote: true if remote/hybrid mentioned

Return a JSON array of jobs:
[
  {
    "title": "Software Engineer",
    "company": "TechCorp",
    "location": "Sydney",
    "salary": "$120,000 - $150,000",
    "postedDate": "2 days ago",
    "workType": "full-time",
    "remote": false
  }
]

Return ONLY valid JSON array, no other text. If no jobs found, return [].`;

  const jsonTextRaw = await callAI(prompt, MODELS.GEMINI_FLASH);

  let jsonText = jsonTextRaw.trim();
  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1];
  }

  // Find array boundaries
  const arrayStart = jsonText.indexOf('[');
  const arrayEnd = jsonText.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    jsonText = jsonText.substring(arrayStart, arrayEnd + 1);
  }

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.log('Raw JSON text attempted:', jsonText);
    return [];
  }
}

// Scrape Seek.com.au
export async function scrapeSeek(params: SearchParams): Promise<ScrapedJob[]> {
  const browser = await createBrowser();
  const jobs: ScrapedJob[] = [];

  try {
    const page = await setupPage(browser);
    
    // Build Seek URL
    const searchQuery = encodeURIComponent(params.keywords);
    const location = params.location ? encodeURIComponent(params.location) : '';
    let url = `https://www.seek.com.au/${searchQuery}-jobs`;
    if (location) {
      url += `/in-${location}`;
    }
    
    console.log(`🔍 Scraping Seek: ${url}`);
    
    await delay(1000);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    await delay(2000);
    
    // Human-like scrolling
    console.log('⏳ Performing human-like scrolling...');
    await humanScroll(page);
    
    // Wait for job cards to load
    console.log('⏳ Waiting for job cards...');
    await page.waitForSelector('[data-testid="job-card"], article, .job-card, [data-automation="jobCard"]', { timeout: 30000 }).catch((err) => {
      console.log('⚠️ Seek: Job cards didn\'t appear within 30s, continuing anyway...');
    });
    
    // Get page content
    const pageContent = await page.evaluate(() => document.body.innerText);
    
    // Also extract job URLs directly from the page
    const jobLinks = await page.evaluate(() => {
      const links: { url: string; title: string }[] = [];
      const jobCards = document.querySelectorAll('article a[href*="/job/"], [data-testid="job-card"] a, a[data-automation="jobTitle"]');
      jobCards.forEach((el) => {
        const href = el.getAttribute('href');
        const title = el.textContent?.trim();
        if (href && title && href.includes('/job/')) {
          const fullUrl = href.startsWith('http') ? href : `https://www.seek.com.au${href}`;
          links.push({ url: fullUrl, title });
        }
      });
      return links.slice(0, 20); // Limit to 20
    });
    
    console.log(`📋 Found ${jobLinks.length} job links on Seek`);
    
    // Parse with AI
    const parsedJobs = await parseJobListingsWithAI(pageContent, 'Seek');
    
    // Merge parsed jobs with URLs
    const maxResults = params.maxResults || 10;
    for (let i = 0; i < Math.min(parsedJobs.length, maxResults); i++) {
      const parsed = parsedJobs[i];
      const linkMatch = jobLinks.find(
        (l) => l.title.toLowerCase().includes(parsed.title?.toLowerCase().substring(0, 20) || '')
      );
      
      jobs.push({
        title: parsed.title || 'Unknown Title',
        company: parsed.company || 'Unknown Company',
        location: parsed.location || params.location || 'Australia',
        salary: parsed.salary,
        url: linkMatch?.url || `https://www.seek.com.au/${searchQuery}-jobs`,
        postedDate: parsed.postedDate,
        workType: parsed.workType,
        remote: parsed.remote || false,
        source: 'seek',
      });
    }
    
    // If AI parsing didn't work well, use fallback from links
    if (jobs.length === 0 && jobLinks.length > 0) {
      for (const link of jobLinks.slice(0, maxResults)) {
        jobs.push({
          title: link.title,
          company: 'See listing',
          location: params.location || 'Australia',
          url: link.url,
          source: 'seek',
          remote: false,
        });
      }
    }
    
  } catch (error) {
    console.error('Seek scraping error:', error);
  } finally {
    await browser.close();
  }

  console.log(`✅ Scraped ${jobs.length} jobs from Seek`);
  return jobs;
}

// Scrape LinkedIn Jobs (public listings)
export async function scrapeLinkedIn(params: SearchParams): Promise<ScrapedJob[]> {
  const browser = await createBrowser();
  const jobs: ScrapedJob[] = [];

  try {
    const page = await setupPage(browser);
    
    // Build LinkedIn Jobs URL (public guest search)
    const searchQuery = encodeURIComponent(params.keywords);
    const location = params.location ? encodeURIComponent(params.location) : '';
    let url = `https://www.linkedin.com/jobs/search?keywords=${searchQuery}`;
    if (location) {
      url += `&location=${location}`;
    }
    
    console.log(`🔍 Scraping LinkedIn: ${url}`);
    
    // Add random delay before navigation
    await delay(2000);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for a bit after load
    await delay(3000);
    
    // Human-like scrolling to trigger lazy loading and look real
    console.log('⏳ Performing human-like scrolling...');
    await humanScroll(page);
    
    // Wait for job cards
    console.log('⏳ Waiting for LinkedIn job results...');
    await page.waitForSelector('.jobs-search__results-list, .base-search-card, .job-card-container', { timeout: 30000 }).catch(() => {
      console.log('⚠️ LinkedIn: Job results didn\'t appear within 30s (possibly hit auth wall)');
    });
    
    // Final small delay before extraction
    await delay(1500);
    
    // Get page content
    const pageContent = await page.evaluate(() => document.body.innerText);
    
    // Extract job links
    const jobLinks = await page.evaluate(() => {
      const links: { url: string; title: string; company: string }[] = [];
      const cards = document.querySelectorAll('.base-search-card, .job-card-container, [data-job-id]');
      cards.forEach((card) => {
        const linkEl = card.querySelector('a.base-card__full-link, a[href*="/jobs/view/"]');
        const titleEl = card.querySelector('.base-search-card__title, .job-card-list__title, h3');
        const companyEl = card.querySelector('.base-search-card__subtitle, .job-card-container__company-name, h4');
        
        if (linkEl && titleEl) {
          const href = linkEl.getAttribute('href');
          if (href) {
            links.push({
              url: href.startsWith('http') ? href : `https://www.linkedin.com${href}`,
              title: titleEl.textContent?.trim() || '',
              company: companyEl?.textContent?.trim() || '',
            });
          }
        }
      });
      return links.slice(0, 20);
    });
    
    console.log(`📋 Found ${jobLinks.length} job links on LinkedIn`);
    
    // Parse with AI
    const parsedJobs = await parseJobListingsWithAI(pageContent, 'LinkedIn');
    
    const maxResults = params.maxResults || 10;
    for (let i = 0; i < Math.min(parsedJobs.length, maxResults); i++) {
      const parsed = parsedJobs[i];
      const linkMatch = jobLinks.find(
        (l) => l.title.toLowerCase().includes(parsed.title?.toLowerCase().substring(0, 15) || '') ||
               l.company.toLowerCase().includes(parsed.company?.toLowerCase().substring(0, 10) || '')
      );
      
      jobs.push({
        title: parsed.title || 'Unknown Title',
        company: parsed.company || 'Unknown Company',
        location: parsed.location || params.location || 'Unknown',
        salary: parsed.salary,
        url: linkMatch?.url || url,
        postedDate: parsed.postedDate,
        workType: parsed.workType,
        remote: parsed.remote || false,
        source: 'linkedin',
      });
    }
    
    // Fallback to direct links
    if (jobs.length === 0 && jobLinks.length > 0) {
      for (const link of jobLinks.slice(0, maxResults)) {
        jobs.push({
          title: link.title,
          company: link.company || 'See listing',
          location: params.location || 'Unknown',
          url: link.url,
          source: 'linkedin',
          remote: false,
        });
      }
    }
    
  } catch (error) {
    console.error('LinkedIn scraping error:', error);
  } finally {
    await browser.close();
  }

  console.log(`✅ Scraped ${jobs.length} jobs from LinkedIn`);
  return jobs;
}

// Scrape Indeed
export async function scrapeIndeed(params: SearchParams): Promise<ScrapedJob[]> {
  const browser = await createBrowser();
  const jobs: ScrapedJob[] = [];

  try {
    const page = await setupPage(browser);
    
    // Build Indeed URL
    const searchQuery = encodeURIComponent(params.keywords);
    const location = params.location ? encodeURIComponent(params.location) : '';
    let url = `https://au.indeed.com/jobs?q=${searchQuery}`;
    if (location) {
      url += `&l=${location}`;
    }
    
    console.log(`🔍 Scraping Indeed: ${url}`);
    
    // Random delay before navigation
    await delay(1500);
    
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for a bit
    await delay(2500);
    
    // Human-like scrolling
    console.log('⏳ Performing human-like scrolling...');
    await humanScroll(page);
    
    // Wait for job cards
    await page.waitForSelector('.job_seen_beacon, .jobsearch-ResultsList, .result', { timeout: 30000 }).catch(() => {});
    
    // Final delay
    await delay(1000);
    
    // Get page content
    const pageContent = await page.evaluate(() => document.body.innerText);
    
    // Extract job links
    const jobLinks = await page.evaluate(() => {
      const links: { url: string; title: string; company: string }[] = [];
      const cards = document.querySelectorAll('.job_seen_beacon, .result, [data-jk]');
      cards.forEach((card) => {
        const titleEl = card.querySelector('h2 a, .jobTitle a, a[data-jk]');
        const companyEl = card.querySelector('.companyName, [data-testid="company-name"]');
        
        if (titleEl) {
          const href = titleEl.getAttribute('href');
          if (href) {
            links.push({
              url: href.startsWith('http') ? href : `https://au.indeed.com${href}`,
              title: titleEl.textContent?.trim() || '',
              company: companyEl?.textContent?.trim() || '',
            });
          }
        }
      });
      return links.slice(0, 20);
    });
    
    console.log(`📋 Found ${jobLinks.length} job links on Indeed`);
    
    // Parse with AI
    const parsedJobs = await parseJobListingsWithAI(pageContent, 'Indeed');
    
    const maxResults = params.maxResults || 10;
    for (let i = 0; i < Math.min(parsedJobs.length, maxResults); i++) {
      const parsed = parsedJobs[i];
      const linkMatch = jobLinks.find(
        (l) => l.title.toLowerCase().includes(parsed.title?.toLowerCase().substring(0, 15) || '')
      );
      
      jobs.push({
        title: parsed.title || 'Unknown Title',
        company: parsed.company || 'Unknown Company',
        location: parsed.location || params.location || 'Australia',
        salary: parsed.salary,
        url: linkMatch?.url || url,
        postedDate: parsed.postedDate,
        workType: parsed.workType,
        remote: parsed.remote || false,
        source: 'indeed',
      });
    }
    
    // Fallback
    if (jobs.length === 0 && jobLinks.length > 0) {
      for (const link of jobLinks.slice(0, maxResults)) {
        jobs.push({
          title: link.title,
          company: link.company || 'See listing',
          location: params.location || 'Australia',
          url: link.url,
          source: 'indeed',
          remote: false,
        });
      }
    }
    
  } catch (error) {
    console.error('Indeed scraping error:', error);
  } finally {
    await browser.close();
  }

  console.log(`✅ Scraped ${jobs.length} jobs from Indeed`);
  return jobs;
}

// Search all sources
export async function searchAllSources(params: SearchParams): Promise<ScrapedJob[]> {
  console.log(`🚀 Starting job search across all sources for: "${params.keywords}"`);
  
  const results = await Promise.allSettled([
    scrapeSeek(params),
    scrapeLinkedIn(params),
    scrapeIndeed(params),
  ]);
  
  const allJobs: ScrapedJob[] = [];
  
  results.forEach((result, index) => {
    const source = ['Seek', 'LinkedIn', 'Indeed'][index];
    if (result.status === 'fulfilled') {
      console.log(`✅ ${source}: ${result.value.length} jobs`);
      allJobs.push(...result.value);
    } else {
      console.error(`❌ ${source} failed:`, result.reason);
    }
  });
  
  // Deduplicate by URL
  const seen = new Set<string>();
  const uniqueJobs = allJobs.filter((job) => {
    if (seen.has(job.url)) return false;
    seen.add(job.url);
    return true;
  });
  
  console.log(`📊 Total unique jobs: ${uniqueJobs.length}`);
  return uniqueJobs;
}

// Fetch full job description from URL
export async function fetchJobDescription(url: string): Promise<string> {
  const browser = await createBrowser();
  
  try {
    const page = await setupPage(browser);
    
    // Add a small delay before fetching description
    await delay(1000 + Math.random() * 2000);
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Scroll a bit to look real
    await page.evaluate(() => window.scrollBy(0, 500));
    await delay(1000);
    
    const content = await page.evaluate(() => document.body.innerText);
    return content;
  } finally {
    await browser.close();
  }
}
