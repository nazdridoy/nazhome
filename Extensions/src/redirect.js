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
                // Navigate to the URL directly instead of trying to load in iframe
                window.location.href = event.data.url;
            }
        }
    });
}); 