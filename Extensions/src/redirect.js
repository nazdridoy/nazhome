function handleError() {
    document.querySelector('iframe').style.display = 'none';
    document.querySelector('.error-message').style.display = 'block';
}

// Add event listener to handle iframe load errors
document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.querySelector('iframe');
    iframe.addEventListener('error', handleError);

    // Handle navigation and download events from the iframe
    window.addEventListener('message', (event) => {
        if (event.origin === 'https://nazhome.pages.dev') {
            if (event.data.type === 'navigation') {
                // Navigate to the URL directly instead of trying to load in iframe
                window.location.href = event.data.url;
            } else if (event.data.type === 'download') {
                // Handle file download
                const blob = new Blob([event.data.content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = event.data.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        }
    });
}); 