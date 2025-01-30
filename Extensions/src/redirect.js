function handleError() {
    document.querySelector('iframe').style.display = 'none';
    document.querySelector('.error-message').style.display = 'block';
}

// Add event listener to handle iframe load errors
document.addEventListener('DOMContentLoaded', () => {
    const iframe = document.querySelector('iframe');
    iframe.addEventListener('error', handleError);
}); 