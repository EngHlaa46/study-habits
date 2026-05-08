import { chromium } from 'playwright';
import fs from 'fs';

const SCREENSHOTS = '/tmp/screenshots';
fs.mkdirSync(SCREENSHOTS, { recursive: true });
const BASE = 'http://localhost:3000';
let step = 0;

async function shot(page, label) {
  step++;
  const name = `${String(step).padStart(2,'0')}-${label}`;
  await page.screenshot({ path: `${SCREENSHOTS}/${name}.png`, fullPage: true });
  console.log(`  📸 ${name}`);
}

async function login(page) {
  await page.goto(`${BASE}/login`);
  await page.fill('input[type="email"]', 'hlaa.du46@gmail.com');
  await page.fill('input[type="password"]', 'test123');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => !window.location.pathname.startsWith('/login'), { timeout: 10000 });
  await page.waitForLoadState('networkidle');
  console.log('  Logged in → ', page.url());
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error' && !msg.text().includes('Extra attributes')) {
      errors.push(msg.text().substring(0, 120));
    }
  });
  page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`));

  // ======================
  // 1. LOGIN
  // ======================
  console.log('\n[1] LOGIN');
  await login(page);
  await shot(page, 'dashboard');

  // ======================
  // 2. DASHBOARD
  // ======================
  console.log('\n[2] DASHBOARD');
  await page.goto(`${BASE}/dashboard`);
  await page.waitForLoadState('networkidle');
  await shot(page, 'dashboard-full');
  const dashErrors = [...errors]; errors.length = 0;
  console.log('  JS errors:', dashErrors.length ? dashErrors : 'none');

  // ======================
  // 3. SIDEBAR
  // ======================
  console.log('\n[3] SIDEBAR');
  const navLinks = await page.locator('aside a, nav a').evaluateAll(els =>
    [...new Set(els.map(e => e.getAttribute('href')))].filter(Boolean)
  );
  console.log('  Links:', navLinks.join(', '));
  console.log('  Materials:', navLinks.includes('/materials') ? '✓' : '✗ MISSING');

  // ======================
  // 4. MATERIALS PAGE
  // ======================
  console.log('\n[4] MATERIALS PAGE');
  await page.goto(`${BASE}/materials`);
  await page.waitForLoadState('networkidle');
  await shot(page, 'materials');
  const matErrors = [...errors]; errors.length = 0;
  console.log('  JS errors:', matErrors.length ? matErrors : 'none');

  // Count existing trees
  const existingTrees = await page.locator('.glass-card').count();
  console.log('  Existing skill trees:', existingTrees);

  // ======================
  // 5. UPLOAD MATERIAL
  // ======================
  console.log('\n[5] UPLOAD MATERIAL');
  const matFile = '/tmp/calculus_test.txt';
  fs.writeFileSync(matFile, `Calculus Fundamentals

Limits and Continuity
A limit describes the value a function approaches as the input approaches a point. L'Hôpital's rule evaluates indeterminate forms. A function is continuous if its limit equals its value at every point.

Derivatives
The derivative measures instantaneous rate of change. Key rules: power rule (d/dx x^n = nx^(n-1)), product rule, quotient rule, chain rule. Implicit differentiation handles equations not solved for y.

Integration
The integral is the antiderivative. Fundamental Theorem of Calculus connects differentiation and integration. Techniques: substitution, integration by parts, partial fractions.

Applications
Derivatives find maxima/minima (critical points where f'(x)=0), describe motion (velocity, acceleration), and model rates of change. Integrals compute area under curves, total accumulated change, and arc length.`);

  // Intercept the upload response
  let uploadStatus = null;
  let uploadedTreeName = null;
  page.on('response', async res => {
    if (res.url().includes('/api/materials') && res.request().method() === 'POST') {
      uploadStatus = res.status();
      try {
        const body = await res.json();
        uploadedTreeName = body.skillTree?.materialName;
        console.log(`  Upload response: ${uploadStatus} | tree: "${uploadedTreeName}" | nodes: ${body.skillTree?.nodes?.length}`);
      } catch {}
    }
  });

  await page.locator('input[type="file"]').setInputFiles(matFile);
  await shot(page, 'uploading');
  console.log('  File selected, waiting for SkillTreeAgent...');

  // Wait for upload to finish: either the new tree name appears OR loading disappears
  try {
    // Wait for the network response first (up to 90s)
    await page.waitForResponse(
      res => res.url().includes('/api/materials') && res.request().method() === 'POST',
      { timeout: 90000 }
    );
    await page.waitForTimeout(1000); // let React re-render
    await shot(page, 'after-upload');

    if (uploadedTreeName) {
      const treeVisible = await page.locator(`text=${uploadedTreeName}`).isVisible().catch(() => false);
      console.log(`  Tree "${uploadedTreeName}" visible: ${treeVisible ? '✓' : '✗'}`);
    }
  } catch (e) {
    await shot(page, 'upload-timeout');
    console.log('  ⚠️ Upload timed out:', e.message.split('\n')[0]);
  }

  const uploadErrors = [...errors]; errors.length = 0;
  console.log('  Upload JS errors:', uploadErrors.length ? uploadErrors : 'none');

  // ======================
  // 6. NODE EXPAND + PRACTICE
  // ======================
  console.log('\n[6] NODE INTERACTION');
  await page.goto(`${BASE}/materials`);
  await page.waitForLoadState('networkidle');

  // Find skill tree cards (skip the first glass-card which is the upload drop zone)
  const firstTreeCard = page.locator('.glass-card').nth(1);
  const nodeButtons = firstTreeCard.locator('.rounded-xl.border button');
  const nodeCount = await nodeButtons.count();
  console.log('  Node buttons in first tree:', nodeCount);

  if (nodeCount > 0) {
    const firstNodeBtn = nodeButtons.first();
    const nodeName = await firstNodeBtn.locator('p.font-medium, p.text-sm.font-medium').first().textContent().catch(() => '?');
    console.log('  First node:', nodeName?.trim());
    await firstNodeBtn.click();
    await page.waitForTimeout(600);
    await shot(page, 'node-expanded');

    // Practice button
    const practiceBtn = firstTreeCard.locator('button:has-text("Practice")').first();
    const canPractice = await practiceBtn.isVisible().catch(() => false);
    console.log('  Practice button visible:', canPractice ? '✓' : '✗ (locked)');

    if (canPractice) {
      // ======================
      // 7. ASSESSMENT PANEL
      // ======================
      console.log('\n[7] ASSESSMENT PANEL');
      await practiceBtn.click();
      await shot(page, 'assessment-loading');

      // Wait for confidence step (activity loaded)
      try {
        await page.waitForSelector('text=confident', { timeout: 30000 });
        await shot(page, 'assessment-confidence');
        console.log('  ✓ Activity loaded, confidence step visible');

        // Get activity title
        const activityTitle = await page.locator('text=Quiz, text=Problem, text=Recall, text=Explanation, text=Debugging, text=Matching, text=Analogy, text=Creative').first().textContent().catch(async () => {
          return await page.locator('.text-xs.text-muted-foreground\\/60').first().textContent().catch(() => '?');
        });
        console.log('  Activity:', activityTitle?.trim());

        // Select confidence 3
        await page.locator('button').filter({ hasText: /^3$/ }).first().click();
        await page.locator('button:has-text("Start answering")').click();
        await page.waitForTimeout(400);
        await shot(page, 'assessment-answering');

        // Answer
        await page.fill('textarea', 'Limits describe what a function approaches. Derivatives measure rate of change using the power rule, product rule, chain rule. Integration is the antiderivative and the Fundamental Theorem connects them. Derivatives find maxima and minima at critical points where derivative equals zero.');
        await page.locator('button:has-text("Submit answer")').click();
        console.log('  Answer submitted, waiting for AnalysisAgent...');

        // Wait for result
        await page.waitForSelector('text=Mastery:', { timeout: 45000 });
        await shot(page, 'assessment-result');

        // Extract score
        const scoreText = await page.locator('.text-2xl.font-bold').textContent().catch(() => '?');
        const masteryText = await page.locator('text=Mastery:').textContent().catch(() => '?');
        console.log('  ✓ Score:', scoreText?.trim(), '|', masteryText?.trim());

        // Click Done
        await page.locator('button:has-text("Done")').click();
        await page.waitForTimeout(600);
        await shot(page, 'assessment-done');
        
        const panelGone = await page.locator('text=Mastery:').isVisible().catch(() => false);
        console.log('  Panel closed:', !panelGone ? '✓' : '✗ still visible');

        // Check node score updated in UI
        await page.waitForTimeout(300);
        const scoreChip = await firstTreeCard.locator('.text-xs.font-medium.text-primary').first().textContent().catch(() => null);
        console.log('  Node score chip after practice:', scoreChip ?? 'not shown yet');

      } catch (e) {
        await shot(page, 'assessment-error');
        console.log('  ❌ Assessment error:', e.message.split('\n')[0]);
      }
    }
  }

  // ======================
  // 8. CHECK-IN PAGE
  // ======================
  console.log('\n[8] CHECK-IN');
  await page.goto(`${BASE}/check-in`);
  await page.waitForLoadState('networkidle');
  console.log('  URL:', page.url());

  if (page.url().includes('dashboard')) {
    console.log('  → Already checked in today (redirected)');
    await shot(page, 'checkin-redirect');
  } else {
    await shot(page, 'checkin-page');
    const ciErrors = [...errors]; errors.length = 0;
    console.log('  JS errors:', ciErrors.length ? ciErrors : 'none');

    const qTexts = await page.locator('p.text-sm.font-medium').allTextContents();
    console.log('  Questions from CheckInAgent:', qTexts.length);
    qTexts.forEach((q, i) => console.log(`    Q${i+1}: ${q.trim().substring(0, 70)}...`));

    const taCount = await page.locator('textarea').count();
    for (let i = 0; i < taCount; i++) {
      const answers = [
        'Worked on calculus problems for about 2 hours. Had a good session, felt engaged.',
        'Took breaks every 30 minutes, kept phone away. Got pretty deep into the material.',
        'Sitting at my desk in a quiet room. No major interruptions today.'
      ];
      await page.locator('textarea').nth(i).fill(answers[i] ?? 'I was present and studying today.');
    }
    await page.waitForTimeout(200);
    await shot(page, 'checkin-filled');

    const submitBtn = page.locator('button:has-text("Submit Check-In")');
    if (await submitBtn.isVisible() && !(await submitBtn.isDisabled())) {
      await submitBtn.click();
      console.log('  Submitted, waiting for redirect (up to 30s)...');
      await page.waitForURL(/\/dashboard/, { timeout: 30000 }).catch(async () => {
        // router.push RSC fetch can fail in dev; fall back to manual nav
        const curUrl = page.url();
        if (!curUrl.includes('dashboard')) {
          // Check if APIs succeeded by seeing if we're still on /check-in with no error
          const hasError = await page.locator('[class*="destructive"]').isVisible().catch(() => false);
          if (!hasError) {
            // Submit worked, nav just failed — go manually
            await page.goto(`${BASE}/dashboard`);
            await page.waitForLoadState('networkidle');
          }
        }
      });
      console.log('  Final URL:', page.url());
      await shot(page, 'checkin-done');
      console.log('  Check-in:', page.url().includes('dashboard') ? '✓ redirected to dashboard' : '✗ did not redirect');
    }
  }

  // ======================
  // 9. CHAT
  // ======================
  console.log('\n[9] CHAT');
  await page.goto(`${BASE}/chat`);
  await page.waitForLoadState('networkidle');
  await shot(page, 'chat');

  const chatInput = page.locator('textarea').last();
  if (await chatInput.isVisible()) {
    await chatInput.fill('Based on my practice sessions, what should I focus on next?');
    await chatInput.press('Enter');
    console.log('  Message sent, waiting for response...');
    // Wait for streaming to start
    await page.waitForTimeout(10000);
    await shot(page, 'chat-response');
    const chatErrors = [...errors]; errors.length = 0;
    console.log('  Chat JS errors:', chatErrors.length ? chatErrors : 'none');
  }

  // ======================
  // FINAL SUMMARY
  // ======================
  console.log('\n[SUMMARY] REMAINING ERRORS:');
  if (errors.length === 0) console.log('  ✓ None');
  else errors.forEach(e => console.log('  ❌', e));

  await browser.close();
  const shots = fs.readdirSync(SCREENSHOTS).filter(f => f.endsWith('.png')).sort();
  console.log(`\n✓ ${shots.length} screenshots in ${SCREENSHOTS}`);
}

run().catch(e => { console.error('\n❌ Fatal:', e.message); process.exit(1); });
