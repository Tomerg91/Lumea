# Contributing to Lumea Coaching App

Thank you for your interest in contributing to the Lumea Coaching App! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

If you find a bug, please submit an issue using the bug report template. Before submitting, please check if the issue already exists.

When reporting bugs, include:
- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment information (browser, OS, etc.)

### Suggesting Enhancements

If you have ideas for enhancements, please submit an issue using the feature request template.

### Pull Requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Pull Request Guidelines

- Follow the coding style and standards used in the project
- Include tests if applicable
- Update documentation if necessary
- Ensure your code passes all tests (`npm run ci-all`)
- Keep your PR focused on a single topic
- Link any related issues in the PR description

## Development Setup

1. Clone the repository: `git clone https://github.com/yourusername/lumea-coaching.git`
2. Install dependencies: `npm run install:all`
3. Set up environment variables (see README.md)
4. Start the development server: `npm run dev`

## Coding Standards

### General

- Use TypeScript for all new code
- Follow the existing code style
- Use meaningful variable and function names
- Add comments for complex logic

### Frontend

- Follow React hooks patterns
- Use functional components
- Implement responsive design
- Follow accessibility best practices

### Backend

- Implement proper error handling
- Follow RESTful API design principles
- Write unit tests for new functionality

## Testing

Run tests before submitting a PR:
```bash
npm run test
```

## Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or modifying tests
- `chore`: Changes to the build process or auxiliary tools

## Licensing

By contributing to this project, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing to Lumea Coaching App! 