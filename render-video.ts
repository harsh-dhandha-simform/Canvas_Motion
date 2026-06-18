import puppeteer from 'puppeteer';
import { PuppeteerScreenRecorder } from 'puppeteer-screen-recorder';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log("Starting dev server...");
  const server = spawn('source .venv/bin/activate && npx vite dev --port 9000', { shell: '/bin/bash' });
  
  await new Promise(r => setTimeout(r, 10000));
  
  console.log("Launching puppeteer...");
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'], defaultViewport: { width: 2560, height: 1080 } });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:9000/');
  await new Promise(r => setTimeout(r, 5000));
  
  const outDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
  }

  const outputFile = path.join(outDir, 'output.mp4');

  const recorder = new PuppeteerScreenRecorder(page, {
    fps: 30,
    videoFrame: { width: 2560, height: 1080 },
    aspectRatio: '21:9',
  });

  console.log("Starting video capture...");
  await recorder.start(outputFile);

  console.log("Playing animation...");
  // Press Space to start playback in Motion Canvas
  await page.keyboard.press(' ');

  // Wait for 55 seconds (animation duration)
  await new Promise(r => setTimeout(r, 55000));
  
  console.log("Stopping capture...");
  await recorder.stop();
  
  await browser.close();
  server.kill();

  if (!fs.existsSync(outputFile)) {
      throw new Error("Render failed to produce an mp4.");
  }
  console.log("Render completed: " + outputFile);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
