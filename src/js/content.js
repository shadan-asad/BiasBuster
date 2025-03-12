// Global variables
let settings = {
  aiModel: 'openai',
  apiKey: '',
  autoAnalyze: false,
  highlightBias: true
};

// Initialize when the page loads
(function() {
  console.log('content.js initialized');
  // Check if this is a news article
  if (isNewsArticle()) {
    // Get settings from storage
    chrome.runtime.sendMessage({action: 'getSettings'}, function(response) {
      if (response) {
        settings = response;
        
        // If auto-analyze is enabled, analyze the article automatically
        if (settings.autoAnalyze) {
          analyzeArticle();
        }
      }
    });
    
    // Add a floating button to analyze the article
    addFloatingButton();
  }
})();

// Listen for messages from popup or background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'checkIfNewsArticle') {
    sendResponse({isNewsArticle: isNewsArticle()});
  }
  
  if (request.action === 'analyzeArticle') {
    if (request.settings) {
      settings = request.settings;
    }
    
    analyzeArticle()
      .then(result => {
        sendResponse({
          success: true,
          biasScore: result.biasScore
        });
      })
      .catch(error => {
        sendResponse({
          success: false,
          error: error.message
        });
      });
    
    return true; // Required for async sendResponse
  }
  
  if (request.action === 'getSettings') {
    // Return settings to the content script
    chrome.storage.sync.get({
      aiModel: 'openai',
      apiKey: '',
      autoAnalyze: false,
      highlightBias: true
    }, function(items) {
      sendResponse(items);
    });
    return true; // Required for async sendResponse
  }
  
  if (request.action === 'updateStats') {
    // Update stats in storage
    chrome.storage.sync.get({
      articlesAnalyzed: 0
    }, function(items) {
      chrome.storage.sync.set({
        articlesAnalyzed: items.articlesAnalyzed + 1,
        lastBiasScore: request.biasScore
      });
    });
  }
  
  if (request.action === 'fetchExternalData') {
    // Fetch data from external APIs (to avoid CORS issues in content script)
    fetch(request.url, request.options)
      .then(response => response.json())
      .then(data => {
        sendResponse({ success: true, data: data });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true; // Required for async sendResponse
  }
});

// Function to check if the current page is a news article
function isNewsArticle() {
  console.log('isNewsArticle()');
  // Check for common news article indicators
  const hasArticleTag = document.querySelector('article') !== null;
  const hasNewsKeywords = document.querySelector('meta[name="keywords"]')?.content?.toLowerCase().includes('news') || false;
  const hasNewsInUrl = window.location.hostname.includes('news') || 
                      window.location.hostname.includes('nyt') || 
                      window.location.hostname.includes('wsj') || 
                      window.location.hostname.includes('washingtonpost') ||
                      window.location.hostname.includes('cnn') ||
                      window.location.hostname.includes('foxnews') ||
                      window.location.hostname.includes('bbc');
  
  // Check for common news sites
  const commonNewsSites = [
    'nytimes.com',
    'wsj.com',
    'washingtonpost.com',
    'cnn.com',
    'foxnews.com',
    'bbc.com',
    'reuters.com',
    'apnews.com',
    'bloomberg.com',
    'nbcnews.com',
    'cbsnews.com',
    'abcnews.go.com',
    'politico.com',
    'thehill.com',
    'huffpost.com',
    'theguardian.com',
    'usatoday.com'
  ];
  
  const isCommonNewsSite = commonNewsSites.some(site => window.location.hostname.includes(site));
  
  // Check for article structure
  const hasHeadline = document.querySelector('h1') !== null;
  const hasParagraphs = document.querySelectorAll('p').length > 5;
  
  // Return true if enough indicators are present
  return (hasArticleTag || hasNewsKeywords || hasNewsInUrl || isCommonNewsSite) && hasHeadline && hasParagraphs;
}

// Function to add a floating button to the page
function addFloatingButton() {
  console.log('addFloatingButton()');
  const button = document.createElement('button');
  button.textContent = 'Analyze with BiasBuster';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.style.padding = '10px 15px';
  button.style.backgroundColor = '#4a6fa5';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  button.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
  
  button.addEventListener('click', function() {
    analyzeArticle();
  });
  
  document.body.appendChild(button);
}

// Function to extract the article content
function extractArticleContent() {
  console.log('extractArticleContent()');
  // Try to find the article content using common selectors
  const selectors = [
    'article',
    '.article-content',
    '.article-body',
    '.story-body',
    '.story-content',
    '.post-content',
    '.entry-content',
    '#article-body',
    '[itemprop="articleBody"]'
  ];
  
  let articleElement = null;
  
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      articleElement = element;
      break;
    }
  }
  
  // If no article element found, use the main element or fallback to body
  if (!articleElement) {
    articleElement = document.querySelector('main') || document.body;
  }
  
  // Extract the headline
  const headlineSelectors = [
    'h1',
    '.headline',
    '.article-title',
    '.story-title',
    '[itemprop="headline"]'
  ];
  
  let headline = '';
  
  for (const selector of headlineSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      headline = element.textContent.trim();
      break;
    }
  }
  
  // Extract the paragraphs
  const paragraphs = [];
  const paragraphElements = articleElement.querySelectorAll('p');
  
  paragraphElements.forEach(p => {
    // Skip paragraphs that are likely not part of the main content
    if (p.textContent.trim().length > 20 && !p.closest('footer') && !p.closest('aside')) {
      paragraphs.push(p.textContent.trim());
    }
  });
  
  return {
    headline,
    paragraphs,
    url: window.location.href,
    source: window.location.hostname
  };
}

// Function to analyze the article
async function analyzeArticle() {
  console.log('analyzeArticle()');
  // Create the UI container if it doesn't exist
  let container = document.querySelector('.biasbuster-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'biasbuster-container';
    document.body.appendChild(container);
  }
  
  // Show the container
  container.classList.add('active');
  
  // Set the initial content with loading state
  container.innerHTML = `
    <div class="biasbuster-header">
      <h2>
        BiasBuster Analysis
        <button class="biasbuster-close">&times;</button>
      </h2>
    </div>
    <div class="biasbuster-content">
      <div class="biasbuster-loading">
        <div class="biasbuster-spinner"></div>
        <p>Analyzing article for bias...</p>
      </div>
    </div>
  `;
  
  // Add event listener to close button
  container.querySelector('.biasbuster-close').addEventListener('click', function() {
    container.classList.remove('active');
  });
  
  try {
    // Extract the article content
    const articleContent = extractArticleContent();
    
    // Analyze the article using AI
    const analysisResult = await analyzeWithAI(articleContent);
    
    // Update the UI with the analysis result
    updateUI(container, analysisResult);
    
    // Return the bias score for the popup
    return {
      biasScore: analysisResult.biasScore
    };
  } catch (error) {
    console.error('Error analyzing article:', error);
    
    // Show error in the UI
    container.querySelector('.biasbuster-content').innerHTML = `
      <div class="biasbuster-error">
        <h3>Error Analyzing Article</h3>
        <p>${error.message}</p>
        <button class="btn primary" id="retry-analysis">Retry</button>
      </div>
    `;
    
    // Add event listener to retry button
    container.querySelector('#retry-analysis').addEventListener('click', function() {
      analyzeArticle();
    });
    
    throw error;
  }
}

// Function to analyze the article using AI
async function analyzeWithAI(articleContent) {
  // Prepare the article text
  const articleText = `
    Title: ${articleContent.headline}
    
    ${articleContent.paragraphs.join('\n\n')}
  `;
  
  // Prepare the prompt for the AI
  const prompt = `
    You are BiasBuster, an AI designed to analyze news articles for bias and rewrite them to be more balanced and objective.
    
    Please analyze the following article for bias, fact-check its claims, and rewrite it to present a more balanced perspective.
    
    In your analysis, please:
    1. Identify biased language, loaded terms, or emotional appeals
    2. Highlight factual claims that need verification
    3. Note any missing context or alternative viewpoints
    4. Assign a bias score from 0 (completely neutral) to 10 (extremely biased)
    5. Determine the political leaning of the bias (left, right, or other)
    
    Then, rewrite the article to:
    1. Use neutral, objective language
    2. Include verified facts with sources
    3. Present multiple perspectives on controversial points
    4. Provide necessary context for a complete understanding
    5. Maintain the core information while eliminating bias
    
    Here is the article:
    ${articleText}
    
    Please format your response as a JSON object with the following structure:
    {
      "analysis": {
        "biasScore": number,
        "politicalLeaning": string,
        "biasedLanguage": [array of examples],
        "missingContext": [array of missing contexts],
        "factualIssues": [array of factual issues]
      },
      "rewrittenArticle": {
        "headline": string,
        "content": [array of paragraphs]
      },
      "sources": [array of source objects with title and url]
    }
  `;
  
  // Choose the AI model based on settings
  let apiEndpoint, apiKey, requestBody, headers;
  
  switch (settings.aiModel) {
    case 'openai':
      console.log('OpenAI selected');
      apiEndpoint = 'https://api.openai.com/v1/chat/completions';
      apiKey = settings.apiKey;
      requestBody = {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are BiasBuster, an AI designed to analyze news articles for bias and rewrite them to be more balanced and objective.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      };
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      };
      break;
      
    case 'anthropic':
      console.log('Anthropic selected');
      apiEndpoint = 'https://api.anthropic.com/v1/messages';
      apiKey = settings.apiKey;
      requestBody = {
        model: 'claude-3-opus-20240229',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3
      };
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      };
      break;
      
    case 'gemini':
      console.log('Gemini selected');
      // Make sure we're using the correct API endpoint and model version
      apiEndpoint = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${settings.apiKey}`;

      apiKey = settings.apiKey;
      requestBody = {
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
          topK: 1,
          topP: 1
        }
      };
      headers = {
        'Content-Type': 'application/json'
      };
      break;
      
    default:
      throw new Error('Invalid AI model selected');
  }
  
  // For testing without an API key, return mock data
  if (!apiKey) {
    console.log('No API key provided, using mock data');
    return getMockAnalysisResult(articleContent);
  }
  
  
  try {
    // Make the API request through the background script to avoid CORS issues
    const response = await chrome.runtime.sendMessage({
      action: 'fetchExternalData',
      url: apiEndpoint,
      options: {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(requestBody)
      }
    });
    
    console.log('Response received:', response);
    
    if (!response) {
      console.error('No response received from background script');
      throw new Error('No response received from background script');
    }
    
    if (!response.success) {
      console.error('API request failed:', response.error);
      throw new Error(`API request failed: ${response.error}`);
    }
    
    // Parse the response based on the AI model
    let analysisResult;
    
    try {
      switch (settings.aiModel) {
        case 'openai':
          console.log('Parsing OpenAI response');
          const openaiContent = response.data.choices[0].message.content;
          analysisResult = JSON.parse(openaiContent);
          break;
          
        case 'anthropic':
          console.log('Parsing Anthropic response');
          const anthropicContent = response.data.content[0].text;
          analysisResult = JSON.parse(anthropicContent);
          break;
          
        case 'gemini':
          console.log('Parsing Gemini response:', response.data);
          if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
            console.error('Unexpected Gemini response structure:', response.data);
            throw new Error('Unexpected Gemini response structure');
          }
          
          const geminiResponse = response.data.candidates[0];
          if (!geminiResponse.content || !geminiResponse.content.parts || !geminiResponse.content.parts[0]) {
            console.error('Missing content in Gemini response:', geminiResponse);
            throw new Error('Missing content in Gemini response');
          }
          
          let geminiContent = geminiResponse.content.parts[0].text;
          console.log('Gemini content before parsing:', geminiContent);
          
          // Check if the content is wrapped in Markdown code blocks and remove them
          if (geminiContent.startsWith('```') && geminiContent.includes('```')) {
            // Remove the opening code block marker (```json or just ```)
            geminiContent = geminiContent.replace(/^```(?:json)?\s*\n/, '');
            // Remove the closing code block marker
            geminiContent = geminiContent.replace(/\n```\s*$/, '');
            console.log('Gemini content after removing code blocks:', geminiContent);
          }
          
          try {
            analysisResult = JSON.parse(geminiContent);
          } catch (error) {
            console.error('Error parsing AI response:', error);
            console.error('Raw response data:', response.data);
            throw new Error('Failed to parse AI response. The response may not be in the expected format.');
          }
          break;
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response data:', response.data);
      throw new Error('Failed to parse AI response. The response may not be in the expected format.');
    }
    
    return analysisResult;
  } catch (error) {
    console.error('Error in analyzeWithAI:', error);
    throw error;
  }
}

// Function to get mock analysis result for testing
function getMockAnalysisResult(articleContent) {
  return {
    analysis: {
      biasScore: 7.5,
      politicalLeaning: 'left',
      biasedLanguage: [
        'The article uses emotionally charged language like "disastrous" and "catastrophic"',
        'The author refers to opposing viewpoints as "ridiculous" without substantive critique',
        'Uses loaded terms like "radical" and "extreme" to describe policies'
      ],
      missingContext: [
        'The article fails to mention economic benefits claimed by proponents',
        'No mention of historical precedents for similar policies',
        'Omits relevant statistics that might contradict the narrative'
      ],
      factualIssues: [
        'The claim about "record-high unemployment" is misleading as it omits seasonal adjustments',
        'The quoted statistic about economic impact is from a partisan think tank without disclosure',
        'The article misrepresents the position of the opposition by oversimplifying their stance'
      ]
    },
    rewrittenArticle: {
      headline: articleContent.headline.replace(/disastrous|catastrophic|radical|extreme/gi, 'controversial'),
      content: articleContent.paragraphs.map(p => {
        return p
          .replace(/disastrous|catastrophic/gi, 'significant')
          .replace(/radical|extreme/gi, 'substantial')
          .replace(/ridiculous/gi, 'contested');
      })
    },
    sources: [
      {
        title: 'Bureau of Labor Statistics - Unemployment Data',
        url: 'https://www.bls.gov/news.release/empsit.nr0.htm'
      },
      {
        title: 'Congressional Budget Office - Economic Analysis',
        url: 'https://www.cbo.gov/topics/economy'
      },
      {
        title: 'Pew Research Center - Public Opinion Survey',
        url: 'https://www.pewresearch.org/politics/'
      }
    ]
  };
}

// Function to update the UI with the analysis result
function updateUI(container, analysisResult) {
  // Create the tabs and content
  const content = `
    <div class="biasbuster-header">
      <h2>
        BiasBuster Analysis
        <button class="biasbuster-close">&times;</button>
      </h2>
    </div>
    <div class="biasbuster-content">
      <div class="biasbuster-tabs">
        <div class="biasbuster-tab active" data-tab="rewritten">Rewritten Article</div>
        <div class="biasbuster-tab" data-tab="analysis">Bias Analysis</div>
        <div class="biasbuster-tab" data-tab="original">Original Article</div>
      </div>
      
      <div class="biasbuster-tab-content active" id="tab-rewritten">
        <div class="biasbuster-article">
          <h1>${analysisResult.rewrittenArticle.headline}</h1>
          ${analysisResult.rewrittenArticle.content.map(p => `<p>${p}</p>`).join('')}
        </div>
        
        <div class="biasbuster-sources">
          <h3>Sources:</h3>
          ${analysisResult.sources.map(source => `
            <div class="biasbuster-source">
              <div class="biasbuster-source-title">${source.title}</div>
              <a href="${source.url}" class="biasbuster-source-url" target="_blank">${source.url}</a>
            </div>
          `).join('')}
        </div>
      </div>
      
      <div class="biasbuster-tab-content" id="tab-analysis">
        <div class="biasbuster-bias-meter">
          <span class="biasbuster-meter-label">Bias Score: ${analysisResult.analysis.biasScore}/10 (${analysisResult.analysis.politicalLeaning} leaning)</span>
          <div class="biasbuster-meter-bar">
            <div class="biasbuster-meter-fill" style="width: ${analysisResult.analysis.biasScore * 10}%"></div>
          </div>
          <div class="biasbuster-meter-markers">
            <span>Neutral</span>
            <span>Moderate Bias</span>
            <span>Extreme Bias</span>
          </div>
        </div>
        
        <h3>Biased Language:</h3>
        <ul>
          ${analysisResult.analysis.biasedLanguage.map(item => `<li>${item}</li>`).join('')}
        </ul>
        
        <h3>Missing Context:</h3>
        <ul>
          ${analysisResult.analysis.missingContext.map(item => `<li>${item}</li>`).join('')}
        </ul>
        
        <h3>Factual Issues:</h3>
        <ul>
          ${analysisResult.analysis.factualIssues.map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
      
      <div class="biasbuster-tab-content" id="tab-original">
        <div class="biasbuster-article">
          <h1>${extractArticleContent().headline}</h1>
          ${extractArticleContent().paragraphs.map(p => `<p>${p}</p>`).join('')}
        </div>
      </div>
    </div>
  `;
  
  // Update the container content
  container.innerHTML = content;
  
  // Add event listener to close button
  container.querySelector('.biasbuster-close').addEventListener('click', function() {
    container.classList.remove('active');
  });
  
  // Add event listeners to tabs
  const tabs = container.querySelectorAll('.biasbuster-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', function() {
      // Remove active class from all tabs and tab contents
      tabs.forEach(t => t.classList.remove('active'));
      container.querySelectorAll('.biasbuster-tab-content').forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab and corresponding content
      this.classList.add('active');
      container.querySelector(`#tab-${this.dataset.tab}`).classList.add('active');
    });
  });
  
  // Update stats in storage
  chrome.runtime.sendMessage({
    action: 'updateStats',
    biasScore: analysisResult.analysis.biasScore
  });
} 