// Available backends. Both URLs are baked in so the active one can be switched
// at runtime (no redeploy) via the header dropdown, a ?backend= query param, or
// a remembered localStorage choice. Both endpoints send permissive CORS headers.
const BACKENDS = {
    cloudflare: {
        label: 'Cloudflare Worker',
        url: 'https://youtube-viewership-tracker.losttime-shuffle.workers.dev/viewership',
    },
    lambda: {
        label: 'AWS Lambda',
        url: 'https://293sk7u4e3.execute-api.us-east-2.amazonaws.com/viewership',
    },
};
const DEFAULT_BACKEND = 'cloudflare';
const BACKEND_STORAGE_KEY = 'yvt.backend';

function readStoredBackend() {
    try {
        return localStorage.getItem(BACKEND_STORAGE_KEY);
    } catch (error) {
        return null; // localStorage may be unavailable (e.g. private mode).
    }
}

function storeBackend(key) {
    try {
        localStorage.setItem(BACKEND_STORAGE_KEY, key);
    } catch (error) {
        // Ignore - the selection just won't persist across reloads.
    }
}

// Resolve the active backend: a valid ?backend= wins (and is remembered), then
// the stored choice, then the default.
function resolveBackend() {
    const fromQuery = new URLSearchParams(window.location.search).get('backend');
    if (fromQuery && Object.hasOwn(BACKENDS, fromQuery)) {
        storeBackend(fromQuery);
        return fromQuery;
    }
    const stored = readStoredBackend();
    if (stored && Object.hasOwn(BACKENDS, stored)) {
        return stored;
    }
    return DEFAULT_BACKEND;
}

const activeBackend = resolveBackend();
let API_BASE_URL = BACKENDS[activeBackend].url;

// DOM elements
const videoForm = document.getElementById('video-form');
const videoInput = document.getElementById('video-input');
const fetchBtn = document.getElementById('fetch-btn');
const btnText = document.querySelector('.btn-text');
const loadingSpinner = document.querySelector('.loading-spinner');
const errorMessage = document.getElementById('error-message');
const resultsSection = document.getElementById('results-section');
const copyJsonBtn = document.getElementById('copy-json');
const backendSelect = document.getElementById('backend-select');

// Result elements
const viewCount = document.getElementById('view-count');
const likeCount = document.getElementById('like-count');
const commentCount = document.getElementById('comment-count');
const videoTitle = document.getElementById('video-title');
const channelName = document.getElementById('channel-name');
const publishDate = document.getElementById('publish-date');
const retrievedDate = document.getElementById('retrieved-date');
const jsonOutput = document.getElementById('json-output');

let currentData = null;

// Populate and wire the backend selector so it can be switched without a redeploy.
if (backendSelect) {
    for (const [key, config] of Object.entries(BACKENDS)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = config.label;
        backendSelect.appendChild(option);
    }
    backendSelect.value = activeBackend;
    backendSelect.addEventListener('change', () => {
        const key = backendSelect.value;
        if (!Object.hasOwn(BACKENDS, key)) return;
        API_BASE_URL = BACKENDS[key].url;
        storeBackend(key);
        console.log('Switched backend to', key, API_BASE_URL);
    });
}

// Utility functions
function formatNumber(num) {
    // The API returns null for counts YouTube doesn't report (e.g. likes
    // hidden or comments disabled) - show "Unknown" rather than a false 0.
    if (num === null || num === undefined) {
        return 'Unknown';
    }
    const parsed = parseInt(num, 10);
    return Number.isNaN(parsed) ? 'Unknown' : parsed.toLocaleString();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    resultsSection.style.display = 'none';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function setLoading(loading) {
    if (loading) {
        fetchBtn.disabled = true;
        btnText.style.display = 'none';
        loadingSpinner.style.display = 'inline-block';
    } else {
        fetchBtn.disabled = false;
        btnText.style.display = 'inline';
        loadingSpinner.style.display = 'none';
    }
}

function displayResults(data) {
    // Update stats cards
    viewCount.textContent = formatNumber(data.viewCount);
    likeCount.textContent = formatNumber(data.likeCount);
    commentCount.textContent = formatNumber(data.commentCount);
    
    // Update video info
    videoTitle.textContent = data.title;
    channelName.textContent = data.channelTitle;
    publishDate.textContent = formatDate(data.publishedAt);
    retrievedDate.textContent = formatDateTime(data.retrievedAt);
    
    // Update JSON output
    jsonOutput.textContent = JSON.stringify(data, null, 2);
    
    // Store current data for copying
    currentData = data;
    
    // Show results
    resultsSection.style.display = 'block';
    hideError();
}

async function fetchVideoData(input) {
    try {
        setLoading(true);
        hideError();
        
        // Construct URL with query parameter
        const paramName = input.includes('youtube.com') || input.includes('youtu.be') ? 'url' : 'videoId';
        const url = `${API_BASE_URL}?${paramName}=${encodeURIComponent(input)}`;
        
        console.log('Making request to:', url);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        displayResults(result.data);
        
    } catch (error) {
        console.error('Error fetching video data:', error);
        showError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
        setLoading(false);
    }
}

// Event listeners
videoForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const input = videoInput.value.trim();
    if (!input) {
        showError('Please enter a YouTube URL or Video ID');
        return;
    }
    
    await fetchVideoData(input);
});

copyJsonBtn.addEventListener('click', async () => {
    if (!currentData) return;
    
    try {
        await navigator.clipboard.writeText(JSON.stringify(currentData, null, 2));
        
        // Visual feedback
        const originalText = copyJsonBtn.textContent;
        copyJsonBtn.textContent = 'Copied!';
        copyJsonBtn.style.background = '#28a745';
        
        setTimeout(() => {
            copyJsonBtn.textContent = originalText;
            copyJsonBtn.style.background = '';
        }, 2000);
        
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        // Fallback: select the text
        const range = document.createRange();
        range.selectNode(jsonOutput);
        window.getSelection().removeAllRanges();
        window.getSelection().addRange(range);
    }
});

// Handle URL parameters for direct access
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const videoId = urlParams.get('v') || urlParams.get('videoId');
    const url = urlParams.get('url');
    
    if (videoId) {
        videoInput.value = videoId;
        fetchVideoData(videoId);
    } else if (url) {
        videoInput.value = url;
        fetchVideoData(url);
    }
});