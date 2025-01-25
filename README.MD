# Git Helper CLI

## Overview

Git Helper CLI is a command-line tool designed to simplify and streamline common Git operations like pushing, pulling, and committing changes. With easy-to-use commands and user-friendly feedback, this tool helps developers save time and avoid the complexity of multiple steps when working with Git.

## Features

- Stage, commit, and push changes to a Git repository with a single command.
- Pull changes from any specified branch.
- Display user-friendly error messages with playful tones.
- Show a spinner during operations to indicate progress.

## Installation

To install Git Helper CLI globally via npm, run the following command:

```bash
npm install -g git-helper-cli
```

Alternatively, you can install it locally in your project:

```bash
npm install git-helper-cli
```

## Usage

### Push Changes

To stage, commit, and push changes:

```bash
npx git-helper push "Your commit message"
```

You can also specify a branch using the `-b` or `--branch` option:

```bash
npx git-helper push "Your commit message" -b your-branch-name
```

### Pull Changes

To pull changes from a specified branch:

```bash
npx git-helper pull -b your-branch-name
```

```bash
npx git-helper pull -b your-branch-name
```

### Help Command

To display usage information:

```bash
npx git-helper help
```

## Error Handling

Error messages are fun and engaging to make your development experience more enjoyable. If something goes wrong during an operation, you’ll see a humorous message along with troubleshooting tips.

## Contributing

Feel free to fork the repository, open issues, or submit pull requests if you'd like to contribute to this project. Any feedback or improvements are welcome!

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

### Keywords

- git
- github
- cli
- command line tool
- development
- git helper
- helper
- cli tool
