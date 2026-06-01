//Service parsing, validasi, dan repair output AI.
const { ERROR_CATEGORIES, LlmError } = require('../llm/llmErrors');
const { parseStrictJson } = require('../utils/jsonParser');
const { validateAiResult } = require('../validators/aiResultValidators');

//Prompt repair kecil untuk mengubah output menjadi JSON valid.
const buildRepairPrompt = (rawText) => [
  'Ubah output berikut menjadi JSON valid saja.',
  'Jangan tambahkan markdown, komentar, atau teks penjelasan.',
  'Pertahankan makna data yang ada dan jangan membuat field baru di luar data asli.',
  '',
  rawText,
].join('\n');

//Parse dan validasi output AI dengan maksimal satu repair.
const parseAndValidateAiOutput = async ({
  feature,
  rawText,
  llmGateway,
  allowRepair = false,
  repairSystemInstruction = 'Anda hanya memperbaiki JSON agar valid.',
  repairMaxOutputTokens = 1200,
}) => {
  try {
    return validateAiResult(feature, parseStrictJson(rawText));
  } catch (error) {
    if (!allowRepair || !llmGateway) {
      throw new LlmError(ERROR_CATEGORIES.INVALID_RESPONSE, 'Output AI tidak valid.', {
        feature,
        reason: error.message,
      });
    }

    const repaired = await llmGateway.generateText({
      prompt: buildRepairPrompt(rawText),
      systemInstruction: repairSystemInstruction,
      responseMimeType: 'application/json',
      maxOutputTokens: repairMaxOutputTokens,
    });

    try {
      return validateAiResult(feature, parseStrictJson(repaired.text));
    } catch (repairError) {
      throw new LlmError(ERROR_CATEGORIES.INVALID_RESPONSE, 'Output AI tetap tidak valid setelah repair.', {
        feature,
        reason: repairError.message,
      });
    }
  }
};

module.exports = {
  buildRepairPrompt,
  parseAndValidateAiOutput,
};
