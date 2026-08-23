import { useCallback } from 'react';
import {
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  withSpring,
  withTiming,
  withDecay,
  cancelAnimation,
  clamp,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture } from 'react-native-gesture-handler';
import { MOTION } from '../constants/theme';

export const MIN_SCALE = 1.0;
export const MAX_SCALE = 8.0;

/** How far past the edge a drag may rubber-band before it springs back. */
const OVERSCROLL = 64;
/** Resistance applied while dragging beyond the clamp boundary. */
const RUBBER_BAND_FACTOR = 0.35;

export interface FloorplanViewport {
  /** viewBox width of the source SVG, in SVG user units. */
  contentWidth: number;
  /** viewBox height of the source SVG, in SVG user units. */
  contentHeight: number;
  /** Measured width of the on-screen canvas, in points. */
  containerWidth: number;
  /** Measured height of the on-screen canvas, in points. */
  containerHeight: number;
}

export interface UseFloorplanGesturesReturn {
  animatedStyle: any;
  composedGesture: any;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  /** Rounded zoom level, safe to read from the JS thread for UI labels. */
  zoomLevel: SharedValue<number>;
  resetZoom: () => void;
  zoomBy: (factor: number) => void;
  /** Centre the viewport on a point expressed in SVG user units. */
  focusOnPoint: (contentX: number, contentY: number, targetScale?: number) => void;
}

/**
 * Pinch / pan / double-tap for the floorplan canvas.
 *
 * Everything below runs on the UI thread: pinch tracks the focal point so the
 * map zooms under the user's fingers, panning carries momentum via `withDecay`,
 * and dragging past the edge rubber-bands instead of hard-stopping. Those three
 * details are what separate a map that feels native from one that feels like a
 * transformed <div>.
 */
export function useFloorplanGestures(
  viewport: FloorplanViewport
): UseFloorplanGesturesReturn {
  const { contentWidth, contentHeight, containerWidth, containerHeight } = viewport;

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // The SVG is rendered with preserveAspectRatio, so at scale 1 it is letterboxed
  // inside the canvas. Clamp against the *rendered artwork* rather than the
  // container, otherwise the user can drag the map off into empty space.
  const fitScale =
    contentWidth > 0 && contentHeight > 0 && containerWidth > 0 && containerHeight > 0
      ? Math.min(containerWidth / contentWidth, containerHeight / contentHeight)
      : 1;
  const renderedWidth = contentWidth * fitScale;
  const renderedHeight = contentHeight * fitScale;

  /** Max |translate| on each axis for a given zoom level. */
  const bounds = (currentScale: number) => {
    'worklet';
    return {
      x: Math.max(0, (renderedWidth * currentScale - containerWidth) / 2),
      y: Math.max(0, (renderedHeight * currentScale - containerHeight) / 2),
    };
  };

  /** Progressive resistance once the drag leaves the allowed range. */
  const rubberBand = (value: number, limit: number) => {
    'worklet';
    if (value > limit) return limit + (value - limit) * RUBBER_BAND_FACTOR;
    if (value < -limit) return -limit + (value + limit) * RUBBER_BAND_FACTOR;
    return value;
  };

  const settle = () => {
    'worklet';
    const b = bounds(scale.value);
    const x = clamp(translateX.value, -b.x, b.x);
    const y = clamp(translateY.value, -b.y, b.y);
    if (x !== translateX.value) translateX.value = withSpring(x, MOTION.spring);
    if (y !== translateY.value) translateY.value = withSpring(y, MOTION.spring);
    savedTranslateX.value = x;
    savedTranslateY.value = y;
  };

  const pinchGesture = Gesture.Pinch()
    .onStart(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const next = clamp(savedScale.value * event.scale, MIN_SCALE, MAX_SCALE);
      const ratio = next / scale.value;

      // Keep the point under the fingers pinned. RN transforms around the view
      // centre, so the focal point has to be expressed relative to that centre.
      const focalX = event.focalX - containerWidth / 2;
      const focalY = event.focalY - containerHeight / 2;

      translateX.value = focalX - ratio * (focalX - translateX.value);
      translateY.value = focalY - ratio * (focalY - translateY.value);
      scale.value = next;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      settle();
    });

  const panGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(2)
    .onStart(() => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      const b = bounds(scale.value);
      translateX.value = rubberBand(savedTranslateX.value + event.translationX, b.x);
      translateY.value = rubberBand(savedTranslateY.value + event.translationY, b.y);
    })
    .onEnd((event) => {
      const b = bounds(scale.value);
      // Momentum, clamped to the artwork edges with a little overscroll give.
      translateX.value = withDecay(
        {
          velocity: event.velocityX,
          clamp: [-b.x - OVERSCROLL, b.x + OVERSCROLL],
          deceleration: 0.992,
        },
        () => settle()
      );
      translateY.value = withDecay(
        {
          velocity: event.velocityY,
          clamp: [-b.y - OVERSCROLL, b.y + OVERSCROLL],
          deceleration: 0.992,
        },
        () => settle()
      );
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(260)
    .onEnd((event) => {
      cancelAnimation(translateX);
      cancelAnimation(translateY);

      if (scale.value > 1.4) {
        scale.value = withSpring(1, MOTION.spring);
        translateX.value = withSpring(0, MOTION.spring);
        translateY.value = withSpring(0, MOTION.spring);
        savedScale.value = 1;
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
        return;
      }

      const target = 3;
      const ratio = target / scale.value;
      const focalX = event.x - containerWidth / 2;
      const focalY = event.y - containerHeight / 2;

      const b = bounds(target);
      const nextX = clamp(focalX - ratio * (focalX - translateX.value), -b.x, b.x);
      const nextY = clamp(focalY - ratio * (focalY - translateY.value), -b.y, b.y);

      scale.value = withSpring(target, MOTION.spring);
      translateX.value = withSpring(nextX, MOTION.spring);
      translateY.value = withSpring(nextY, MOTION.spring);
      savedScale.value = target;
      savedTranslateX.value = nextX;
      savedTranslateY.value = nextY;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture, doubleTapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Quantised so dependent UI only reacts on meaningful zoom changes.
  const zoomLevel = useDerivedValue(() => Math.round(scale.value * 10) / 10);

  const resetZoom = useCallback(() => {
    cancelAnimation(translateX);
    cancelAnimation(translateY);
    scale.value = withSpring(1, MOTION.spring);
    translateX.value = withSpring(0, MOTION.spring);
    translateY.value = withSpring(0, MOTION.spring);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, translateX, translateY, savedScale, savedTranslateX, savedTranslateY]);

  const zoomBy = useCallback(
    (factor: number) => {
      const next = Math.min(Math.max(scale.value * factor, MIN_SCALE), MAX_SCALE);
      const ratio = next / scale.value;
      const maxX = Math.max(0, (renderedWidth * next - containerWidth) / 2);
      const maxY = Math.max(0, (renderedHeight * next - containerHeight) / 2);

      // Zoom about the centre of the viewport.
      const nextX = Math.min(Math.max(translateX.value * ratio, -maxX), maxX);
      const nextY = Math.min(Math.max(translateY.value * ratio, -maxY), maxY);

      scale.value = withSpring(next, MOTION.springSnappy);
      translateX.value = withSpring(nextX, MOTION.springSnappy);
      translateY.value = withSpring(nextY, MOTION.springSnappy);
      savedScale.value = next;
      savedTranslateX.value = nextX;
      savedTranslateY.value = nextY;
    },
    [
      scale,
      translateX,
      translateY,
      savedScale,
      savedTranslateX,
      savedTranslateY,
      renderedWidth,
      renderedHeight,
      containerWidth,
      containerHeight,
    ]
  );

  const focusOnPoint = useCallback(
    (contentX: number, contentY: number, targetScale: number = 4) => {
      if (!containerWidth || !containerHeight) return;
      const next = Math.min(Math.max(targetScale, MIN_SCALE), MAX_SCALE);

      // SVG user units -> points, measured from the centre of the artwork.
      const offsetX = (contentX - contentWidth / 2) * fitScale;
      const offsetY = (contentY - contentHeight / 2) * fitScale;

      const maxX = Math.max(0, (renderedWidth * next - containerWidth) / 2);
      const maxY = Math.max(0, (renderedHeight * next - containerHeight) / 2);

      const nextX = Math.min(Math.max(-offsetX * next, -maxX), maxX);
      const nextY = Math.min(Math.max(-offsetY * next, -maxY), maxY);

      cancelAnimation(translateX);
      cancelAnimation(translateY);
      scale.value = withTiming(next, { duration: 420 });
      translateX.value = withTiming(nextX, { duration: 420 });
      translateY.value = withTiming(nextY, { duration: 420 });
      savedScale.value = next;
      savedTranslateX.value = nextX;
      savedTranslateY.value = nextY;
    },
    [
      contentWidth,
      contentHeight,
      containerWidth,
      containerHeight,
      fitScale,
      renderedWidth,
      renderedHeight,
      scale,
      translateX,
      translateY,
      savedScale,
      savedTranslateX,
      savedTranslateY,
    ]
  );

  return {
    animatedStyle,
    composedGesture,
    scale,
    translateX,
    translateY,
    zoomLevel,
    resetZoom,
    zoomBy,
    focusOnPoint,
  };
}
