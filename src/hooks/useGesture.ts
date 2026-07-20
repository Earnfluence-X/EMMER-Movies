import { useState, useRef, useEffect, useCallback } from "react";

interface GestureConfig {
  swipeThreshold?: number;
  pinchThreshold?: number;
  doubleTapDelay?: number;
  longPressDelay?: number;
  enableHaptic?: boolean;
}

export function useGesture(
  elementRef: React.RefObject<HTMLElement>,
  handlers: {
    onSwipeLeft?: (velocity?: number) => void;
    onSwipeRight?: (velocity?: number) => void;
    onSwipeUp?: (velocity?: number) => void;
    onSwipeDown?: (velocity?: number) => void;
    onPinchIn?: () => void;
    onPinchOut?: () => void;
    onDoubleTap?: (x: number, y: number) => void;
    onLongPress?: (x: number, y: number) => void;
    onTap?: (x: number, y: number) => void;
  },
  config: GestureConfig = {}
) {
  const [touchStart, setTouchStart] = useState<{
    x: number;
    y: number;
    time: number;
    target: EventTarget | null;
  } | null>(null);
  const [lastTap, setLastTap] = useState<{ x: number; y: number; time: number } | null>(null);
  const [pinchDistance, setPinchDistance] = useState<number | null>(null);
  const [isGesturing, setIsGesturing] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();
  const hapticSupported = useRef(false);

  useEffect(() => {
    // Check haptic feedback support
    if (navigator.vibrate && config.enableHaptic !== false) {
      hapticSupported.current = true;
    }
  }, [config.enableHaptic]);

  const triggerHaptic = useCallback((pattern: number | number[]) => {
    if (hapticSupported.current) {
      navigator.vibrate(pattern);
    }
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 0) return;

      const touch = e.touches[0];
      const touchData = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        target: e.target,
      };
      setTouchStart(touchData);
      setIsGesturing(true);

      // Start long press timer
      if (config.longPressDelay !== 0) {
        longPressTimer.current = setTimeout(() => {
          if (touchStart) {
            handlers.onLongPress?.(touchData.x, touchData.y);
            triggerHaptic([10, 50, 10]);
          }
          longPressTimer.current = undefined;
        }, config.longPressDelay || 600);
      }

      // Handle multi-touch for pinch
      if (e.touches.length === 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        setPinchDistance(Math.sqrt(dx * dx + dy * dy));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      // Clear long press timer on move
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = undefined;
      }

      if (e.touches.length === 1 && touchStart) {
        const touch = e.touches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const threshold = config.swipeThreshold || 50;

        if (distance > threshold) {
          const velocity = distance / (Date.now() - touchStart.time);
          
          // Determine swipe direction
          const absDx = Math.abs(dx);
          const absDy = Math.abs(dy);
          
          if (absDx > absDy) {
            if (dx > 0) {
              handlers.onSwipeRight?.(velocity);
              triggerHaptic([5]);
            } else {
              handlers.onSwipeLeft?.(velocity);
              triggerHaptic([5]);
            }
          } else {
            if (dy > 0) {
              handlers.onSwipeDown?.(velocity);
              triggerHaptic([5]);
            } else {
              handlers.onSwipeUp?.(velocity);
              triggerHaptic([5]);
            }
          }
          
          setTouchStart(null);
          setIsGesturing(false);
        }
      } else if (e.touches.length === 2 && pinchDistance !== null) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const delta = distance - pinchDistance;
        const threshold = config.pinchThreshold || 20;

        if (delta > threshold) {
          handlers.onPinchOut?.();
          setPinchDistance(distance);
          triggerHaptic([5]);
        } else if (delta < -threshold) {
          handlers.onPinchIn?.();
          setPinchDistance(distance);
          triggerHaptic([5]);
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      // Clear long press timer
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = undefined;
      }

      if (touchStart && e.changedTouches.length === 1) {
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStart.x;
        const dy = touch.clientY - touchStart.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const timeSince = Date.now() - touchStart.time;

        // Check if it's a tap (not a swipe)
        if (distance < 10 && timeSince < 300) {
          const now = Date.now();
          
          // Check for double tap
          if (lastTap && (now - lastTap.time) < (config.doubleTapDelay || 300)) {
            const avgX = (lastTap.x + touch.clientX) / 2;
            const avgY = (lastTap.y + touch.clientY) / 2;
            handlers.onDoubleTap?.(avgX, avgY);
            triggerHaptic([10, 30, 10]);
            setLastTap(null);
          } else {
            // Single tap
            handlers.onTap?.(touch.clientX, touch.clientY);
            setLastTap({
              x: touch.clientX,
              y: touch.clientY,
              time: now,
            });
          }
        }
      }

      setTouchStart(null);
      setPinchDistance(null);
      setIsGesturing(false);
    };

    // Mouse support for desktop
    const handleMouseDown = (e: MouseEvent) => {
      // Only handle if we're not on touch device
      if ('ontouchstart' in window) return;
      
      const mouseData = {
        x: e.clientX,
        y: e.clientY,
        time: Date.now(),
        target: e.target,
      };
      setTouchStart(mouseData);
    };

    const handleMouseUp = (e: MouseEvent) => {
      if ('ontouchstart' in window) return;
      if (!touchStart) return;

      const dx = e.clientX - touchStart.x;
      const dy = e.clientY - touchStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const threshold = config.swipeThreshold || 50;

      if (distance > threshold) {
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 0) handlers.onSwipeRight?.();
          else handlers.onSwipeLeft?.();
        } else {
          if (dy > 0) handlers.onSwipeDown?.();
          else handlers.onSwipeUp?.();
        }
      } else {
        handlers.onTap?.(e.clientX, e.clientY);
      }

      setTouchStart(null);
    };

    // Add event listeners
    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchmove", handleTouchMove, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: true });
    element.addEventListener("mousedown", handleMouseDown);
    element.addEventListener("mouseup", handleMouseUp);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("mousedown", handleMouseDown);
      element.removeEventListener("mouseup", handleMouseUp);
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
      }
    };
  }, [elementRef, handlers, config, touchStart, lastTap, pinchDistance]);

  return {
    isGesturing,
    isTouchDevice: 'ontouchstart' in window,
    hasHaptic: hapticSupported.current,
  };
}