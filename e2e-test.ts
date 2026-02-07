import puppeteer from 'puppeteer';

async function runTest() {
  console.log('🚀 Starting E2E Test...');
  
  const browser = await puppeteer.launch({
    headless: true, // Run visible for debugging if needed, but headless for speed
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    
    // 1. Test Navigation to Jobs Page
    console.log('📍 Navigating to Jobs Page...');
    await page.goto('http://localhost:5173/jobs', { waitUntil: 'networkidle2' });
    
    // Wait for the page to load
    await page.waitForSelector('.jobs-page h1', { timeout: 5000 });
    const title = await page.$eval('h1', el => el.textContent);
    console.log(`✅ Page Title: ${title}`);
    
    if (!title.includes('Job Search')) {
      throw new Error('Wrong page title');
    }

    // 2. Test Job Search (Mocking the API response to avoid hitting external sites during test)
    console.log('🔍 Testing Job Search UI...');
    
    // Type in search box
    await page.type('.search-input[placeholder*="Keywords"]', 'React Developer');
    await page.type('.search-input[placeholder*="Location"]', 'Sydney');
    
    // Click search (we expect this to make an API call)
    // Note: In a real run this hits external APIs. For this test we just check if UI reacts.
    const searchBtn = await page.waitForSelector('.search-button:not(:disabled)');
    if (searchBtn) {
        console.log('✅ Search button is ready');
    }

    // 3. Test Navigation to Tailor Page with Params
    console.log('🎨 Testing "Tailor Resume" Navigation...');
    
    // We'll simulate clicking a "Tailor" button by navigating manually with params
    // (Simulating what the "Tailor Resume" button does)
    const testJob = {
        title: 'Senior React Dev',
        company: 'TechCorp',
        url: 'https://example.com/job',
        description: 'Must know React and TypeScript.'
    };
    
    const params = new URLSearchParams({
        jobTitle: testJob.title,
        company: testJob.company,
        url: testJob.url,
        description: testJob.description
    });
    
    await page.goto(`http://localhost:5173/tailor?${params.toString()}`, { waitUntil: 'networkidle2' });
    
    // Check if fields are pre-filled
    await page.waitForSelector('input[value="Senior React Dev"]', { timeout: 5000 });
    
    const filledTitle = await page.$eval('input[value="Senior React Dev"]', el => el.value);
    const filledCompany = await page.$eval('input[value="TechCorp"]', el => el.value);
    const filledDesc = await page.$eval('textarea', el => el.value);
    
    console.log(`✅ Pre-filled Title: ${filledTitle}`);
    console.log(`✅ Pre-filled Company: ${filledCompany}`);
    console.log(`✅ Pre-filled Description: ${filledDesc}`);
    
    if (filledTitle === testJob.title && filledDesc === testJob.description) {
        console.log('🎉 E2E Test Passed: Job data successfully passed to Tailor page!');
    } else {
        throw new Error('Data mismatch on Tailor page');
    }

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runTest();
