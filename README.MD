# Git Helper CLI 🚀

## Overview

Git Helper CLI is an intelligent command-line tool that revolutionizes Git workflows by combining traditional Git operations with AI-powered commit message generation. Using Groq's lightning-fast AI models, it analyzes your code changes and creates professional, conventional commit messages automatically - all while keeping your workflow simple and efficient.

## ✨ Key Features

- **🤖 AI-Powered Commit Messages** - Automatically generates conventional commit messages using Groq AI
- **⚡ Lightning Fast** - Built on Groq's infrastructure for sub-second response times
- **🎯 Smart Git Operations** - Stage, commit, and push with a single command
- **🔧 Flexible Configuration** - Project-specific and global settings support
- **🆓 16 Free AI Models** - Choose from multiple free Groq models optimized for different use cases
- **🛡️ Secure by Design** - API keys stored locally, never committed to repos
- **📋 Conventional Commits** - Follows industry-standard commit message format
- **🌈 Beautiful CLI** - Colorful, intuitive interface with progress indicators

## 🚀 Installation

Install Git Helper CLI globally via npm:

```bash
npm install -g git-helper-cli
```

## ⚙️ Quick Setup

### 1. Choose Your AI Model

```bash
# See all 16 available free models
git-helper config --list-models

# Set your preferred model (recommended: llama-3.3-70b-versatile)
git-helper config --set-model llama-3.3-70b-versatile
```

### 2. Add Your Groq API Key

```bash
# Get a free API key from https://console.groq.com/
git-helper config --set-key gsk_your_groq_api_key_here
```

### 3. Start Using AI Commits!

```bash
# Stage changes and let AI create the commit message
git-helper push --ai

# Or generate a message without committing
git-helper commit-msg
```

## 📖 Usage Guide

### AI-Powered Push

Let AI analyze your changes and create the perfect commit message:

```bash
git-helper push --ai
git-helper push --ai --branch feature/new-feature
```

### Manual Push

Traditional push with your own message:

```bash
git-helper push "feat(auth): add OAuth integration"
git-helper push "fix: resolve memory leak" --branch bugfix/memory
```

### Pull Changes

```bash
git-helper pull
git-helper pull --branch main
```

### Generate AI Commit Messages

Preview AI-generated messages without committing:

```bash
git-helper commit-msg
```

### Advanced Options

```bash
# Dry run - see what would happen without executing
git-helper push --ai --dry-run

# Use current branch automatically
git-helper push "your message"  # auto-detects current branch
```

## 🎯 Available AI Models

Choose from 16 free models optimized for different needs:

| Model                           | Best For                 | Speed      |
| ------------------------------- | ------------------------ | ---------- |
| `llama-3.3-70b-versatile` ⭐    | Overall best performance | Fast       |
| `qwen-2.5-coder-32b`            | Code understanding       | Fast       |
| `deepseek-r1-distill-llama-70b` | Complex reasoning        | Medium     |
| `llama-3.1-8b-instruct`         | Speed & efficiency       | Ultra-fast |
| `mixtral-8x7b-32768`            | Large context            | Medium     |

_⭐ = Recommended default_

## ⚙️ Configuration Management

### Project-Specific Settings

```bash
# Set API key for current project only
git-helper config --set-key gsk_your_key

# Set model for current project
git-helper config --set-model llama-3.1-70b-instruct

# View current configuration
git-helper config --show
```

### Global Settings (Fallback)

```bash
# Set global defaults
git-helper config --set-global-key gsk_your_key
git-helper config --set-global-model qwen-2.5-coder-32b

# Reset configurations
git-helper config --reset          # Reset project config
git-helper config --reset-global   # Reset global config
```

### Priority System

The tool uses this priority order:

1. **Environment Variable** (`GROQ_API_KEY`)
2. **Project Config** (`.git-helper-config.json`)
3. **Global Config** (`~/.git-helper-global.json`)

## 🛡️ Security Features

- **Local Storage**: API keys stored locally, never transmitted except to Groq
- **Auto .gitignore**: Config files automatically added to .gitignore
- **Input Sanitization**: Prevents command injection attacks
- **Validation**: Checks for git repos and staged changes

## 💡 Examples

### Typical Workflow

```bash
# 1. Make your code changes
vim src/auth.js

# 2. Let AI create the perfect commit message and push
git-helper push --ai

# Output:
# ✅ AI generated message: "feat(auth): add JWT token validation"
# ✅ Changes pushed successfully!
```

### Team Collaboration

```bash
# Each team member sets their own API key
git-helper config --set-key gsk_alice_key    # Alice's key
git-helper config --set-key gsk_bob_key      # Bob's key

# Config file is gitignored automatically
# Everyone uses the same model settings
git-helper config --set-model qwen-2.5-coder-32b
```

### Different Models for Different Projects

```bash
# Use code-optimized model for backend
cd backend-api/
git-helper config --set-model qwen-2.5-coder-32b

# Use general model for documentation
cd docs/
git-helper config --set-model llama-3.3-70b-versatile
```

## 🔧 Advanced Features

### Dry Run Mode

See what would happen without executing:

```bash
git-helper push --ai --dry-run

# Output:
# Dry run - would execute:
#   git add .
#   git commit -m "feat(api): add user authentication"
#   git push origin main
```

### Smart Branch Detection

Automatically uses your current branch:

```bash
git checkout feature/user-auth
git-helper push --ai  # Automatically pushes to feature/user-auth
```

### Validation & Safety

- Checks if you're in a git repository
- Verifies staged changes exist
- Validates API keys and models
- Sanitizes commit messages

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Test thoroughly**
5. **Use the tool to commit**: `git-helper push --ai` 😉
6. **Submit a pull request**

### Development Setup

```bash
git clone https://github.com/your-username/git-helper-cli
cd git-helper-cli
npm install
npm link  # Test locally
```

## 📊 Why Git Helper CLI?

| Traditional Git              | Git Helper CLI              |
| ---------------------------- | --------------------------- |
| `git add .`                  | ✅ Automated                |
| Think of commit message      | 🤖 AI generates it          |
| `git commit -m "message"`    | ✅ Automated                |
| `git push origin branch`     | ✅ Automated                |
| Remember conventional format | 📋 Always follows standards |
| Context switching to think   | ⚡ Instant, context-aware   |

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Groq** for providing lightning-fast AI inference
- **Commander.js** for excellent CLI framework
- **Chalk** for beautiful terminal colors
- The open-source community for inspiration

---

## Keywords

`git` `ai` `cli` `groq` `commit-messages` `conventional-commits` `developer-tools` `automation` `git-helper` `command-line` `productivity` `llama` `ai-powered` `git-workflow`

---

**Made with ❤️ for developers who value their time**
