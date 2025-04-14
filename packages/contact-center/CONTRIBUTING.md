## Contributing

The [Widgets](https://github.com/webex/widgets) repo is a monorepo and we can utilise all the yarn workspaces commands. We have all our contact center widgets in a folder called "contact-center".

### 1. How to install dependencies?

- Run `yarn install`

### 2. How to build the Widgets?

- Run `yarn run build`
  Additional comments
- Each workspace has a script `build:src` which build the widget
- @webex/cc-store needs to be build before anything.
- yarn run build command build everything in the coorect order

### 3. How to run the samples?

For the first time if we are running samples, follow the followig steps

- We need to ensure all the components are built before builing samples.
- `yarn samples:build`
- `yarn samples:serve`

### 4. Hot Module Replacement (HMR)

- To enhance the developer experience when contributing to the widgets, Hot Module Replacement (HMR) is enabled in the React samples application. When the React samples app is running, any changes made within the repository will automatically update the application.

#### How to Start the React Samples Application

- `yarn install`
- `yarn run build`
- `yarn workspace samples-cc-react-app serve` → Open `http://localhost:3000/`  
  Once the application is running, any modifications made within the repository will be reflected in the samples app.

- **Additional Notes:** Changes made to `.scss` or `.css` files will be applied immediately, whereas modifications to `.js`, `.jsx`, `.ts`, or `.tsx` files will trigger a full reload. It is important to be mindful of the frequency of reloads and backend registrations, as excessive reloading and initialization may result in a **429 (Too Many Requests) error**.

**Only the React samples application supports HMR. It is recommended to use the React app for development.**

To test web components, follow steps **1, 2, and 3** outlined above.

## Consuming

The following section explains how external developers will consume our contact center widgets
This [Vidcast](https://app.vidcast.io/share/6276b573-ba47-4fd0-a171-16af936b69d3) shows how developers can use our widgets.

### 1. How to install the packages?

To install, use the following commands

- `npm i @webex/cc-widgets` (This is published, so do give this a try)
- `yarn add @webex/cc-widgets`

### 2. How to include them in app and use?

We are shipping widgets as both react and web-components

To use contact center widgets as **web-components**

- Use above step to install the package
- Create an index.js file and import the widget - `import '@webex/cc-widgets/wc'`
- Use any bundler(webpack or rollup) to create a bundle.
- Use the created bundle in the html file and start using the widgets as follow

```javascript
    <script src="dist/bundle.js"></script>
    <widget-cc-station-login></widget-cc-station-login>
```

To use contact center widgets as **react component**

- Install the package
- Create an index.js file and use the widgets as follows

  ```javascript
  import React from 'react';
  import {StationLogin, UserState} from '@webex/cc-widgets';

  function App() {
    return (
      <>
        <h1>Contact Center widgets in a react app</h1>
        <StationLogin />
        <UserState />
      </>
    );
  }

  export default App;
  ```

- Serve the app.

## How to consume momentum-icons

To use momentum icons in any application that uses cc widgets we need to ensure the following two points

1. The widgets needs to be wrapped inside the themeprovider and iconprovider from [@momentum-design/components/dist/react](https://momentum-design.github.io/momentum-design/en/components/)

```
import {ThemeProvider, IconProvider} from '@momentum-design/components/dist/react'
```

2. Version for @momentum-design/components and @momentum-design/icons should be resolved to following versions or to later versions

```
"resolutions": {
  "@momentum-design/components": "0.27.3",
  "@momentum-design/icons": "0.10.0"
},
```

## Npm package

- @webex/cc-widgets https://www.npmjs.com/package/@webex/cc-widgets

## Amplify Failures Debugging

To build the project with Amplify, the following command is executed:

```
yarn && yarn run build && yarn workspace @webex/widgets run build:src && yarn samples:build
```

If you encounter any failures during the amplify build process, you can isolate the issue by running each command individually in your local environment. This will help you identify the specific step where the error occurs and allow you to examine the error details.
