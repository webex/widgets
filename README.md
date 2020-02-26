<h1 align='center' style='border-bottom: none;'>Webex Widgets</h1>
<h3 align='center'>Library of React widgets to easily embed into your web applications!</h3>
<p align='center'>
<a href='https://circleci.com/gh/webex/widgets'>
    <img alt='CircleCI' src='https://circleci.com/gh/webex/widgets.svg?style=shield'>
  </a>
  <a href='https://www.npmjs.com/package/@webex/widgets'>
    <img alt='npm latest version' src='https://img.shields.io/npm/v/@webex/widgets?label=npm%40latest'>
  </a>
  <a href='#badge'>
    <img alt='semantic-release' src='https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg'>
  </a>
  <a href='https://github.com/webex/widgets/blob/master/package.json#L28'>
    <img src='https://img.shields.io/npm/l/webex.svg' alt='license'>
  </a>
</p>

**Webex Widgets** is a set of [React](https://reactjs.org) widgets following Webex standard styling,
aimed at react developers that want to embed the widgets into their applications.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Team](#team)

## Install

```bash
npm install --save webex @webex/widgets
```

## Usage

## Contributing

We'd love for you to contribute to our source code and to make the **Webex Widgets** even better than they are today! Here are some [guidelines](https://github.com/webex/widgets/blob/master/CONTRIBUTING.md) that we'd like you to follow.

### Issues

Please open an [issue](https://github.com/webex/widgets/issues) and we will get to it in an orderly manner.
Please leave as much as information as possible for a better understanding.

### Contributing Code

We are using [Airbnb Style Guide eslint rule](https://github.com/airbnb/javascript) and [prettier](https://github.com/prettier/prettier) to lint the code style.
Make sure your code your code follows our lint rules before submitting!

### Release Process

There is a list of commit types provided [here](https://github.com/webex/widgets/blob/master/CONTRIBUTING.md#type). However, not all commits trigger our release process.
We are using [semantic-release](https://github.com/semantic-release/semantic-release) to fully automate the version management and package publishing.
By default `semantic-release` uses the [Angular Commit Message Conventions](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines) and triggers release and publishing based on the following rules:

| Commit                             | Release type  |
| ---------------------------------- | ------------- |
| Commit with type `BREAKING CHANGE` | Major release |
| Commit with type `feat`            | Minor release |
| Commit with type `fix`             | Patch release |
| Commit with type `perf`            | Patch release |

#### Commit linter

We are using [commitlint](https://github.com/conventional-changelog/commitlint) to lint the commit messages.
Please make sure to choose the appropriate commit [type](https://github.com/webex/widgets/blob/master/CONTRIBUTING.md#type), [scope](https://github.com/webex/widgets/blob/master/CONTRIBUTING.md#scope) and [subject](https://github.com/webex/widgets/blob/master/CONTRIBUTING.md#scope).

## License

[MIT License](https://opensource.org/licenses/MIT)

## Support

For more developer resources, tutorials and support, visit the Webex developer portal, https://developer.webex.com.

## Team

| [![Adam Weeks](https://github.com/adamweeks.png?size=100)](https://github.com/adamweeks) | [![Arash Koushkebaghi](https://github.com/akoushke.png?size=100)](https://github.com/akoushke) | [![David Hoff](https://github.com/harborhoffer.png?size=100)](https://github.com/harborhoffer) | [![Lalli Flores](https://github.com/lalli-flores.png?size=100)](https://github.com/lalli-flores) | [![Michael Wegman](https://github.com/mwegman.png?size=100)](https://github.com/mwegman) | [![Taymoor Khan](https://github.com/taymoork2.png?size=100)](https://github.com/taymoork2) | [![Timothy Scheuering](https://github.com/InteractiveTimmy.png?size=100)](https://github.com/InteractiveTimmy) |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| [Adam Weeks](https://github.com/adamweeks)                                               | [Arash Koushkebaghi](https://github.com/akoushke)                                              | [David Hoff](https://github.com/harborhoffer)                                                  | [Lalli Flores](https://github.com/lalli-flores)                                                  | [Michael Wegman](https://github.com/mwegman)                                             | [Taymoor Khan](https://github.com/taymoork2)                                               | [Timothy Scheuering](https://github.com/InteractiveTimmy)                                                      |
