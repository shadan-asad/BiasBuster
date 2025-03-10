document.addEventListener('DOMContentLoaded', function() {
  // DOM elements
  const analyzeBtn = document.getElementById('analyze-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const saveSettingsBtn = document.getElementById('save-settings');
  const statusIcon = document.querySelector('.status-icon');
  const statusText = document.querySelector('.status-text');
  const biasScore = document.getElementById('bias-score');
  const articlesCount = document.getElementById('articles-count');
  const aiModelSelect = document.getElementById('ai-model');
  const apiKeyInput = document.getElementById('api-key');
  const autoAnalyzeCheckbox = document.getElementById('auto-analyze');
  const highlightBiasCheckbox = document.getElementById('highlight-bias');
  const privacyLink = document.getElementById('privacy-link');

  // Load settings from storage
  loadSettings();
  
  // Load stats from storage
  loadStats();

  // Check if we're on a news article page
  checkIfNewsArticle();

  // Event listeners
  analyzeBtn.addEventListener('click', analyzeArticle);
  settingsBtn.addEventListener('click', toggleSettings);
  saveSettingsBtn.addEventListener('click', saveSettings);
  privacyLink.addEventListener('click', showPrivacyPolicy);

  // Functions
  function loadSettings() {
    chrome.storage.sync.get({
      aiModel: 'openai',
      apiKey: '',
      autoAnalyze: false,
      highlightBias: true
    }, function(items) {
      aiModelSelect.value = items.aiModel;
      apiKeyInput.value = items.apiKey;
      autoAnalyzeCheckbox.checked = items.autoAnalyze;
      highlightBiasCheckbox.checked = items.highlightBias;
    });
  }

  function saveSettings() {
    const settings = {
      aiModel: aiModelSelect.value,
      apiKey: apiKeyInput.value,
      autoAnalyze: autoAnalyzeCheckbox.checked,
      highlightBias: highlightBiasCheckbox.checked
    };

    chrome.storage.sync.set(settings, function() {
      // Show success message
      const successMsg = document.createElement('div');
      successMsg.textContent = 'Settings saved!';
      successMsg.style.color = '#4caf50';
      successMsg.style.marginTop = '10px';
      successMsg.style.textAlign = 'center';
      
      saveSettingsBtn.insertAdjacentElement('afterend', successMsg);
      
      // Remove message after 2 seconds
      setTimeout(() => {
        successMsg.remove();
      }, 2000);
      
      // Hide settings panel
      toggleSettings();
    });
  }

  function loadStats() {
    chrome.storage.sync.get({
      articlesAnalyzed: 0,
      lastBiasScore: 'N/A'
    }, function(items) {
      articlesCount.textContent = items.articlesAnalyzed;
      biasScore.textContent = items.lastBiasScore;
    });
  }

  function toggleSettings() {
    if (settingsPanel.style.display === 'none' || !settingsPanel.style.display) {
      settingsPanel.style.display = 'block';
      settingsBtn.textContent = 'Close Settings';
    } else {
      settingsPanel.style.display = 'none';
      settingsBtn.textContent = 'Settings';
    }
  }

  function checkIfNewsArticle() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {action: "checkIfNewsArticle"}, function(response) {
        if (response && response.isNewsArticle) {
          statusIcon.textContent = '🟢';
          statusText.textContent = 'News article detected';
          analyzeBtn.disabled = false;
        } else {
          statusIcon.textContent = '⚪';
          statusText.textContent = 'No news article detected';
          analyzeBtn.disabled = true;
        }
      });
    });
  }

  function analyzeArticle() {
    // Update UI to show analysis in progress
    statusIcon.textContent = '🔄';
    statusText.textContent = 'Analyzing article...';
    analyzeBtn.disabled = true;
    
    // Send message to content script to analyze the article
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: "analyzeArticle",
        settings: {
          aiModel: aiModelSelect.value,
          apiKey: apiKeyInput.value,
          highlightBias: highlightBiasCheckbox.checked
        }
      }, function(response) {
        if (response && response.success) {
          // Update UI to show analysis complete
          statusIcon.textContent = '✅';
          statusText.textContent = 'Analysis complete';
          
          // Update bias score
          biasScore.textContent = response.biasScore;
          
          // Update articles analyzed count
          chrome.storage.sync.get({articlesAnalyzed: 0}, function(items) {
            const newCount = items.articlesAnalyzed + 1;
            chrome.storage.sync.set({
              articlesAnalyzed: newCount,
              lastBiasScore: response.biasScore
            });
            articlesCount.textContent = newCount;
          });
        } else {
          // Update UI to show analysis failed
          statusIcon.textContent = '❌';
          statusText.textContent = 'Analysis failed: ' + (response ? response.error : 'Unknown error');
        }
        
        // Re-enable analyze button
        analyzeBtn.disabled = false;
      });
    });
  }

  function showPrivacyPolicy() {
    chrome.tabs.create({url: 'src/privacy.html'});
  }
}); 