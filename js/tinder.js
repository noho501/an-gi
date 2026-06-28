const SWIPE_DISTANCE = 110;
const SWIPE_VELOCITY = 0.55;
const MAX_ROTATION = 18;
const RELEASE_DURATION = 280;
const RETURN_DURATION = 220;
const DRAG_SCALE = 1.02;

export function createSwipeController(card, { onLike, onSkip, onDetail }) {
  let pointerId = null;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;
  let isDragging = false;
  let moved = false;
  let locked = false;
  let suppressClick = false;
  let rafId = 0;
  let completeTimer = 0;
  let velocitySamples = [];

  const onPointerDown = (event) => {
    if (locked || event.button > 0 || event.target.closest('.card-actions')) return;

    window.clearTimeout(completeTimer);
    releasePointer();

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    currentX = 0;
    currentY = 0;
    moved = false;
    isDragging = true;
    velocitySamples = [{ x: event.clientX, time: event.timeStamp }];

    card.classList.add('is-dragging');
    card.classList.remove('is-returning');
    card.style.transition = 'none';
    card.setPointerCapture(pointerId);
  };

  const onPointerMove = (event) => {
    if (!isDragging || event.pointerId !== pointerId || locked) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;

    moved = true;
    currentX = dx;
    currentY = dy * 0.18;
    suppressClick = true;

    velocitySamples.push({ x: event.clientX, time: event.timeStamp });
    velocitySamples = velocitySamples.slice(-5);

    updateCard();
  };

  const onPointerUp = (event) => {
    if (event.pointerId !== pointerId) return;
    finishGesture(true);
  };

  const onPointerCancel = (event) => {
    if (event.pointerId !== pointerId) return;
    finishGesture(false);
  };

  const onLostPointerCapture = () => {
    if (!locked) {
      finishGesture(false, true);
    }
  };

  const onCardClick = (event) => {
    if (event.target.closest('.card-actions')) return;

    if (suppressClick) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick = false;
      return;
    }

    if (!locked) onDetail?.();
  };

  card.addEventListener('pointerdown', onPointerDown);
  card.addEventListener('pointermove', onPointerMove, { passive: true });
  card.addEventListener('pointerup', onPointerUp);
  card.addEventListener('pointercancel', onPointerCancel);
  card.addEventListener('lostpointercapture', onLostPointerCapture);
  card.addEventListener('click', onCardClick);

  return {
    destroy() {
      window.clearTimeout(completeTimer);
      window.cancelAnimationFrame(rafId);
      releasePointer();
      card.removeEventListener('pointerdown', onPointerDown);
      card.removeEventListener('pointermove', onPointerMove);
      card.removeEventListener('pointerup', onPointerUp);
      card.removeEventListener('pointercancel', onPointerCancel);
      card.removeEventListener('lostpointercapture', onLostPointerCapture);
      card.removeEventListener('click', onCardClick);
      resetCard();
    },
    reset,
    swipe,
  };

  function swipe(direction) {
    if (locked) return false;

    locked = true;
    suppressClick = true;
    card.classList.remove('is-returning', 'is-dragging');

    const sign = direction === 'right' ? 1 : -1;
    const targetX = window.innerWidth * 1.25 * sign;
    const targetY = currentY - 48;
    const rotation = MAX_ROTATION * sign;

    showHints(sign);
    card.style.transition = `transform ${RELEASE_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${RELEASE_DURATION}ms ease`;
    setTransform(targetX, targetY, rotation, 1);
    card.style.opacity = '0';

    window.clearTimeout(completeTimer);
    completeTimer = window.setTimeout(() => {
      locked = false;
      if (direction === 'right') {
        onLike?.();
      } else {
        onSkip?.();
      }
    }, RELEASE_DURATION);

    return true;
  }

  function reset() {
    if (locked) return;
    card.classList.remove('is-dragging');
    card.classList.add('is-returning');
    card.style.transition = `transform ${RETURN_DURATION}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${RETURN_DURATION}ms ease`;
    currentX = 0;
    currentY = 0;
    resetHints();
    setTransform(0, 0, 0, 1);
    card.style.opacity = '1';
    window.clearTimeout(completeTimer);
    completeTimer = window.setTimeout(() => card.classList.remove('is-returning'), RETURN_DURATION);
  }

  function updateCard() {
    if (rafId) return;

    rafId = window.requestAnimationFrame(() => {
      rafId = 0;
      if (!isDragging || locked) return;

      const rotation = clamp(currentX * 0.08, -MAX_ROTATION, MAX_ROTATION);
      const opacity = clamp(1 - (Math.abs(currentX) / (window.innerWidth * 1.35)), 0.76, 1);
      showHints(currentX);
      setTransform(currentX, currentY, rotation, DRAG_SCALE);
      card.style.opacity = String(opacity);
    });
  }

  function showHints(value) {
    const likeOpacity = value > 0 ? Math.min(Math.abs(value) / SWIPE_DISTANCE, 1) : 0;
    const skipOpacity = value < 0 ? Math.min(Math.abs(value) / SWIPE_DISTANCE, 1) : 0;
    card.style.setProperty('--like-opacity', likeOpacity.toFixed(3));
    card.style.setProperty('--skip-opacity', skipOpacity.toFixed(3));
  }

  function resetHints() {
    card.style.setProperty('--like-opacity', '0');
    card.style.setProperty('--skip-opacity', '0');
  }

  function setTransform(x, y, rotation, scale = 1) {
    card.style.setProperty('--drag-x', `${x}px`);
    card.style.setProperty('--drag-y', `${y}px`);
    card.style.setProperty('--drag-rotate', `${rotation}deg`);
    card.style.setProperty('--drag-scale', String(scale));
  }

  function finishGesture(shouldRelease, fromLostCapture = false) {
    if (!isDragging && !fromLostCapture) return;

    const didMove = moved;
    const velocityX = getVelocityX();

    releasePointer();

    if (!didMove) {
      reset();
      suppressClick = false;
      return;
    }

    const shouldSwipe = shouldRelease
      && (Math.abs(currentX) > SWIPE_DISTANCE || (Math.abs(velocityX) > SWIPE_VELOCITY && Math.abs(currentX) > 24));

    if (shouldSwipe) {
      swipe(currentX > 0 ? 'right' : 'left');
      return;
    }

    reset();
  }

  function releasePointer() {
    if (pointerId !== null && card.hasPointerCapture(pointerId)) {
      card.releasePointerCapture(pointerId);
    }

    pointerId = null;
    isDragging = false;
    moved = false;
  }

  function resetCard() {
    card.classList.remove('is-dragging', 'is-returning');
    card.style.transition = '';
    card.style.opacity = '1';
    resetHints();
    setTransform(0, 0, 0, 1);
  }

  function getVelocityX() {
    if (velocitySamples.length < 2) return 0;
    const first = velocitySamples[0];
    const last = velocitySamples[velocitySamples.length - 1];
    const elapsed = Math.max(last.time - first.time, 1);
    return (last.x - first.x) / elapsed;
  }
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
