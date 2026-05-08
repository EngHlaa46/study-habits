import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOTS = '/tmp/screenshots';
const BASE = 'http://localhost:3000';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const networkLog = [];
  page.on('request', req => {
    if (req.url().includes('check-in')) networkLog.push(`→ ${req.method()} ${req.url().replace(BASE,'')}`);
  });
  page.on('response', async res => {
    if (res.url().includes('check-in')) {
      let body = '';
      try { body = await res.text(); body = body.substring(0, 200); } catch {}
      networkLog.push(`← ${res.status()} ${res.url().replace(BASE,'')} | ${body}`);
    }
  });
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  // Login properly - wait for navigation
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'hlaa.du46@gmail.com');
  await page.fill('input[type="password"]', 'test123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"]')
  ]);
  console.log('After login URL:', page.url());
  
  // Check cookies
  const cookies = await ctx.cookies();
  const sessionCookie = cookies.find(c => c.name.includes('session'));
  console.log('Session cookie:', sessionCookie ? `${sessionCookie.name}=${sessionCookie.value.substring(0,20)}...` : 'MISSING');

  // Navigate to check-in
  await page.goto(`${BASE}/check-in`);
  await page.waitForLoadState('networkidle');
  console.log('Check-in URL:', page.url());
  await page.screenshot({ path: `${SCREENSHOTS}/ci-01-loaded.png`, fullPage: true });

  if (page.url().includes('login')) {
    console.log('REDIRECT TO LOGIN - auth failed');
    await browser.close();
    return;
  }

  // Questions
  const questions = await page.locator('p.text-sm.font-medium').allTextContents();
  console.log('Questions:', questions.length);
  questions.forEach((q, i) => console.log(`  Q${i+1}: ${q.trim().substring(0, 60)}`));

  const taCount = await page.locator('textarea').count();
  console.log('Textareas:', taCount);
  for (let i = 0; i < taCount; i++) {
    await page.locator('textarea').nth(i).fill('I studied for 2 hours today. Really focused on Python exercises.');
  }

  await page.waitForTimeout(200);
  
  const submitBtn = page.locator('button:has-text("Submit Check-In")');
  console.log('Submit visible:', await submitBtn.isVisible());
  console.log('Submit disabled:', await submitBtn.isDisabled().catch(() => 'error'));
  
  await page.screenshot({ path: `${SCREENSHOTS}/ci-02-filled.png`, fullPage: true });

  if (await submitBtn.isVisible() && !(await submitBtn.isDisabled())) {
    await submitBtn.click();
    console.log('Submitted. Waiting...');
    await page.waitForTimeout(8000);
    console.log('After submit URL:', page.url());
    await page.screenshot({ path: `${SCREENSHOTS}/ci-03-done.png`, fullPage: true });
  }

  console.log('\nNetwork log:');
  networkLog.forEach(l => console.log(' ', l.substring(0, 150)));
  console.log('\nErrors:', errors.length ? errors : 'none');

  await browser.close();
}

run().catch(e => console.error('Error:', e.message));
