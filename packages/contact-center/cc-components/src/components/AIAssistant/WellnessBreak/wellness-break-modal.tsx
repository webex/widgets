import React, {useEffect, useRef} from 'react';
import {createPortal} from 'react-dom';
import type {AnimationConfigWithData, AnimationItem} from 'lottie-web';
import type {WellnessBreakModalProps, WellnessBreakOverlayTarget} from '../ai-assistant.types';

const COUNTDOWN_DIGITS = [5, 4, 3, 2, 1];

const syncAnimationPhase = (animation: AnimationItem | undefined, phase: WellnessBreakModalProps['phase']): void => {
  if (!animation) return;
  if (phase === 'playing') {
    animation.goToAndPlay(0, true);
  } else if (phase === 'ending') {
    animation.goToAndStop(Math.max(animation.totalFrames - 1, 0), true);
  } else {
    animation.goToAndStop(0, true);
  }
};

const WellnessBreakModal: React.FC<WellnessBreakModalProps> = ({
  phase,
  countdown,
  elapsedSeconds,
  animationData,
  reducedMotion,
  onMediaError,
  overlayTarget,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<HTMLDivElement>(null);
  const animationItemRef = useRef<AnimationItem>();
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const resolvedTarget: WellnessBreakOverlayTarget =
    overlayTarget === 'assistant' || (typeof overlayTarget === 'object' && overlayTarget) ? overlayTarget : 'viewport';
  const overlayScope = typeof resolvedTarget === 'string' ? resolvedTarget : 'custom';

  useEffect(() => {
    const overlay = overlayRef.current;
    const ownerDocument = overlay?.ownerDocument;
    if (!overlay || !ownerDocument) return undefined;

    const container = overlay.parentElement;
    const scrollTargets =
      overlayScope === 'viewport' ? [ownerDocument.documentElement, ownerDocument.body] : container ? [container] : [];
    const previousOverflow = scrollTargets.map((element) => element.style.overflow);
    scrollTargets.forEach((element) => {
      element.style.overflow = 'hidden';
    });

    let restoreContainerPosition: (() => void) | undefined;
    const containerPosition = container ? ownerDocument.defaultView?.getComputedStyle(container).position : undefined;
    if (overlayScope === 'custom' && container && (!containerPosition || containerPosition === 'static')) {
      const previousPosition = container.style.position;
      container.style.position = 'relative';
      restoreContainerPosition = () => {
        container.style.position = previousPosition;
      };
    }

    return () => {
      scrollTargets.forEach((element, index) => {
        element.style.overflow = previousOverflow[index];
      });
      restoreContainerPosition?.();
    };
  }, [overlayScope, resolvedTarget]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : undefined;
    dialogRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
      }
      if (event.key === 'Tab' && dialogRef.current && !dialogRef.current.querySelector('button, [href], input')) {
        event.preventDefault();
        dialogRef.current.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (reducedMotion || !animationData || !animationRef.current) return undefined;

    void import('lottie-web')
      .then(({default: lottie}) => {
        if (cancelled || !animationRef.current) return;
        const animation = lottie.loadAnimation({
          container: animationRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: false,
          animationData: animationData as AnimationConfigWithData['animationData'],
          rendererSettings: {preserveAspectRatio: 'xMidYMid slice'},
        });
        animationItemRef.current = animation;
        syncAnimationPhase(animation, phaseRef.current);
      })
      .catch(() => onMediaError());

    return () => {
      cancelled = true;
      animationItemRef.current?.destroy();
      animationItemRef.current = undefined;
    };
  }, [animationData, onMediaError, reducedMotion]);

  useEffect(() => {
    syncAnimationPhase(animationItemRef.current, phase);
  }, [phase]);

  const heading = phase === 'starting' ? 'Relax' : '';
  const message =
    phase === 'starting'
      ? 'Your 1 minute well-being break is starting in'
      : phase === 'ending'
        ? 'Transitioning back to work mode in'
        : elapsedSeconds >= 40
          ? "In a few moments, you'll return to your day."
          : 'This moment is yours.';

  const overlay = (
    <div
      ref={overlayRef}
      className={`wellness-break-overlay wellness-break-overlay--${overlayScope}`}
      data-testid="wellness-break:overlay"
    >
      <div
        ref={dialogRef}
        className={`wellness-break-modal wellness-break-modal--${phase}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wellness-break-title"
        aria-describedby="wellness-break-message"
        tabIndex={-1}
        data-testid="wellness-break:surface"
      >
        <div
          ref={animationRef}
          className={`wellness-break-modal__animation${reducedMotion ? ' wellness-break-modal__animation--static' : ''}`}
          aria-hidden="true"
          data-testid="wellness-break:animation"
        />
        <div className="wellness-break-modal__content">
          {heading ? (
            <h2 id="wellness-break-title" className="wellness-break-modal__title">
              {heading}
            </h2>
          ) : (
            <h2 id="wellness-break-title" className="sr-only">
              Well-being break
            </h2>
          )}
          {countdown ? (
            <div className="wellness-break-modal__countdown-row">
              <p id="wellness-break-message" className="wellness-break-modal__countdown-message">
                {message}
              </p>
              <output
                className="wellness-break-modal__countdown"
                aria-live="polite"
                aria-label={`${countdown} seconds`}
                data-testid="wellness-break:countdown"
              >
                {COUNTDOWN_DIGITS.map((digit) => (
                  <span
                    key={digit}
                    className={`wellness-break-modal__countdown-digit${
                      digit === countdown ? ' wellness-break-modal__countdown-digit--active' : ''
                    }`}
                    aria-hidden="true"
                  >
                    {digit}
                  </span>
                ))}
              </output>
            </div>
          ) : (
            <p id="wellness-break-message" className="wellness-break-modal__playing-message" aria-live="polite">
              {message}
            </p>
          )}
        </div>
        {phase === 'playing' ? (
          <div
            className="wellness-break-modal__progress"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={60}
            aria-valuenow={Math.min(elapsedSeconds, 60)}
            aria-label="Well-being break progress"
          >
            <span style={{width: `${Math.min((elapsedSeconds / 60) * 100, 100)}%`}} />
          </div>
        ) : null}
      </div>
    </div>
  );

  return overlayScope === 'custom' ? createPortal(overlay, resolvedTarget as HTMLElement) : overlay;
};

export default WellnessBreakModal;
