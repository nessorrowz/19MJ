//Script smoke test gateway LLM tanpa mencetak secret.
require('dotenv').config();
const { createLlmGateway } = require('../src/ai/llm/llmGateway');

//Kirim prompt kecil melalui gateway dan tampilkan metadata aman.
async function main() {
  const gateway = createLlmGateway();
  const result = await gateway.generateText({
    prompt: 'Balas hanya dengan JSON: {"ok": true}',
    responseMimeType: 'application/json',
    maxOutputTokens: 100,
  });

  console.log(JSON.stringify({
    provider: result.provider,
    model: result.model,
    latencyMs: result.latencyMs,
    textPreview: result.text.slice(0, 120),
  }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  if (error.details?.attempts) {
    console.error(JSON.stringify(error.details.attempts, null, 2));
  }
  process.exit(1);
});
