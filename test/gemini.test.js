const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  validateGeneratePrompt,
  parseCvJson,
  extractResponseText,
  buildCvGenerationPrompt,
  resolveGeminiModel,
} = require('../src/gemini');

describe('gemini helpers', () => {
  it('validateGeneratePrompt enforces length', () => {
    assert.equal(validateGeneratePrompt('short').ok, false);
    assert.equal(validateGeneratePrompt('x'.repeat(21)).ok, true);
    assert.equal(validateGeneratePrompt('x'.repeat(4001)).ok, false);
  });

  it('parseCvJson normalizes CV shape', () => {
    const data = parseCvJson(JSON.stringify({
      summary: 'Hello',
      experience: [{ role: 'Dev', company: 'Co', bullets: 'Did things' }],
    }));
    assert.equal(data.summary, 'Hello');
    assert.equal(data.experience[0].role, 'Dev');
    assert.equal(data.template, 'classic');
  });

  it('extractResponseText reads candidate parts', () => {
    const text = extractResponseText({
      candidates: [{ content: { parts: [{ text: '{"summary":"Hi"}' }] } }],
    });
    assert.equal(text, '{"summary":"Hi"}');
  });

  it('buildCvGenerationPrompt includes account context', () => {
    const prompt = buildCvGenerationPrompt('I am a designer', { name: 'Jane', email: 'j@x.com' });
    assert.match(prompt, /Jane/);
    assert.match(prompt, /j@x.com/);
    assert.match(prompt, /designer/);
  });

  it('resolveGeminiModel defaults to gemini-2.5-flash', () => {
    const prev = process.env.GEMINI_MODEL;
    delete process.env.GEMINI_MODEL;
    assert.equal(resolveGeminiModel(), 'gemini-2.5-flash');
    process.env.GEMINI_MODEL = prev;
  });
});
