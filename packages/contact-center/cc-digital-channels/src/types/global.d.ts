declare global {
  namespace JSX {
    interface IntrinsicElements {
      'md-theme': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        theme?: string;
        class?: string;
        darktheme?: boolean;
        lighttheme?: boolean;
      };
    }
  }
}

export {};
