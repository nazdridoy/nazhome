function handleError() {
    document.querySelector('iframe').style.display = 'none';
    document.querySelector('.error-message').style.display = 'block';
}

// Add event listener to handle iframe load errors
document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.querySelector('iframe');
    iframe.addEventListener('error', handleError);

    // Handle navigation events from the iframe
    window.addEventListener('message', (event) => {
        if (event.origin === 'https://nazhome.pages.dev') {
            if (event.data.type === 'navigation') {
                // Open the URL in a new tab
                window.open(event.data.url, '_blank');
            }
        }
    });
}); 