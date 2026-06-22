import {renderVideo} from '@revideo/renderer';
import {generateScript} from './generateScript';
import path from 'path';
import fs from 'fs';

async function main() {
  const topic = 'system design';
  console.log(`Generating script for topic: "${topic}"...`);
  const script = await generateScript(topic);
  console.log('Script generated:', JSON.stringify(script, null, 2));

  const outputDir = path.resolve('./output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, {recursive: true});

  console.log('Rendering video...');
  const file = await renderVideo({
      projectFile: './src/project.tsx',
      variables: {title: script.title, slides: script.slides},
      settings: {
        logProgress: true,
        outFile: 'system-design.mp4',
        outDir: outputDir,
        puppeteer: {
          args: [
            '--disable-gpu',
            '--use-gl=swiftshader',
            '--enable-unsafe-swiftshader',
          ],
        },
      },
    });
  console.log(`✅ Video rendered to: ${file}`);
}

main().catch(err => {
  console.error('❌ Render failed:', err);
  process.exit(1);
});