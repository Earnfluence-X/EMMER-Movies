export interface Point {
  x: number;
  y: number;
}

export interface GestureEvent {
  type: "swipe" | "pinch" | "tap" | "doubleTap" | "longPress";
  direction?: "left" | "right" | "up" | "down";
  velocity?: number;
  distance?: number;
  points: Point[];
  target: EventTarget | null;
  timestamp: number;
}

export class GestureDetector {
  private startPoint: Point | null = null;
  private startTime: number = 0;
  private lastTap: { point: Point; time: number } | null = null;
  private longPressTimer: ReturnType<typeof setTimeout> | null = null;
  private isGesturing = false;

  constructor(
    private element: HTMLElement,
    private handlers: {
      onSwipe?: (event: GestureEvent) => void;
      onPinch?: (event: GestureEvent) => void;
      onTap?: (event: GestureEvent) => void;
      onDoubleTap?: (event: GestureEvent) => void;
      onLongPress?: (event: GestureEvent) => void;
      onPan?: (event: GestureEvent) => void;
    },
    private config: {
      swipeThreshold?: number;
      pinchThreshold?: number;
      doubleTapDelay?: number;
      longPressDelay?: number;
      maxSwipeAngle?: number;
    } = {}
  ) {
    this.setupListeners();
  }

  private setupListeners() {
    this.element.addEventListener("touchstart", this.handleTouchStart.bind(this), { passive: true });
    this.element.addEventListener("touchmove", this.handleTouchMove.bind(this), { passive: true });
    this.element.addEventListener("touchend", this.handleTouchEnd.bind(this), { passive: true });
    this.element.addEventListener("touchcancel", this.handleTouchCancel.bind(this), { passive: true });
    
    // Mouse events for desktop
    this.element.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.element.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.element.addEventListener("mousemove", this.handleMouseMove.bind(this));
  }

  private getPoint(event: TouchEvent | MouseEvent): Point {
    if ("touches" in event) {
      const touch = event.touches[0] || event.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: event.clientX, y: event.clientY };
  }

  private getPoints(event: TouchEvent): Point[] {
    return Array.from(event.touches).map(touch => ({
      x: touch.clientX,
      y: touch.clientY,
    }));
  }

  private getDistance(p1: Point, p2: Point): number {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  private getAngle(p1: Point, p2: Point): number {
    return Math.atan2(p2.y - p1.y, p2.x - p1.x);
  }

  private getVelocity(distance: number, time: number): number {
    return distance / time;
  }

  private getSwipeDirection(p1: Point, p2: Point): "left" | "right" | "up" | "down" {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = this.getAngle(p1, p2);
    const maxAngle = this.config.maxSwipeAngle || 45;
    
    if (Math.abs(angle) < maxAngle * Math.PI / 180) {
      return "right";
    } else if (Math.abs(angle - Math.PI) < maxAngle * Math.PI / 180) {
      return "left";
    } else if (Math.abs(angle - Math.PI / 2) < maxAngle * Math.PI / 180) {
      return "down";
    } else if (Math.abs(angle + Math.PI / 2) < maxAngle * Math.PI / 180) {
      return "up";
    }
    
    // Default to the dominant axis
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
  }

  private handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 0) return;
    
    const point = this.getPoint(event);
    this.startPoint = point;
    this.startTime = Date.now();
    this.isGesturing = true;
    
    // Clear any existing long press timer
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
    
    // Start long press timer
    if (this.handlers.onLongPress) {
      const delay = this.config.longPressDelay || 600;
      this.longPressTimer = setTimeout(() => {
        if (this.isGesturing && this.startPoint) {
          this.handlers.onLongPress?.({
            type: "longPress",
            points: [this.startPoint],
            target: event.target,
            timestamp: Date.now(),
          });
        }
      }, delay);
    }
  }

  private handleTouchMove(event: TouchEvent) {
    if (!this.startPoint || !this.isGesturing) return;
    
    // Clear long press timer on move
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    if (event.touches.length === 1) {
      // Single touch - check for pan/swipe
      const currentPoint = this.getPoint(event);
      const distance = this.getDistance(this.startPoint, currentPoint);
      const threshold = this.config.swipeThreshold || 50;
      
      if (distance > threshold) {
        const time = Date.now() - this.startTime;
        const velocity = this.getVelocity(distance, time);
        const direction = this.getSwipeDirection(this.startPoint, currentPoint);
        
        this.handlers.onSwipe?.({
          type: "swipe",
          direction,
          velocity,
          distance,
          points: [this.startPoint, currentPoint],
          target: event.target,
          timestamp: Date.now(),
        });
        
        // Reset start point for continuous swiping
        this.startPoint = currentPoint;
        this.startTime = Date.now();
      }
    } else if (event.touches.length === 2) {
      // Multi-touch - check for pinch
      const points = this.getPoints(event);
      const distance = this.getDistance(points[0], points[1]);
      const startDistance = this.startPoint ? 
        this.getDistance(this.startPoint, points[0]) : 0;
      
      const threshold = this.config.pinchThreshold || 20;
      const delta = distance - startDistance;
      
      if (Math.abs(delta) > threshold) {
        this.handlers.onPinch?.({
          type: "pinch",
          direction: delta > 0 ? "out" : "in",
          distance: Math.abs(delta),
          points,
          target: event.target,
          timestamp: Date.now(),
        });
      }
    }
  }

  private handleTouchEnd(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    if (this.startPoint && this.isGesturing) {
      const currentPoint = this.getPoint(event);
      const distance = this.getDistance(this.startPoint, currentPoint);
      const time = Date.now() - this.startTime;
      
      // Check for tap
      if (distance < 20 && time < 300) {
        // Check for double tap
        if (this.lastTap && (time - this.lastTap.time) < (this.config.doubleTapDelay || 300)) {
          this.handlers.onDoubleTap?.({
            type: "doubleTap",
            points: [currentPoint],
            target: event.target,
            timestamp: Date.now(),
          });
          this.lastTap = null;
        } else {
          this.handlers.onTap?.({
            type: "tap",
            points: [currentPoint],
            target: event.target,
            timestamp: Date.now(),
          });
          this.lastTap = { point: currentPoint, time: Date.now() };
        }
      }
    }
    
    this.startPoint = null;
    this.isGesturing = false;
  }

  private handleTouchCancel(event: TouchEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    this.startPoint = null;
    this.isGesturing = false;
  }

  private handleMouseDown(event: MouseEvent) {
    // Only handle if not a touch device
    if ('ontouchstart' in window) return;
    
    this.startPoint = this.getPoint(event);
    this.startTime = Date.now();
    this.isGesturing = true;
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
    }
    
    if (this.handlers.onLongPress) {
      const delay = this.config.longPressDelay || 600;
      this.longPressTimer = setTimeout(() => {
        if (this.isGesturing && this.startPoint) {
          this.handlers.onLongPress?.({
            type: "longPress",
            points: [this.startPoint],
            target: event.target,
            timestamp: Date.now(),
          });
        }
      }, delay);
    }
  }

  private handleMouseMove(event: MouseEvent) {
    if (!this.startPoint || !this.isGesturing) return;
    
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    const currentPoint = this.getPoint(event);
    const distance = this.getDistance(this.startPoint, currentPoint);
    const threshold = this.config.swipeThreshold || 50;
    
    if (distance > threshold) {
      const direction = this.getSwipeDirection(this.startPoint, currentPoint);
      const time = Date.now() - this.startTime;
      const velocity = this.getVelocity(distance, time);
      
      this.handlers.onSwipe?.({
        type: "swipe",
        direction,
        velocity,
        distance,
        points: [this.startPoint, currentPoint],
        target: event.target,
        timestamp: Date.now(),
      });
      
      this.startPoint = currentPoint;
      this.startTime = Date.now();
    }
  }

  private handleMouseUp(event: MouseEvent) {
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    if (this.startPoint && this.isGesturing) {
      const currentPoint = this.getPoint(event);
      const distance = this.getDistance(this.startPoint, currentPoint);
      const time = Date.now() - this.startTime;
      
      if (distance < 20 && time < 300) {
        if (this.lastTap && (time - this.lastTap.time) < (this.config.doubleTapDelay || 300)) {
          this.handlers.onDoubleTap?.({
            type: "doubleTap",
            points: [currentPoint],
            target: event.target,
            timestamp: Date.now(),
          });
          this.lastTap = null;
        } else {
          this.handlers.onTap?.({
            type: "tap",
            points: [currentPoint],
            target: event.target,
            timestamp: Date.now(),
          });
          this.lastTap = { point: currentPoint, time: Date.now() };
        }
      }
    }
    
    this.startPoint = null;
    this.isGesturing = false;
  }

  destroy() {
    this.element.removeEventListener("touchstart", this.handleTouchStart.bind(this));
    this.element.removeEventListener("touchmove", this.handleTouchMove.bind(this));
    this.element.removeEventListener("touchend", this.handleTouchEnd.bind(this));
    this.element.removeEventListener("touchcancel", this.handleTouchCancel.bind(this));
    this.element.removeEventListener("mousedown", this.handleMouseDown.bind(this));
    this.element.removeEventListener("mouseup", this.handleMouseUp.bind(this));
    this.element.removeEventListener("mousemove", this.handleMouseMove.bind(this));
  }
}

// Utility to detect touch device
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Utility to detect gesture support
export function hasGestureSupport(): boolean {
  return isTouchDevice() || 'PointerEvent' in window;
}