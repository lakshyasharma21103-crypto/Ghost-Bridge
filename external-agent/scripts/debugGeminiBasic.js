require('dotenv').config({ path: '.env' });

const { GoogleGenAI } = require('@google/genai');

(async () => {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is missing from external-agent/.env');
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: 'Reply with only the word OK.',
    });

    console.log('PASS: basic Gemini SDK request succeeded');
    console.log('Model:', model);
    console.log('Response:', response.text);
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          name: error?.name,
          status:
            error?.status ??
            error?.statusCode ??
            error?.response?.status,
          code: error?.code,
          message: error?.message,
        },
        null,
        2,
      ),
    );

    process.exit(1);
  }
})();
