const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });
  
  console.log('Navigating to app...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  
  console.log('Taking screenshot...');
  await page.screenshot({ 
    path: 'app-screenshot.png',
    fullPage: true 
  });
  
  console.log('Screenshot saved to app-screenshot.png');
  await browser.close();
})();
