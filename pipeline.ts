import 'dotenv/config';
import OpenAI from "openai";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const SYSTEM_PROMPT = `You are a core rendering engine for an autonomous technical e-learning course dashboard.
Your goal is to explain advanced cloud-native architecture concepts through an ultra-wide layout viewport.

VISUAL CANVAS DIMENSIONS:
- Absolute bounds: Width: 2560px, Height: 1080px

DESIGN CONSTRAINTS (NO-AUDIO LEARNING):
1. Every scene MUST include a high-contrast Narration HUD Box at the bottom of the canvas:
   <Rect width={2440} height={160} fill={'#1e293b'} radius={16} padding={40} />
2. Inside it, place a single animated <Txt> signal element acting as a narrator.
3. Update the narrator text string before every major visual change on screen.
4. Use color tokens: background #0b0f19, highlights #38bdf8, status green #10b981.

TIMING RULES:
- After every narrator text update, add: yield* waitFor(X)
- Calculate X as: 1 second per every 4-5 words in the text string.
- Total animation timeline must reach 55-60 seconds.

LAYOUT RULES:
- Use only native Motion Canvas Flexbox layout (layout, direction, gap, alignItems).
- Do NOT use absolute pixel positioning.
- All imports must come from '@motion-canvas/2d' and '@motion-canvas/core'.

OUTPUT RULES:
- Return ONLY raw valid TSX code. No markdown fences. No explanation. No preamble.
- The file must be a complete, self-contained Motion Canvas scene, export default included.`;

function cleanTSX(output: string): string {
    return output.replace(/^```(tsx?|typescript)?/mi, '').replace(/```$/m, '').trim();
}

async function renderVideo(): Promise<void> {
    // The prompt requested 'npx motion-canvas render --headless', but that CLI doesn't exist
    // natively on npm under that exact name for current versions.
    // The modern way to headless render in Motion Canvas is via vite build
    // I will try 'npx vite build' because we configured the vite-plugin to output mp4.
    const command = 'source .venv/bin/activate && npx tsx render-video.ts';
    console.log(`Running: ${command}`);
    const { stdout, stderr } = await execAsync(command, { shell: '/bin/bash' });
    if (stderr && stderr.toLowerCase().includes('error')) {
        console.warn("Render completed with possible errors:", stderr);
    }
    console.log("Render stdout:", stdout);
}

export async function runPipeline(lessonTopic: string, curriculumDetails: string) {
    const apiKey = process.env.API_KEY;
    const baseURL = process.env.BASE_URL;
    if (!apiKey || !baseURL) {
        throw new Error("API_KEY or BASE_URL environment variable is not set.");
    }

    const openai = new OpenAI({
        apiKey: apiKey,
        baseURL: baseURL,
    });

    let currentPrompt = `Lesson Topic: ${lessonTopic}\nCurriculum Details: ${curriculumDetails}\n\nGenerate the complete Motion Canvas TSX scene based on the system prompt.`;

    const scenePath = path.join(process.cwd(), "src", "scenes", "generatedScene.tsx");
    const maxRetries = 3;
    let attempt = 0;

    while (attempt <= maxRetries) {
        attempt++;
        console.log(`Attempt ${attempt} of ${maxRetries + 1}: Calling OpenAI API...`);

        try {
            const result = await openai.chat.completions.create({
                model: "gpt-4o", // You can switch this if your proxy provides a specific model alias like 'gpt-3.5-turbo'
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: currentPrompt }
                ]
            });
            const rawOutput = result.choices[0]?.message?.content || "";
            const cleanCode = cleanTSX(rawOutput);

            await fs.writeFile(scenePath, cleanCode, "utf8");
            console.log(`Successfully wrote TSX to ${scenePath}`);

            // Try compiling / running render
            await renderVideo();

            console.log("Pipeline completed successfully! Output .mp4 should be in the output folder.");
            return;
        } catch (error: any) {
            console.error(`Attempt ${attempt} failed.`);
            console.error("Error output:", error.message || error.toString());
            if (error.stdout) console.error("stdout:", error.stdout);
            if (error.stderr) console.error("stderr:", error.stderr);

            if (attempt > maxRetries) {
                console.error("Max retries reached. Hard failing.");
                throw error;
            }

            // Read the broken code
            let brokenCode = "Could not read broken code.";
            try {
                brokenCode = await fs.readFile(scenePath, "utf8");
            } catch (e) {
                // Ignore
            }

            console.log("Retrying with error context...");
            currentPrompt = `Fix this Motion Canvas TSX code. Return only the corrected raw TSX. Error: ${error.message || error.toString()}\n\nCode:\n${brokenCode}`;
        }
    }
}

// Phase 5 Test Run Trigger
const testTopic = "Kubernetes Cluster Architecture";
const testDetails = "Visualize a traffic spike hitting the K8s API server, triggering the scheduler to assign pods to an available worker node. Show node health status updates in real time.";
runPipeline(testTopic, testDetails).catch(console.error);
