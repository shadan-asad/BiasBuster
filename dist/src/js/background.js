// Listen for installation
chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      aiModel: 'openai',
      apiKey: '',
      autoAnalyze: false,
      highlightBias: true,
      articlesAnalyzed: 0,
      lastBiasScore: 'N/A'
    });
    
    // Open onboarding page
    chrome.tabs.create({
      url: 'src/onboarding.html'
    });
  }
});

// Listen for messages from content scripts or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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

// Optional: Add context menu for quick access
chrome.contextMenus.create({
  id: 'analyzePage',
  title: 'Analyze this article with BiasBuster',
  contexts: ['page']
});

chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === 'analyzePage') {
    chrome.tabs.sendMessage(tab.id, { action: 'analyzeArticle' });
  }
}); 