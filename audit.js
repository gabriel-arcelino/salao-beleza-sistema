import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: false });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

await page.goto('http://localhost:5173');
await page.waitForTimeout(3000);
console.log('Página de login carregada');
await page.screenshot({ path: 'docs/screenshots/visual-audit/01-login.png', fullPage: true });

// Preencher login
await page.fill('input[type="email"]', 'teste@gmail.com');
await page.fill('input[type="password"]', '12345678');
await page.keyboard.press('Enter');
await page.waitForTimeout(3000);
console.log('Login enviado');
await page.screenshot({ path: 'docs/screenshots/visual-audit/01-login-post-login.png', fullPage: true });

await browser.close();
