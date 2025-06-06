# Contributing to NazHome

Thank you for your interest in contributing to NazHome! This document provides guidelines and instructions for contributing to this project.

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/nazHome.git`
3. Navigate to the project directory: `cd nazHome`
4. Install dependencies: `npm install` 
5. Start the development server: `npm run dev` (using Vite based on your vite.config.js)
6. Open the project in your preferred code editor

## Code Structure

- `src/index.html` - Main HTML document
- `src/styles.css` - CSS styles
- `src/script.js` - JavaScript functionality
- `src/utils.js` - Helper functions and utilities
- `public/` - Static assets
- `scripts/` - Build and utility scripts
- `Extensions/` - Project extensions

## Code Style Guidelines

- Use consistent indentation (4 spaces)
- Follow semantic HTML practices
- Keep CSS organized by component/section
- Write modular JavaScript functions
- Add comments for complex logic

## Pull Request Guidelines

Before submitting a pull request, please make sure that:
  
- Your code follows the project's coding conventions
- You have tested your changes thoroughly
- All existing tests pass (if applicable)
- The commit messages are clear and follow conventional commit guidelines as specified in [COMMIT_GUIDELINES.md](COMMIT_GUIDELINES.md)
- You have provided a detailed explanation of the changes in the pull request description

## Submitting Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test thoroughly
4. Commit with clear messages: `git commit -m "feat: description"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a Pull Request against the main repository

## Testing

Before submitting your changes, please test:

- Basic functionality in different browsers
- Responsive layout on different screen sizes
- Any new features you've added
- Any components you've modified

## Issue Reporting

When opening an issue, please:

- Use a clear and descriptive title
- Provide a detailed description of the issue, including the environment and steps to reproduce
- Include any relevant screenshots, logs, or code snippets
- Specify your browser and operating system
- Search the repository for similar issues before creating a new one

## Feature Requests

Feature requests are welcome! To submit a feature request:

- Use a clear and descriptive title
- Provide a detailed description of the proposed feature
- Explain why this feature would be useful to NazHome users
- If possible, suggest how it might be implemented

## Questions and Discussions

For questions about the project that aren't bugs or feature requests, please use GitHub Discussions instead of opening an issue. This helps keep the issue tracker focused on bugs and features.

## License

By contributing to this project, you agree that your contributions will be licensed under the same [LICENSE](LICENSE) as the project.
