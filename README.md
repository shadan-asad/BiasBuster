# BiasBuster

BiasBuster is a Chrome extension that analyzes news articles for bias, fact-checks claims, and rewrites content to present a more balanced perspective. It helps users cut through media bias and get to the facts by providing multiple viewpoints and necessary context.

## Features

- **Bias Detection**: Identifies biased language, loaded terms, and emotional appeals in news articles
- **Balanced Perspective**: Rewrites articles to present multiple viewpoints and provide missing context
- **Fact Checking**: Verifies factual claims and provides sources for further research
- **Bias Score**: Rates articles on a scale from 0 (neutral) to 10 (extremely biased)
- **Political Leaning Detection**: Identifies whether the bias leans left, right, or other
- **Multiple AI Models**: Support for OpenAI (GPT-4), Anthropic (Claude), and Google (Gemini)

## Installation

### From Chrome Web Store (Recommended)

1. Visit the [BiasBuster Chrome Web Store page](https://chrome.google.com/webstore/detail/biasbuster/your-extension-id)
2. Click "Add to Chrome"
3. Follow the onboarding instructions to set up your AI service

### Manual Installation (Development)

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/biasbuster.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" by toggling the switch in the top right corner

4. Click "Load unpacked" and select the directory where you cloned the repository

5. The BiasBuster extension should now be installed and visible in your extensions list

## Usage

1. Navigate to any news article on major news sites like NYTimes, WSJ, CNN, Fox News, etc.

2. Click the BiasBuster icon in your browser toolbar or use the floating button on the page

3. Click "Analyze Article" to have BiasBuster analyze the content for bias

4. Review the rewritten article, bias analysis, and sources for a more complete picture

## Setting Up Your AI Service

BiasBuster uses AI to analyze and rewrite articles. You'll need to provide your own API key from one of the following services:

### OpenAI (GPT-4)

1. Visit [OpenAI](https://platform.openai.com/signup) to create an account
2. Navigate to the API section and create an API key
3. Copy your API key
4. Open BiasBuster settings and paste your API key in the appropriate field
5. Select "OpenAI" as your AI model

### Anthropic (Claude)

1. Visit [Anthropic](https://console.anthropic.com/signup) to create an account
2. Generate an API key from your account dashboard
3. Copy your API key
4. Open BiasBuster settings and paste your API key in the appropriate field
5. Select "Anthropic" as your AI model

### Google (Gemini)

1. Visit [Google AI Studio](https://ai.google.dev/) to create an account
2. Navigate to the API section and create an API key
3. Copy your API key
4. Open BiasBuster settings and paste your API key in the appropriate field
5. Select "Gemini" as your AI model

**Note:** Your API key is stored locally on your device and is never sent to our servers. You are responsible for any usage charges from the AI service provider.

## Privacy

BiasBuster respects your privacy. We do not collect any personal information. The article content is processed using the AI service you choose, and your API key is stored locally on your device. For more information, please see our [Privacy Policy](src/privacy.html).

## Development

### Project Structure

```
biasbuster/
├── manifest.json           # Extension manifest
├── src/
│   ├── css/
│   │   ├── content.css     # Styles for the content script
│   │   └── popup.css       # Styles for the popup
│   ├── js/
│   │   ├── background.js   # Background script
│   │   ├── content.js      # Content script for analyzing articles
│   │   └── popup.js        # Script for the popup UI
│   ├── images/             # Extension icons
│   ├── popup.html          # Popup UI
│   ├── onboarding.html     # Onboarding page
│   └── privacy.html        # Privacy policy
└── README.md               # This file
```

### Building for Production

To build the extension for production:

1. Install the required dependencies:
   ```
   npm install
   ```

2. Build the extension:
   ```
   npm run build
   ```

3. The built extension will be in the `dist` directory

## Publishing to Chrome Web Store

1. Create a ZIP file of the entire extension directory

2. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)

3. Click "Add new item" and upload the ZIP file

4. Fill in the required information:
   - Description
   - Screenshots
   - Promotional images
   - Category (News & Weather)
   - Language

5. Pay the one-time developer fee ($5) if you haven't already

6. Submit for review

7. Once approved, your extension will be available on the Chrome Web Store

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Thanks to all the contributors who have helped make BiasBuster better
- Inspired by the need for more balanced news consumption in today's polarized media landscape 