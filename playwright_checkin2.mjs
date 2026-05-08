import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOTS = '/tmp/screenshots';
const BASE = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const responses = {};
  page.on('response', async res => {
    const url = res.url().replace(BASE, '');
    if (url.includes('check-in') || url.includes('interpret')) {
      let body = '';
      try { body = (await res.text()).substring(0, 300); } catch {}
      responses[url] = { status: res.status(), body };
    }
  });
  page.on('console', msg => {
    if (msg.type() !== 'log') console.log(`  [${msg.type()}] ${msg.text().substring(0,150)}`);
  });

  // Login
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'hlaa.du46@gmail.com');
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  console.log('Logged in:', page.url());

  // Check-in page
  await page.goto(`${BASE}/check-in`);
  await page.waitForLoadState('networkidle');
  console.log('Check-in page URL:', page.url());

  if (page.url().includes('dashboard')) {
    console.log('Redirected - already checked in');
    await browser.close(); return;
  }

  // Fill
  const taCount = await page.locator('textarea').count();
  console.log('Textareas:', taCount);
  for (let i = 0; i < taCount; i++) {
    await page.locator('textarea').nth(i).fill('Studied calculus for 2 hours today. Felt very focused and engaged with the material.');
  }
  
  await page.screenshot({ path: `${SCREENSHOTS}/ci2-filled.png`, fullPage: true });

  // Get all buttons before click
  const btns = await page.locator('button').evaluateAll(els => 
    els.map(e => ({ text: e.textContent?.trim(), disabled: e.disabled }))
  );
  console.log('Buttons before submit:', JSON.stringify(btns));

  const submit = page.locator('button:has-text("Submit Check-In")');
  console.log('Submit visible:', await submit.isVisible(), 'disabled:', await submit.isDisabled());

  // Listen for navigation
  let navigated = false;
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) {
      console.log('Navigation →', frame.url());
      navigated = true;
    }
  });

  await submit.click();
  console.log('Clicked submit');
  
  // Wait up to 15s for dashboard
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(500);
    const url = page.url();
    console.log(`  t=${i*0.5}s URL: ${url}`);
    if (url.includes('dashboard')) { console.log('✓ Redirected!'); break; }
    if (url.includes('check-in') && i > 10) {
      // Check if error state
      const errorText = await page.locator('[class*="destructive"], [class*="error"]').allTextContents().catch(() => []);
      if (errorText.length) console.log('  Error visible:', errorText);
    }
  }
  
  await page.screenshot({ path: `${SCREENSHOTS}/ci2-final.png`, fullPage: true });
  
  console.log('\nNetwork responses:');
  Object.entries(responses).forEach(([url, { status, body }]) => {
    console.log(`  ${status} ${url}`);
    console.log(`    ${body.substring(0, 200)}`);
  });

  await browser.close();
}

run().catch(e => console.error('Error:', e.message));
