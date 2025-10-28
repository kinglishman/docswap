/* DocSwap - Icon and Favicon Generator */

document.addEventListener('DOMContentLoaded', function() {
    // Create dynamic favicon
    generateFavicon();
});

// Set favicon to use docswap icon.png
function generateFavicon() {
    // Set favicon to use the DocSwap icon
    const favicon = document.getElementById('favicon');
    if (favicon) {
        favicon.href = 'docswap icon.png';
    }
}