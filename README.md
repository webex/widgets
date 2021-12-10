<div align='center'>
  <h1>Webex Widgets</h1>
  <h3>Embed the power of Webex in your web applications ✨</h3>

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
</div>

**Webex Widgets** are a set of self-contained [React](https://reactjs.org) components
that follow the [Webex](https://www.webex.com) products experience,
aimed at developers that want to embed Webex into their applications.

## Table of Contents

- [Install](#install)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)
- [Team](#team)

## Install

```bash
npx install-peerdeps @webex/widgets
```

This will install the Widgets package, peer dependencies and dependencies.

## Usage

### Styles

In order to properly style Webex Widgets, you will need to import our CSS separately.
Import `@webex/widgets/dist/css/webex-widgets.css` into your main entry file.

There are two ways to do this:

#### JavaScript

In your `App.js[x]`, add the following import:

```js
import '@webex/widgets/dist/css/webex-widgets.css';

...
```

#### HTML

In the `<head>` tag of your `index.html`, add the following tag:

```html
<head>
  ...

  <link rel="stylesheet" type="text/css" href="node_modules/@webex/widgets/dist/css/webex-widgets.css" />
</head>
```

For this to work, make sure that your `node_modules` folder is served.
Alternately, you may copy the CSS file to your public folder and update the link
reference accordingly.

### Widgets

Please make sure to install the [Webex Widget](https://www.npmjs.com/package/@webex/widgets) package and related dependencies.

```bash
npx install-peerdeps @webex/widgets
```

To use a Webex Widget, simply import the desired widget and render it into your React application.

```js
import {WebexMeetingsWidget} from '@webex/widgets';

import '@webex/widgets/dist/css/webex-widgets.css';

export default function App() {
  return (
    <WebexMeetingsWidget
      style={{width: "1000px", height: "500px"}} // Substitute with any arbitrary size or use `className`
      accessToken="<ACCESS_TOKEN>"
      meetingDestination="<MEETING_DESTINATION>"
    />
  );
}
```

Available widgets from this package are:

- [Webex Meetings widget](https://github.com/webex/widgets/tree/master/src/widgets/WebexMeetings#webex-meetings-widget)

## Contributing

We'd love for you to contribute to our source code and to make the Webex Widgets even better than they are today!
Here are some [guidelines](https://github.com/webex/widgets/blob/master/CONTRIBUTING.md) that we'd like you to follow.

### Issues

Please open an [issue](https://github.com/webex/widgets/issues) and we will get to it in an orderly manner.
Please leave as much as information as possible for a better understanding.

### Contributing Code

We are using [Airbnb-style lint rules](https://github.com/airbnb/javascript) and
[prettier](https://github.com/prettier/prettier) to lint the code.
Make sure your code your code follows our lint rules before submitting!

For more information on contributions, please visit
[our contributing guide](https://github.com/webex/widgets/blob/master/CONTRIBUTING.md).

#### Commit linter

We are using [commitlint](https://github.com/conventional-changelog/commitlint) to lint the commit messages.
Please make sure to choose the appropriate commit
[type](https://github.com/webex/widgets/blob/master/CONTRIBUTING.md#type),
[scope](https://github.com/webex/widgets/blob/master/CONTRIBUTING.md#scope) and
[subject](https://github.com/webex/widgets/blob/master/CONTRIBUTING.md#scope).

## License

[MIT License](https://opensource.org/licenses/MIT)

## Support

For more developer resources, tutorials and support, visit the Webex developer portal, https://developer.webex.com.
