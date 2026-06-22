import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

const result = dotenv.config();

console.log('dotenv result:', result);
console.log('cwd:', process.cwd());
console.log('API_KEY:', process.env.API_KEY);
console.log('BASE_URL:', process.env.BASE_URL);

export interface Slide {
  heading: string;
  body: string;
}

export interface VideoScript {
  title: string;
  slides: Slide[];
}

export async function generateScript(
  topic: string,
): Promise<VideoScript> {

  const llm = new ChatOpenAI({
    model: 'gpt-4.1-mini',
    apiKey: process.env.API_KEY,
    configuration: {
      baseURL: process.env.BASE_URL,
    },
    temperature: 0.7,
  });

  const prompt = `
You are writing content for a short educational video about "${topic}".

Return ONLY valid JSON in this shape:

{
  "title": "string",
  "slides": [
    {
      "heading": "string",
      "body": "string"
    }
  ]
}

Produce exactly 4 slides.
`;

  const response = await llm.invoke([
    ["system", "You generate educational video scripts."],
    ["human", prompt],
  ]);

const raw = String(response.content).trim();

  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();

  try {
    return JSON.parse(cleaned) as VideoScript;
  } catch (err) {
    console.error('Failed to parse:', raw);
    throw err;
  }
}