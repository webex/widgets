# Contributing

We'd love for you to contribute to our source code and to make **Webex Widgets** even better than they are today!
If you would like to contribute to this repository by adding features, enhancements or bug fixes, you must follow our process:

1. [Create an issue](https://github.com/webex/widgets/issues) to propose your solution _before_ you get coding
2. Let core members know about your proposal by posting a message in the [contributor's Webex Teams space](https://eurl.io/#Bk9WGfRcB)
3. A core member will review your proposal and if necessary may suggest to have a meeting to better understand your approach
   - You are welcomed you join our [weekly review meeting](https://cisco.webex.com/m/f4ebbec6-c306-49ca-83f4-fb2d098fc946) (Thursdays, 11:30a-12:30p PST) to propose your contribution as well
4. If your proposal is approved you should start coding at this point
5. We recommend opening a draft PR to receive feedback before finalizing your solution
   - When opening a draft PR, specify with PR comments where in the code you would like to get feedback
6. Before opening a PR ensure **all** [PR guidelines](#pull-request-guidelines) are followed
7. Let core members know about your PR by posting a message in the [contributor's Webex Teams space](https://eurl.io/#Bk9WGfRcB)
8. Core members will review the pull request and provide feedback when necessary
   - If a PR is too large, you may be asked to break it down into multiple smaller-scoped PRs
9. Once the PR is approved by a core member, it will be merged
10. Celebrate! Your code is released 🎈🎉🍻

## Table of Contents

- [Opening an Issue](#opening-an-issue)
  - [Grammar](#grammar)
- [Pull Request Guidelines](#pull-request-guidelines)
  - [Documentation](#documentation)
  - [Testing](#testing)
  - [Code Style](#code-style)
  - [Git Commit](#git-commit)
- [Release Process](#release-process)

## Opening an Issue

The title of a Bug or Enhancement should clearly indicate what is broken or desired. Use the description to explain possible solutions or add details and (especially for Enhancements) explain _how_ or _why_ the issue is broken or desired. Follow the template!

### Grammar

While quibbling about grammar in issue titles may seem a bit pedantic, adhering to some simple rules can make it much easier to understand a Bug or an Enhancement from the title alone. For example, is the title **"Browsers should support blinking text"** a bug or a feature request?

- Enhancements: The title should be an imperative statement of how things should be. **"Add support for blinking text"**
- Bugs: The title should be a declarative statement of how things are. **"Text does not blink"**

## Pull Request Guidelines

Pull requests must include code documentation, tests, follow code style and commits format.

### Documentation

All methods, functions and object structures should be documented following [JSDoc](https://jsdoc.app/index.html) style comments.

### Testing

We take testing very seriously, all code changes must include unit, integration and end-to-end tests.

- **Unit**: Tests at the file level with mocked external requests
- **Integration**: Tests at the application level with mocked I/O requests
- **End-to-end**: Tests the application in a system

### Code Style

Code style is enforced by [linters](https://eslint.org). Use `npm run test:eslint` to verify that your code is beautiful, too!
We highly discourage disabling eslint rules.
Unless there is an exceptional use case, we may request additional changes to your PR.

### Git Commit

As part of the build process, commits are run through [conventional changelog](https://github.com/conventional-changelog/conventional-changelog) to generate the changelog. Please adhere to the following guidelines when formatting your commit messages.

#### Commit Message Format

Each commit message consists of a **header**, a **body** and a **footer**. The header has a special format that includes a **type**, a **scope** and a **subject**:

    <type>(<scope>): <subject>
    <BLANK LINE>
    <body>
    <BLANK LINE>
    <footer>

The **header** is mandatory and the scope of the header is optional.

Any line of the commit message cannot be longer 79 characters! This allows the message to be easier to read on GitHub as well as in various git tools.

#### Revert

If the commit reverts a previous commit, it should begin with `revert:`, followed by the header of the reverted commit.
In the body it should say: `This reverts commit <hash>`., where the hash is the SHA of the commit being reverted.
The body should also explain why the commit was reverted.

#### Type

Must be one of the following:

- **build**: Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm)
- **ci**: Changes to our CI configuration files and scripts (example scopes: Circle, BrowserStack, SauceLabs)
- **docs**: Documentation only changes
- **feat**: A new feature
- **fix**: A bug fix
- **perf**: A code change that improves performance
- **refactor**: A code change that neither fixes a bug nor adds a feature
- **style**: Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
- **test**: Adding missing tests or correcting existing tests

#### Scope

The scope should indicate what is being changed. Generally, these should match widgets names. For example, `WebexMeetingWidget`, etc. Other than those, `tooling` tends to be the most common.

#### Subject

The subject contains succinct description of the change:

- use the imperative, present tense: "change" not "changed" nor "changes"
- don't capitalize first letter
- no dot (.) at the end

#### Body

Just as in the **subject** the imperative, present tense: "change" not "changed" nor "changes". The body should include the motivation for the change and contrast this with previous behavior.

#### Footer

The footer should contain any information about **Breaking changes** and is also the place to reference GitHub issues that this commit **closes**.

**Breaking Changes** should start with the word `BREAKING CHANGE:` with a space or two newlines. The rest of the commit message is then used for this.

## Release Process

While the complete list of commit types is provided in the [above _Type_ section](#type),
not all commits trigger our release process.
We use [semantic-release](https://github.com/semantic-release/semantic-release) to fully automate the version management
and package publishing.
By default `semantic-release` uses the
[Angular commit message conventions](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines)
and triggers release and publishing based on the following rules:

| Commit                             | Release type  |
| ---------------------------------- | ------------- |
| Commit with type `BREAKING CHANGE` | Major release |
| Commit with type `feat`            | Minor release |
| Commit with type `fix`             | Patch release |
| Commit with type `perf`            | Patch release |
