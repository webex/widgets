// Declare custom HTML elements used by the Webex Engage components
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'md-theme': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export {};
