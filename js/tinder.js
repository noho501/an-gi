/**
 * tinder.js
 * Swipe card mechanics for Ăn Gì?
 * Handles pointer/touch drag, rotation, snap, and callbacks.
 */

const SWIPE_THRESHOLD = 100;   // px – minimum drag to trigger a decision
const ROTATION_FACTOR = 0.08;  // degrees per px of horizontal drag
const MAX_ROTATION   = 18;     // max tilt degrees
const SNAP_DURATION  = 350;    // ms – out-of-screen flight duration
const RESET_DURATION = 200;    // ms – return-to-centre duration

/**
 * Attach Tinder-style swipe behaviour to a card element.
 *
 * @param {HTMLElement} card     - The card DOM node
 * @param {Object}      options
 * @param {Function}    options.onLike   - Called when swiped right / heart tapped
 * @param {Function}    options.onSkip   - Called when swiped left  / X tapped
 * @param {Function}    options.onDetail - Called when detail button tapped
 */
export function attachSwipe(card, { onLike, onSkip, onDetail }) {
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let isDragging = false;
  let hasMoved = false;

  // ── Pointer events (works for both mouse and touch) ────────────────────────
  card.addEventListener('pointerdown', onDown, { passive: true });

  function onDown(e) {
    if (e.target.closest('.card-actions')) return; // let buttons work normally
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    currentX = 0;
    card.style.transition = 'none';
    card.setPointerCapture(e.pointerId);
  }

  card.addEventListener('pointermove', onMove, { passive: true });

  function onMove(e) {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Require meaningful horizontal movement before activating drag-mode
    if (!hasMoved && Math.abs(dx) < 5) return;
    hasMoved = true;
    currentX = dx;

    const rotate = clamp(dx * ROTATION_FACTOR, -MAX_ROTATION, MAX_ROTATION);
    const liftY  = -Math.abs(dx) * 0.05;

    card.style.transform = `translate(${dx}px, ${dy * 0.3 + liftY}px) rotate(${rotate}deg)`;

    // Show directional hint overlays
    const likeEl  = card.querySelector('.hint-like');
    const skipEl  = card.querySelector('.hint-skip');
    const opacity = Math.min(Math.abs(dx) / SWIPE_THRESHOLD, 1);

    if (likeEl)  likeEl.style.opacity  = dx > 0 ? opacity : 0;
    if (skipEl)  skipEl.style.opacity  = dx < 0 ? opacity : 0;
  }

  card.addEventListener('pointerup', onUp, { passive: true });
  card.addEventListener('pointercancel', onCancel, { passive: true });

  function onUp() {
    if (!isDragging) return;
    isDragging = false;

    if (!hasMoved) return; // tap — let click handlers fire

    if (currentX > SWIPE_THRESHOLD) {
      flyOut('right', onLike);
    } else if (currentX < -SWIPE_THRESHOLD) {
      flyOut('left', onSkip);
    } else {
      snapBack();
    }
  }

  function onCancel() {
    isDragging = false;
    snapBack();
  }

  // ── Fly-out animation ──────────────────────────────────────────────────────
  function flyOut(direction, callback) {
    const xTarget = direction === 'right' ? window.innerWidth * 1.5 : -window.innerWidth * 1.5;
    const rotate  = direction === 'right' ? MAX_ROTATION : -MAX_ROTATION;

    card.style.transition = `transform ${SNAP_DURATION}ms cubic-bezier(0.25, 1, 0.5, 1)`;
    card.style.transform  = `translate(${xTarget}px, -60px) rotate(${rotate}deg)`;

    // Show full opacity hint
    const hint = direction === 'right'
      ? card.querySelector('.hint-like')
      : card.querySelector('.hint-skip');
    if (hint) hint.style.opacity = 1;

    setTimeout(() => callback && callback(), SNAP_DURATION);
  }

  // ── Snap back to centre ────────────────────────────────────────────────────
  function snapBack() {
    card.style.transition = `transform ${RESET_DURATION}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
    card.style.transform  = 'translate(0, 0) rotate(0deg)';

    const likeEl = card.querySelector('.hint-like');
    const skipEl = card.querySelector('.hint-skip');
    if (likeEl) likeEl.style.opacity = 0;
    if (skipEl) skipEl.style.opacity = 0;
  }

  // ── Programmatic triggers (button clicks) ─────────────────────────────────
  card._flyOut = flyOut;
}

/**
 * Programmatically trigger a swipe-right (like) on a card.
 * @param {HTMLElement} card
 * @param {Function}    callback
 */
export function triggerLike(card, callback) {
  card._flyOut && card._flyOut('right', callback);
}

/**
 * Programmatically trigger a swipe-left (skip) on a card.
 * @param {HTMLElement} card
 * @param {Function}    callback
 */
export function triggerSkip(card, callback) {
  card._flyOut && card._flyOut('left', callback);
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
