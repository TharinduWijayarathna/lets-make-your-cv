const { normalizeCvData } = require('./db');

/** Best quality model available on typical free-tier keys (Pro models often have 0 quota). */
const DEFAULT_MODEL = 'gemini-2.5-flash';

const GEMINI_API = 'https://generativelanguage.googleapis.com/v1beta';

const CV_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    personal: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        title: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        location: { type: 'string' },
        linkedin: { type: 'string' },
        github: { type: 'string' },
        portfolio: { type: 'string' },
      },
    },
    summary: { type: 'string' },
    techTags: { type: 'string' },
    languages: { type: 'string' },
    experience: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          role: { type: 'string' },
          company: { type: 'string' },
          location: { type: 'string' },
          from: { type: 'string' },
          to: { type: 'string' },
          bullets: { type: 'string' },
        },
      },
    },
    projects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          tech: { type: 'string' },
          desc: { type: 'string' },
        },
      },
    },
    education: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          degree: { type: 'string' },
          school: { type: 'string' },
          year: { type: 'string' },
        },
      },
    },
    skillBars: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          level: { type: 'integer' },
        },
      },
    },
    certifications: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          issuer: { type: 'string' },
        },
      },
    },
  },
};

function getGeminiApiKey() {
  return (process.env.GEMINI_KEY || '').trim();
}

function resolveGeminiModel() {
  return (process.env.GEMINI_MODEL || '').trim() || DEFAULT_MODEL;
}

function validateGeneratePrompt(prompt) {
  const text = typeof prompt === 'string' ? prompt.trim() : '';
  if (text.length < 20) {
    return { ok: false, error: 'Describe your background in at least 20 characters' };
  }
  if (text.length > 4000) {
    return { ok: false, error: 'Prompt must be 4000 characters or fewer' };
  }
  return { ok: true, value: text };
}

function buildCvGenerationPrompt(userPrompt, account = {}) {
  const accountLines = [];
  if (account.name) accountLines.push(`Account holder name: ${account.name}`);
  if (account.email) accountLines.push(`Account email (use for CV email if not specified): ${account.email}`);

  return `You are an expert CV/resume writer. Generate a complete, professional CV as JSON matching the provided schema.

Guidelines:
- Write polished, ATS-friendly content tailored to the user's description
- Use strong action verbs and quantified achievements where reasonable
- Experience dates: "Mon YYYY" (e.g. "Jan 2022"); use "Present" for current roles
- Experience bullets: one achievement per line in the bullets string, no leading bullet characters (no •, -, *)
- Include 2–4 roles, 2–4 projects, education, 5–8 skillBars (level 0–100), and certifications when relevant
- techTags: comma-separated technical skills
- languages: one per line as "Language | Proficiency level"
- LinkedIn/GitHub/portfolio: full URLs when included
- If the user omits contact details, use plausible professional placeholders except use the account email when given

${accountLines.length ? `${accountLines.join('\n')}\n\n` : ''}User description:
${userPrompt}`;
}

function extractResponseText(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((p) => p.text || '').join('').trim();
}

function parseCvJson(text) {
  const raw = text.trim();
  if (!raw) throw new Error('Empty response from AI');
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('AI response was not a JSON object');
  }
  return normalizeCvData(parsed);
}

function geminiErrorMessage(status, body) {
  const msg = body?.error?.message || `Gemini API error (${status})`;
  if (status === 429 || /quota|rate limit/i.test(msg)) {
    return 'AI service is busy — please try again in a minute';
  }
  if (status === 403 || /api key/i.test(msg)) {
    return 'AI generation is not configured correctly';
  }
  return msg;
}

async function generateCvFromPrompt(prompt, account = {}, fetchImpl = fetch) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    const err = new Error('GEMINI_KEY is not configured');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const model = resolveGeminiModel();
  const url = `${GEMINI_API}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildCvGenerationPrompt(prompt, account) }] }],
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: CV_RESPONSE_SCHEMA,
      },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(geminiErrorMessage(res.status, body));
    err.status = res.status;
    throw err;
  }

  return parseCvJson(extractResponseText(body));
}

module.exports = {
  DEFAULT_MODEL,
  getGeminiApiKey,
  resolveGeminiModel,
  validateGeneratePrompt,
  buildCvGenerationPrompt,
  parseCvJson,
  extractResponseText,
  generateCvFromPrompt,
};
