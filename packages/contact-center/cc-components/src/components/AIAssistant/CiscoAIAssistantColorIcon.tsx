import React from 'react';

interface CiscoAIAssistantColorIconProps {
  /** Square size in px. Defaults to 20. */
  size?: number;
  className?: string;
}

/**
 * Inlined colored "Cisco AI Assistant" mark.  Unique gradient IDs so
 * multiple instances on the page don't collide.
 */
const CiscoAIAssistantColorIcon: React.FC<CiscoAIAssistantColorIconProps> = ({size = 20, className}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
    className={className}
  >
    <path
      d="M11.9844 9.0625C14.1849 9.0625 15.9688 7.27864 15.9688 5.07813C15.9688 2.87761 14.1849 1.09375 11.9844 1.09375C9.78386 1.09375 8 2.87762 8 5.07813C8 7.27863 9.78386 9.0625 11.9844 9.0625Z"
      fill="url(#ai-icon-paint0)"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M8 3.97455C5.77504 3.97455 3.97135 5.77772 3.97135 8.00204C3.97135 10.2264 5.77504 12.0295 8 12.0295C10.225 12.0295 12.0286 10.2264 12.0286 8.00204C12.0286 5.77772 10.225 3.97455 8 3.97455ZM1.09375 8.00204C1.09375 4.18892 4.18578 1.09778 8 1.09778C11.8142 1.09778 14.9062 4.18892 14.9062 8.00204C14.9062 11.8152 11.8142 14.9063 8 14.9063C4.18578 14.9063 1.09375 11.8152 1.09375 8.00204Z"
      fill="url(#ai-icon-paint1)"
    />
    <path
      d="M10.2705 1.4762C12.9068 2.39335 14.8131 4.86284 14.8994 7.79065C14.1722 8.56982 13.1372 9.05823 11.9873 9.05823C11.9537 9.05823 11.9202 9.05613 11.8867 9.0553C11.9782 8.71819 12.0293 8.36377 12.0293 7.99768C12.0292 5.826 10.3098 4.05568 8.1582 3.97327C8.47447 2.87097 9.25224 1.96305 10.2705 1.4762Z"
      fill="url(#ai-icon-paint2)"
    />
    <path
      d="M11.9823 9.0625C14.1828 9.0625 15.9667 7.27864 15.9667 5.07813C15.9667 2.87761 14.1828 1.09375 11.9823 1.09375C9.78179 1.09375 7.99792 2.87762 7.99792 5.07813C7.99792 7.27863 9.78179 9.0625 11.9823 9.0625Z"
      fill="url(#ai-icon-paint3)"
    />
    <defs>
      <linearGradient
        id="ai-icon-paint0"
        x1="8.15802"
        y1="1.09375"
        x2="14.6826"
        y2="7.61831"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#0087EA" />
        <stop offset="1" stopColor="#63FFF7" />
      </linearGradient>
      <linearGradient
        id="ai-icon-paint1"
        x1="14.9062"
        y1="1.09778"
        x2="1.09772"
        y2="14.9103"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#0051AF" />
        <stop offset="0.666238" stopColor="#0087EA" />
        <stop offset="1" stopColor="#00BCEB" />
      </linearGradient>
      <linearGradient
        id="ai-icon-paint2"
        x1="10.6267"
        y1="3.74467"
        x2="14.3207"
        y2="8.01453"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#74BF4B" stopOpacity="0" />
        <stop offset="1" stopColor="#74BF4B" />
      </linearGradient>
      <radialGradient
        id="ai-icon-paint3"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(15.9667 9.0625) rotate(-135) scale(11.2695 11.2648)"
      >
        <stop stopColor="#00BCEB" stopOpacity="0" />
        <stop offset="0.666962" stopColor="#00BCEB" stopOpacity="0" />
        <stop offset="1" stopColor="#00BCEB" />
      </radialGradient>
    </defs>
  </svg>
);

export default CiscoAIAssistantColorIcon;
