import Tesseract from 'tesseract.js';

/**
 * Client-side OCR using Tesseract.js
 * Extracts text from receipt images in browser
 */
export const ocrService = {
  /**
   * Extract text from image
   * @param {string|Blob} image - Image URL, Data URL, or Blob
   * @returns {Promise<{text: string, confidence: number}>}
   */
  async extractText(image) {
    const { data } = await Tesseract.recognize(image, 'eng', {
      logger: m => console.log('[OCR]', m),
    });
    return {
      text: data.text,
      confidence: data.confidence,
      words: data.words,
      lines: data.lines,
    };
  },

  /**
   * Extract receipt data using OCR + AI
   * @param {string|Blob} image - Receipt image
   * @param {string} apiKey - User's AI API key
   * @param {string} provider - 'openai' or 'anthropic'
   * @returns {Promise<{merchant: string, amount: number, date: string, vat: number, category: string}>}
   */
  async extractReceiptData(image, apiKey, provider = 'openai') {
    // Step 1: OCR the image
    const { text } = await this.extractText(image);

    if (!text.trim()) {
      throw new Error('No text detected in image');
    }

    // Step 2: Use AI to parse receipt data
    const receiptData = await this.parseReceiptWithAI(text, apiKey, provider);

    return receiptData;
  },

  /**
   * Parse OCR text into structured receipt data using AI
   */
  async parseReceiptWithAI(ocrText, apiKey, provider) {
    const prompt = `Extract receipt data from this OCR text. Return JSON only:
{"merchant":"<name>","amount":<number>,"date":"YYYY-MM-DD","vat":<number>,"category":"<Food|Transport|Shopping|Office|Utilities|Entertainment|Health|Travel|Banking|General>","currency":"AED"}

OCR TEXT:
${ocrText}`;

    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const content = data.content[0].text;
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      return JSON.parse(jsonMatch ? jsonMatch[0] : content);
    }

    // Default: OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Extract receipt data as JSON only. No explanations.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
      }),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    return JSON.parse(jsonMatch ? jsonMatch[0] : content);
  },
};
