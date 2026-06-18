import puppeteer from 'puppeteer';
import { spawn } from 'child_process';
import path from 'path';

async function main() {
  console.log("Starting dev server...");
  const server = spawn('source .venv/bin/activate && npx vite dev --port 9000', { shell: '/bin/bash' });
  
  await new Promise(r => setTimeout(r, 5000));
  
  console.log("Launching puppeteer...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:9000/');
  await new Promise(r => setTimeout(r, 3000));
  
  // Dump the DOM
  const html = await page.content();
  const fs = await import('fs/promises');
  await fs.writeFile('dom.html', html);
  console.log("Saved DOM");
  
  await browser.close();
  server.kill();
}

main().catch(console.error);
