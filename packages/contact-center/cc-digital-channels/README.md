# Minimal Webex Engage App

This is a minimal implementation that demonstrates how to consume the `@webex-engage/wxengage-conversations` package from Cisco's private registry.

## Setup

1. The `.npmrc` file contains the authentication token for Cisco's private registry.
2. The main implementation is in `src/App.js`.

## Running the Application

```
yarn start
```

## Implementation Details

This minimal implementation:

1. Configures the Cisco private registry in `.npmrc`
2. Imports the `@webex-engage/wxengage-conversations` package
3. Creates a simple React component that renders the Engage component with the required props:
   - `conversationId`
   - `jwtToken`
   - `apiEndpoint`
   - `signalREndpoint`

## Project Structure

- `src/App.js` - Main component using the Webex Engage package
- `src/App.css` - Minimal styling
- `src/index.js` - Entry point
- `public/index.html` - HTML template
- `.npmrc` - Registry configuration
