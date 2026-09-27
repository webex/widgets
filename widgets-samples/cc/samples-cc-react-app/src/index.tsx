import React from 'react';
import {createRoot} from 'react-dom/client';
import './App.scss';

type AISummarySampleFontManifest = {
  readonly schemaVersion: 1;
  readonly closed: true;
  readonly hostSelector: '#root';
  readonly evidenceSelector: '[data-testid="consult-transfer:summary"], [data-testid="wrap-up-summary"]';
  readonly cssVariable: '--mds-font-family-primary';
  readonly fonts: readonly [
    {
      readonly id: 'momentum-ui-core-inter-variable';
      readonly family: 'Inter';
      readonly sourcePackagePath: 'node_modules/@momentum-ui/core/fonts/Inter.var.woff2';
      readonly emittedUrlPath: '/fonts/Inter.var.woff2';
      readonly sha256: '85f08b5f51e36ca7e961a033c6bb61d7f0e44aa0984646383ecac648e98fdcc8';
      readonly format: 'woff2';
      readonly style: 'normal';
      readonly weight: '100 900';
      readonly stretch: 'normal';
      readonly display: 'block';
      readonly sampleGlyphs: 'AI Summary Wrap-Up Billing helpful copied unavailable 0123456789 $29.99';
      readonly requiredFaces: readonly [
        {readonly style: 'normal'; readonly weight: '400'; readonly sizePx: 16},
        {readonly style: 'normal'; readonly weight: '500'; readonly sizePx: 16},
        {readonly style: 'normal'; readonly weight: '600'; readonly sizePx: 16},
        {readonly style: 'normal'; readonly weight: '700'; readonly sizePx: 16},
      ];
    },
  ];
};

declare global {
  interface Window {
    __WEBEX_CC_AI_SUMMARY_FONT_MANIFEST__?: AISummarySampleFontManifest;
    __WEBEX_CC_AI_SUMMARY_FONT_READY__?: Promise<void>;
  }
}

const AI_SUMMARY_FONT_STACK = "Inter, CiscoSans, 'Helvetica Neue', Arial, sans-serif";
const AI_SUMMARY_INTER_FONT_MANIFEST = {
  schemaVersion: 1,
  closed: true,
  hostSelector: '#root',
  evidenceSelector: '[data-testid="consult-transfer:summary"], [data-testid="wrap-up-summary"]',
  cssVariable: '--mds-font-family-primary',
  fonts: [
    {
      id: 'momentum-ui-core-inter-variable',
      family: 'Inter',
      sourcePackagePath: 'node_modules/@momentum-ui/core/fonts/Inter.var.woff2',
      emittedUrlPath: '/fonts/Inter.var.woff2',
      sha256: '85f08b5f51e36ca7e961a033c6bb61d7f0e44aa0984646383ecac648e98fdcc8',
      format: 'woff2',
      style: 'normal',
      weight: '100 900',
      stretch: 'normal',
      display: 'block',
      sampleGlyphs: 'AI Summary Wrap-Up Billing helpful copied unavailable 0123456789 $29.99',
      requiredFaces: [
        {style: 'normal', weight: '400', sizePx: 16},
        {style: 'normal', weight: '500', sizePx: 16},
        {style: 'normal', weight: '600', sizePx: 16},
        {style: 'normal', weight: '700', sizePx: 16},
      ],
    },
  ],
} as const satisfies AISummarySampleFontManifest;

const registerAISummaryInterFont = () => {
  window.__WEBEX_CC_AI_SUMMARY_FONT_MANIFEST__ = AI_SUMMARY_INTER_FONT_MANIFEST;
  document.documentElement.style.setProperty(AI_SUMMARY_INTER_FONT_MANIFEST.cssVariable, AI_SUMMARY_FONT_STACK);

  const [interFont] = AI_SUMMARY_INTER_FONT_MANIFEST.fonts;
  if (!interFont || !('fonts' in document) || typeof FontFace === 'undefined') {
    return;
  }

  const fontUrl = new URL(interFont.emittedUrlPath, window.location.href).href;
  const ready = new FontFace(interFont.family, `url("${fontUrl}") format("${interFont.format}")`, {
    display: interFont.display,
    stretch: interFont.stretch,
    style: interFont.style,
    weight: interFont.weight,
  })
    .load()
    .then((loadedFace) => {
      (document.fonts as FontFaceSet & {add: (font: FontFace) => void}).add(loadedFace);
    });

  ready.catch(() => undefined);
  window.__WEBEX_CC_AI_SUMMARY_FONT_READY__ = ready;
};

// Initialize AGENTX_SERVICE before any imports that might need it
window['AGENTX_SERVICE'] = {}; // Required by engage widgets

import App from './App';
import AISummaryVisualFixture from './AISummaryVisualFixture';

const rootElement = document.getElementById('root');
if (rootElement) {
  rootElement.style.height = '100%';
  rootElement.style.fontFamily = AI_SUMMARY_FONT_STACK;
  rootElement.style.setProperty(AI_SUMMARY_INTER_FONT_MANIFEST.cssVariable, AI_SUMMARY_FONT_STACK);
  rootElement.dataset.aiSummaryFontFamily = 'Inter';
  registerAISummaryInterFont();
  const root = createRoot(rootElement);
  const visualState = new URLSearchParams(window.location.search).get('ai-summary-visual');
  root.render(visualState ? <AISummaryVisualFixture stateId={visualState} /> : <App />);
}
