const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const logs = [];
  page.on('console', msg => logs.push('LOG: ' + msg.text()));
  page.on('pageerror', error => logs.push('ERROR: ' + error.message));
  page.on('requestfailed', request =>
    logs.push('REQ FAILED: ' + request.url() + ' ' + request.failure().errorText)
  );

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
  fs.writeFileSync('error.log', logs.join('\n'));
  await browser.close();
})();
