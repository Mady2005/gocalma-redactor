# Contributing to GoCalma

Thank you for your interest in contributing to GoCalma! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a positive community

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in Issues
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce
   - Expected vs actual behavior
   - Browser and version
   - Screenshots if applicable

### Suggesting Features

1. Check existing feature requests
2. Create a new issue with:
   - Clear use case description
   - Why this feature would be valuable
   - Proposed implementation (if any)

### Code Contributions

#### Setup

```bash
# Fork the repository
git clone https://github.com/yourusername/gocalma-redactor.git
cd gocalma-redactor

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Development Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes:
   - Write clear, commented code
   - Follow existing code style
   - Add tests if applicable
   - Update documentation

3. Test your changes:
   ```bash
   npm test
   ```

4. Commit your changes:
   ```bash
   git commit -m "feat: add amazing feature"
   ```

5. Push and create a Pull Request:
   ```bash
   git push origin feature/your-feature-name
   ```

#### Commit Message Format

Follow conventional commits:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

Example: `feat: add support for scanned PDFs with OCR`

#### Code Style

- Use ES6+ features
- Use meaningful variable names
- Add JSDoc comments for functions
- Keep functions focused and small
- Follow existing patterns in the codebase

#### Testing

- Add unit tests for new functions
- Ensure all tests pass before submitting PR
- Test across different browsers if possible

## Privacy Principles

All contributions must maintain these principles:
- **No data collection**: No analytics, tracking, or telemetry
- **Local processing**: All AI/processing stays in browser
- **No external API calls**: Self-contained functionality
- **Open and auditable**: Clear, readable code

## Areas for Contribution

### High Priority
- Image redaction with OCR (Tesseract.js)
- Improved PII detection patterns
- Multi-language NER models
- Performance optimizations
- Browser compatibility fixes

### Medium Priority
- Batch file processing
- Export to different formats
- Custom redaction rules
- UI/UX improvements
- Documentation improvements

### Low Priority
- Additional file formats
- Themes/customization
- Advanced statistics
- Integration examples

## Pull Request Process

1. Ensure your PR:
   - Has a clear description
   - Links to related issues
   - Includes tests (if applicable)
   - Updates documentation
   - Passes all checks

2. Request review from maintainers

3. Address feedback promptly

4. Once approved, a maintainer will merge

## Questions?

- Open a Discussion for general questions
- Join our community chat (link)
- Email: hello@gocalma.example.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

Thank you for helping make GoCalma better! 🛡️
