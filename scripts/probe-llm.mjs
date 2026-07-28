import fs from "fs";
import OpenAI from "openai";

const env = Object.fromEntries(
  fs
    .readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const client = new OpenAI({ apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL });
console.log("model", env.LLM_MODEL);

async function main() {
  try {
    const completion = await client.chat.completions.create({
      model: env.LLM_MODEL,
      temperature: 0.9,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: 'Only output JSON object like {"ok":true,"msg":"hi"}' },
        { role: "user", content: "ping" },
      ],
    });
    console.log("OK content:", completion.choices[0]?.message?.content?.slice(0, 800));
    console.log("finish:", completion.choices[0]?.finish_reason);
  } catch (e) {
    console.error("ERR status:", e?.status);
    console.error("ERR message:", e?.message);
    if (e?.error) console.error("ERR body:", JSON.stringify(e.error, null, 2));
  }
}

main();
