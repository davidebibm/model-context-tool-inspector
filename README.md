# WebMCP - Model Context Tool Inspector

A Chrome Extension that allows developers to inspect, monitor, and execute tools exposed via the experimental `navigator.modelContextTesting` Web API. Now supports multiple AI providers including Google Gemini and OpenRouter (with access to Claude, GPT-4, Llama, and more).

## Prerequisites

**Important:** This extension relies on the experimental `navigator.modelContextTesting` Web API. You must enable the "WebMCP for testing" flag in `chrome://flags` to turn it on in Chrome 148.0.7778.56 or higher.

## Installation

You can install this extension either directly from the Chrome Web Store or manually from the source code.

### Option 1: Chrome Web Store (recommended)

Install the extension directly via the [Chrome Web Store](https://chromewebstore.google.com/detail/model-context-tool-inspec/gbpdfapgefenggkahomfgkhfehlcenpd).

### Option 2: Install from source

1.  **Download the Source:**
    Clone this repository or download the source files into a directory.

2.  **Install dependencies:**
    In the directory, run `npm install`.

3.  **Open Chrome Extensions:**
    Navigate to `chrome://extensions/` in your browser address bar.

4.  **Enable Developer Mode:**
    Toggle the **Developer mode** switch in the top right corner of the Extensions page.

5.  **Load Unpacked:**
    Click the **Load unpacked** button that appears in the top left. Select the directory containing `manifest.json` (the folder where you saved the files).

## Configuration

### Setting up AI Provider

The extension supports two AI providers:

1. **Google Gemini** - Direct access to Google's Gemini models
2. **OpenRouter** - Access to multiple models including Claude, GPT-4, Llama, Mistral, and more

#### Option 1: Using .env.json (Recommended for Development)

Create a `.env.json` file in the extension directory:

```json
{
  "provider": "openrouter",
  "apiKey": "your-api-key-here",
  "model": "google/gemini-3.5-flash"
}
```

See [`.env.json.example`](.env.json.example) for more details.

#### Option 2: Using the Extension UI

1. Click the extension icon to open the side panel
2. Click "Set API key" button
3. Enter your API key for the selected provider
4. Click the "︙" button to access advanced settings
5. Select your preferred AI provider and model

### Getting API Keys

- **Gemini API Key**: Get it from [Google AI Studio](https://aistudio.google.com/app/apikey)
- **OpenRouter API Key**: Get it from [OpenRouter](https://openrouter.ai/keys)

### Available Models

**Gemini:**
- Gemini 3 Flash Preview
- Gemini 3.1 Flash-Lite
- Gemini 3.5 Flash

**OpenRouter (examples):**
- Gemini 3.5 Flash (default)
- Claude 3.5 Sonnet
- Claude 3 Opus
- Claude 3 Haiku
- GPT-4 Turbo
- GPT-4o
- GPT-3.5 Turbo
- Gemini Pro
- Llama 3.1 70B
- Mistral Large
- And many more...

## Usage

1.  **Navigate to a Page:**
    Open a web page that exposes Model Context tools.

2.  **Open the Inspector:**
    Click the extension's action icon (the puzzle piece or pinned icon) in the Chrome toolbar. This will open the **Side Panel**.

3.  **Inspect Tools:**
    * The extension will inject a content script to query the page.
    * A table will appear listing all available tools found on the page.

4.  **Execute a Tool Manually:**
    * **Tool:** Select the desired tool from the dropdown menu.
    * **Input Arguments:** Enter the arguments for the tool in the text area.
        * *Note:* The input must be valid JSON (e.g., `{"text": "hello world"}`).
    * Click **Execute Tool**.

5.  **Use AI to Execute Tools:**
    * Enter a natural language prompt in the "User Prompt" field
    * Click **Send** to have the AI analyze available tools and execute them
    * The AI will automatically chain multiple tools together if needed
    * View the results in the output area below

## Architecture

The extension now uses a provider abstraction layer that allows easy integration of new AI providers:

- **[`ai-providers.js`](ai-providers.js)** - Provider abstraction layer with implementations for Gemini and OpenRouter
- **[`sidebar.js`](sidebar.js)** - Main UI logic with provider-agnostic AI integration
- **[`sidebar.html`](sidebar.html)** - UI with dynamic provider and model selection

### Adding New Providers

To add a new AI provider:

1. Create a new class extending `AIProvider` in [`ai-providers.js`](ai-providers.js)
2. Implement the required methods: `createChat()`, `generateContent()`, and `getAvailableModels()`
3. Create a corresponding `AIChat` implementation
4. Register the provider in `AIProviderFactory`

## Disclaimer

This is not an officially supported Google product. This project is not
eligible for the [Google Open Source Software Vulnerability Rewards
Program](https://bughunters.google.com/open-source-security).
