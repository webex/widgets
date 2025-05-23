// Web components used in @momentum-design imports rely on browser-only APIs like attachInternals.
// Jest (via JSDOM) doesn't support these, causing runtime errors in tests.
// We mock these methods on HTMLElement to prevent test failures.
window.HTMLElement.prototype.attachInternals = function () {
  return {
    setValidity: () => {},
    checkValidity: () => true,
    reportValidity: () => true,
    setFormValue: () => {},
  };
};

// In jest.setup.js or top of your test file
window.HTMLCanvasElement.prototype.getContext = () => {
  return {
    fillRect: () => {},
    clearRect: () => {},
    getImageData: () => ({data: []}),
    putImageData: () => {},
    createImageData: () => [],
    setTransform: () => {},
    drawImage: () => {},
    save: () => {},
    fillText: () => {},
    restore: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    closePath: () => {},
    stroke: () => {},
    translate: () => {},
    scale: () => {},
    rotate: () => {},
    arc: () => {},
    fill: () => {},
    measureText: () => ({width: 0}),
    transform: () => {},
    rect: () => {},
    clip: () => {},
  };
};

jest.mock('lottie-web', () => ({
  loadAnimation: () => ({
    play: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
    fillStyle: jest.fn(),
  }),
}));
