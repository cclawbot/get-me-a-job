const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  const pages = [
    { url: 'http://localhost:5173/profile', name: 'profile' },
    { url: 'http://localhost:5173/stories', name: 'stories' },
    { url: 'http://localhost:5173/tailor', name: 'tailor' },
    { url: 'http://localhost:5173/resumes', name: 'resumes' }
  ];
  
  for (const pageInfo of pages) {
    console.log(`Capturing ${pageInfo.name}...`);
    await page.goto(pageInfo.url, { waitUntil: 'networkidle0' });
    await page.screenshot({ 
      path: `screenshot-${pageInfo.name}.png`,
      fullPage: true 
    });
  }
  
  console.log('All screenshots saved!');
  await browser.close();
})();
