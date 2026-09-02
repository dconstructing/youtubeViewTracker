// Configuration - deployed Cloudflare Worker endpoint
const API_BASE_URL = 'https://youtube-viewership-tracker.losttime-shuffle.workers.dev/viewership';

// DOM elements
const videoForm = document.getElementById('video-form');
const videoInput = document.getElementById('video-input');
const fetchBtn = document.getElementById('fetch-btn');
const btnText = document.querySelector('.btn-text');
const loadingSpinner = document.querySelector('.loading-spinner');
const errorMessage = document.getElementById('error-message');
const resultsSection = document.getElementById('results-section');
const copyJsonBtn = document.getElementById('copy-json');

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