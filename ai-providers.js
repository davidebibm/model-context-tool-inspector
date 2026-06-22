/**
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Abstract base class for AI providers
 */
class AIProvider {
  constructor(config) {
    this.config = config;
  }

  /**
   * Create a chat session
   * @returns {AIChat}
   */
  createChat() {
    throw new Error('createChat must be implemented');
  }

  /**
   * Generate content (one-shot)
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async generateContent(params) {
    throw new Error('generateContent must be implemented');
  }

  /**
   * Get available models for this provider
   * @returns {Array<{id: string, name: string}>}
   */
  static getAvailableModels() {
    throw new Error('getAvailableModels must be implemented');
  }
}

/**
 * Abstract chat interface
 */
class AIChat {
  /**
   * Send a message and get response
   * @param {Object} params - {message, config}
   * @returns {Promise<Object>}
   */
  async sendMessage(params) {
    throw new Error('sendMessage must be implemented');
  }
}

/**
 * Gemini Provider Implementation
 */
class GeminiProvider extends AIProvider {
  constructor(config) {
    super(config);
    // Lazy load GoogleGenAI
    this.genAI = null;
  }

  async _ensureInitialized() {
    if (!this.genAI) {
      const { GoogleGenAI } = await import('./js-genai.js');
      this.genAI = new GoogleGenAI({ apiKey: this.config.apiKey });
    }
  }

  createChat() {
    return new GeminiChat(this);
  }

  async generateContent(params) {
    await this._ensureInitialized();
    const response = await this.genAI.models.generateContent({
      model: params.model || this.config.model,
      contents: params.contents,
    });
    return { text: response.text };
  }

  static getAvailableModels() {
    return [
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
      { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' },
      { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
    ];
  }
}

class GeminiChat extends AIChat {
  constructor(provider) {
    super();
    this.provider = provider;
    this.chat = null;
  }

  async _ensureInitialized() {
    await this.provider._ensureInitialized();
    if (!this.chat) {
      this.chat = this.provider.genAI.chats.create({
        model: this.provider.config.model,
      });
    }
  }

  async sendMessage(params) {
    await this._ensureInitialized();
    const response = await this.chat.sendMessage(params);
    
    return {
      text: response.text,
      functionCalls: response.functionCalls,
      candidates: response.candidates,
    };
  }
}

/**
 * OpenRouter Provider Implementation
 */
class OpenRouterProvider extends AIProvider {
  constructor(config) {
    super(config);
    this.baseUrl = 'https://openrouter.ai/api/v1';
  }

  createChat() {
    return new OpenRouterChat(this);
  }

  async generateContent(params) {
    const messages = Array.isArray(params.contents)
      ? params.contents.map(c => ({
          role: 'user',
          content: typeof c === 'string' ? c : JSON.stringify(c)
        }))
      : [{ role: 'user', content: params.contents }];

    const response = await this._makeRequest('/chat/completions', {
      model: params.model || this.config.model,
      messages,
    });

    return {
      text: response.choices[0]?.message?.content || '',
    };
  }

  async _makeRequest(endpoint, body) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': chrome.runtime.getURL(''),
        'X-Title': 'WebMCP Tool Inspector',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  static getAvailableModels() {
    return [
      { id: 'google/gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
      { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
      { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
      { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'google/gemini-pro', name: 'Gemini Pro' },
      { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B' },
      { id: 'mistralai/mistral-large', name: 'Mistral Large' },
      { id: 'ibm-granite/granite-4.1-8b', name: 'IBM Granite 4.1 8B' },
    ];
  }
}

class OpenRouterChat extends AIChat {
  constructor(provider) {
    super();
    this.provider = provider;
    this.messages = [];
  }

  async sendMessage(params) {
    const { message, config } = params;

    // Handle tool responses
    if (Array.isArray(message)) {
      // Convert Gemini-style tool responses to OpenAI format
      for (const item of message) {
        if (item.functionResponse) {
          this.messages.push({
            role: 'function',
            name: item.functionResponse.name,
            content: JSON.stringify(item.functionResponse.response),
          });
        }
      }
    } else {
      // Regular user message
      this.messages.push({
        role: 'user',
        content: message,
      });
    }

    // Build request with tools if provided
    const requestBody = {
      model: this.provider.config.model,
      messages: this._buildMessages(config),
    };

    // Add tools/functions if provided
    if (config?.tools?.[0]?.functionDeclarations) {
      requestBody.tools = this._convertToolsToOpenAI(config.tools[0].functionDeclarations);
    }

    const response = await this.provider._makeRequest('/chat/completions', requestBody);

    const choice = response.choices[0];
    const assistantMessage = choice.message;

    // Store assistant response
    this.messages.push(assistantMessage);

    // Convert response to Gemini-compatible format
    const result = {
      text: assistantMessage.content || '',
      functionCalls: [],
      candidates: response.choices,
    };

    // Handle tool calls
    if (assistantMessage.tool_calls) {
      result.functionCalls = assistantMessage.tool_calls.map(tc => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
      }));
    }

    return result;
  }

  _buildMessages(config) {
    const messages = [...this.messages];
    
    // Add system instruction if provided
    if (config?.systemInstruction) {
      const systemContent = Array.isArray(config.systemInstruction)
        ? config.systemInstruction.join('\n')
        : config.systemInstruction;
      
      messages.unshift({
        role: 'system',
        content: systemContent,
      });
    }

    return messages;
  }

  _convertToolsToOpenAI(functionDeclarations) {
    return functionDeclarations.map(func => ({
      type: 'function',
      function: {
        name: func.name,
        description: func.description,
        parameters: func.parametersJsonSchema,
      },
    }));
  }
}

/**
 * Factory to create AI provider instances
 */
class AIProviderFactory {
  static create(providerType, config) {
    switch (providerType) {
      case 'gemini':
        return new GeminiProvider(config);
      case 'openrouter':
        return new OpenRouterProvider(config);
      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }

  static getProviders() {
    return [
      { id: 'gemini', name: 'Google Gemini' },
      { id: 'openrouter', name: 'OpenRouter' },
    ];
  }

  static getModelsForProvider(providerType) {
    switch (providerType) {
      case 'gemini':
        return GeminiProvider.getAvailableModels();
      case 'openrouter':
        return OpenRouterProvider.getAvailableModels();
      default:
        return [];
    }
  }
}

export { AIProviderFactory, AIProvider, AIChat };

// Made with Bob
