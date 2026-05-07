/**
 * AI Chat service for web
 * Handles LLM API calls with user-provided API keys
 */

export const aiChatService = {
  /**
   * Send message to AI chat
   * @param {string} message - User message
   * @param {Array<{role: string, content: string}>} history - Chat history
   * @param {{apiKey: string, provider: string, model?: string}} config - AI config
   * @returns {Promise<{content: string, extractedTransaction?: object}>}
   */
  async sendMessage(message, history = [], config) {
    const { apiKey, provider = 'openai', model } = config;

    if (!apiKey) {
      throw new Error('API key required. Add your API key in Settings.');
    }

    // Build messages array
    const systemPrompt = `You are Filey AI, a finance assistant for UAE VAT compliance.
Help users track expenses, scan receipts, and manage finances.
For receipts, extract: merchant, amount, date, vat (5%), category.
Always respond concisely. For transactions, include JSON at end: {"type":"transaction",...}`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-10), // Last 10 messages
      { role: 'user', content: message },
    ];

    if (provider === 'anthropic') {
      return this.callAnthropic(messages, apiKey, model || 'claude-sonnet-4-20250514');
    }

    // Default: OpenAI
    return this.callOpenAI(messages, apiKey, model || 'gpt-4o-mini');
  },

  /**
   * Call OpenAI API
   */
  async callOpenAI(messages, apiKey, model) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'OpenAI API error');
    }

    const content = data.choices[0].message.content;
    const extractedTransaction = this.extractTransactionFromResponse(content);

    return {
      content: extractedTransaction ? content.replace(/\{"type":"transaction"[\s\S]*\}/, '').trim() : content,
      extractedTransaction,
    };
  },

  /**
   * Call Anthropic API
   */
  async callAnthropic(messages, apiKey, model) {
    // Convert OpenAI format to Anthropic format
    const anthropicMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const systemMessage = messages.find(m => m.role === 'system')?.content || '';

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 1000,
        system: systemMessage,
        messages: anthropicMessages,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message || 'Anthropic API error');
    }

    const content = data.content[0].text;
    const extractedTransaction = this.extractTransactionFromResponse(content);

    return {
      content: extractedTransaction ? content.replace(/\{"type":"transaction"[\s\S]*\}/, '').trim() : content,
      extractedTransaction,
    };
  },

  /**
   * Extract transaction data from AI response
   */
  extractTransactionFromResponse(content) {
    // Look for transaction JSON in response
    const txMatch = content.match(/\{"type":"transaction",[\s\S]*?\}/);
    if (!txMatch) return null;

    try {
      const tx = JSON.parse(txMatch[0]);
      return {
        merchant: tx.merchant || 'Unknown',
        amount: parseFloat(tx.amount) || 0,
        date: tx.date || new Date().toISOString().split('T')[0],
        vat: parseFloat(tx.vat) || 0,
        category: tx.category || 'General',
        currency: tx.currency || 'AED',
        txnType: tx.txnType || 'expense',
      };
    } catch {
      return null;
    }
  },

  /**
   * Analyze receipt image with AI vision
   * @param {string} imageDataUrl - Base64 image
   * @param {{apiKey: string, provider: string}} config
   * @returns {Promise<{content: string, extractedTransaction?: object}>}
   */
  async analyzeReceiptImage(imageDataUrl, config) {
    const { apiKey, provider = 'openai' } = config;

    if (!apiKey) {
      throw new Error('API key required');
    }

    if (provider === 'anthropic') {
      // Anthropic supports image input
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageDataUrl.split(',')[1] } },
              { type: 'text', text: 'Analyze this receipt. Extract: merchant, amount, date, VAT (5%), category. Return JSON: {"type":"transaction","merchant":"","amount":0,"date":"YYYY-MM-DD","vat":0,"category":"","currency":"AED"}' },
            ],
          }],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const content = data.content[0].text;
      const extractedTransaction = this.extractTransactionFromResponse(content);

      return {
        content: extractedTransaction ? content.replace(/\{"type":"transaction"[\s\S]*\}/, '').trim() : content,
        extractedTransaction,
      };
    }

    // OpenAI GPT-4o supports vision
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this receipt. Extract: merchant, amount, date, VAT (5%), category. Return JSON: {"type":"transaction","merchant":"","amount":0,"date":"YYYY-MM-DD","vat":0,"category":"","currency":"AED"}' },
            { type: 'image_url', image_url: { url: imageDataUrl } },
          ],
        }],
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const content = data.choices[0].message.content;
    const extractedTransaction = this.extractTransactionFromResponse(content);

    return {
      content: extractedTransaction ? content.replace(/\{"type":"transaction"[\s\S]*\}/, '').trim() : content,
      extractedTransaction,
    };
  },
};
