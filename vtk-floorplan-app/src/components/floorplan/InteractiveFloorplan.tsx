import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, Pressable, Text, LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedReaction,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import Svg, { G, SvgXml } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { Plus, Minus, Maximize2 } from 'lucide-react-native';
import { ExportedFloorplanData, ExportedBooth } from '../../types/floorplan';
import { useFloorplanGestures } from '../../hooks/useFloorplanGestures';
import { BoothNode, BoothLod } from './BoothNode';
import { parseSvgViewBox } from '../../utils/svgParser';
import { getCategoryColor } from '../../utils/colors';
import { COLORS, SPACING, RADIUS, SHADOWS, TEXT, HIT_TARGET } from '../../constants/theme';

/** Zoom thresholds at which more label detail is revealed. */
const LOD_NUMBER_AT = 1.9;
const LOD_NAME_AT = 3.6;

export interface InteractiveFloorplanProps {
  data: ExportedFloorplanData;
  selectedBoothId?: number | null;
  selectedCategoryId?: number | null;
  searchedBoothId?: number | null;
  onSelectBooth: (booth: ExportedBooth) => void;
}

export const InteractiveFloorplan: React.FC<InteractiveFloorplanProps> = ({
  data,
  selectedBoothId = null,
  selectedCategoryId = null,
  searchedBoothId = null,
  onSelectBooth,
}) => {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [lod, setLod] = useState<BoothLod>(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const viewBox = useMemo(() => parseSvgViewBox(data.svg), [data.svg]);
  const viewBoxStr = `${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`;

  const { animatedStyle, composedGesture, scale, resetZoom, zoomBy, focusOnPoint } =
    useFloorplanGestures({
      contentWidth: viewBox.width,
      contentHeight: viewBox.height,
      containerWidth: size.width,
      containerHeight: size.height,
    });

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height }
    );
  }, []);

  // Detail level is derived on the UI thread and only crosses back to JS when a
  // threshold is actually passed, so scrubbing the pinch costs no re-renders.
  useAnimatedReaction(
    () => {
      const s = scale.value;
      const level: BoothLod = s >= LOD_NAME_AT ? 2 : s >= LOD_NUMBER_AT ? 1 : 0;
      return { level, zoomed: s > 1.05 };
    },
    (current, previous) => {
      if (!previous || current.level !== previous.level) {
        runOnJS(setLod)(current.level);
      }
      if (!previous || current.zoomed !== previous.zoomed) {
        runOnJS(setIsZoomed)(current.zoomed);
      }
    },
    []
  );

  // Fly to a stand picked from search, once the canvas has been measured.
  useEffect(() => {
    if (!searchedBoothId || !size.width) return;
    const target = data.booths.find(
      (b) => b.id === searchedBoothId || b.booth_number === searchedBoothId
    );
    if (!target || !('x' in target.coords)) return;
    const { x, y, width, height } = target.coords;
    focusOnPoint(x + width / 2, y + height / 2, 5);
  }, [searchedBoothId, data.booths, focusOnPoint, size.width]);

  const handleZoom = useCallback(
    (factor: number) => {
      Haptics.selectionAsync();
      zoomBy(factor);
    },
    [zoomBy]
  );

  const handleReset = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetZoom();
  }, [resetZoom]);

  // The background artwork is expensive to parse; keep it out of the render path.
  const baseMap = useMemo(
    () =>
      data.svg ? (
        <SvgXml xml={data.svg} width="100%" height="100%" />
      ) : null,
    [data.svg]
  );

  const booths = useMemo(
    () => {
      // Sort booths so that selected or searched booths are at the end (rendered on top)
      const sortedBooths = [...data.booths].sort((a, b) => {
        const aActive = a.id === selectedBoothId || a.booth_number === selectedBoothId || a.id === searchedBoothId || a.booth_number === searchedBoothId;
        const bActive = b.id === selectedBoothId || b.booth_number === selectedBoothId || b.id === searchedBoothId || b.booth_number === searchedBoothId;
        if (aActive && !bActive) return 1;
        if (!aActive && bActive) return -1;
        return 0;
      });

      return sortedBooths.map((booth) => {
        const isSelected =
          booth.id === selectedBoothId || booth.booth_number === selectedBoothId;
        const isSearched =
          booth.id === searchedBoothId || booth.booth_number === searchedBoothId;
        const isHighlighted = selectedCategoryId
          ? (booth.company?.category ?? []).some((c) => c.id === selectedCategoryId)
          : true;

        const highlightColor = (isHighlighted && selectedCategoryId !== null) ? getCategoryColor(selectedCategoryId) : undefined;

        return (
          <BoothNode
            key={booth.id}
            booth={booth}
            isSelected={isSelected}
            isHighlighted={isHighlighted}
            highlightColor={highlightColor}
            isFlickering={isSearched}
            lod={lod}
            onSelect={onSelectBooth}
          />
        );
      });
    },
    [data.booths, selectedBoothId, searchedBoothId, selectedCategoryId, lod, onSelectBooth]
  );

  return (
    <View style={styles.container} onLayout={onLayout}>
      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[styles.canvasWrapper, animatedStyle]}>
          {baseMap ? <View style={StyleSheet.absoluteFill}>{baseMap}</View> : null}

          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Svg viewBox={viewBoxStr} width="100%" height="100%">
              <G>{booths}</G>
            </Svg>
          </View>
        </Animated.View>
      </GestureDetector>

      {/* Zoom hint — shown only while the map is at rest, so it never nags. */}
      {!isZoomed && (
        <Animated.View
          entering={FadeIn.delay(600).duration(400)}
          exiting={FadeOut.duration(150)}
          style={styles.hint}
          pointerEvents="none"
        >
          <Text style={styles.hintText}>Pinch or double-tap to zoom in on a stand</Text>
        </Animated.View>
      )}

      {/* Map key. Three colours, three meanings — no guessing. */}
      <View style={styles.legend} pointerEvents="none">
        <LegendDot color={COLORS.floorplan.boothDefaultFill} label="Company" />
        <LegendDot color={COLORS.floorplan.boothEmptyFill} label="Free" />
        <LegendDot color={COLORS.accent} label="Selected" />
      </View>

      {/* Controls sit in the thumb zone, bottom-right, above the sheet. */}
      <View style={styles.controlsBar}>
        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}
          onPress={() => handleZoom(1.6)}
          accessibilityLabel="Zoom in"
          accessibilityRole="button"
        >
          <Plus size={20} color={COLORS.primary} strokeWidth={2.5} />
        </Pressable>

        <View style={styles.controlDivider} />

        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.controlPressed]}
          onPress={() => handleZoom(1 / 1.6)}
          accessibilityLabel="Zoom out"
          accessibilityRole="button"
        >
          <Minus size={20} color={COLORS.primary} strokeWidth={2.5} />
        </Pressable>

        {isZoomed && (
          <>
            <View style={styles.controlDivider} />
            <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}>
              <Pressable
                style={({ pressed }) => [
                  styles.controlButton,
                  styles.controlButtonAccent,
                  pressed && styles.controlPressed,
                ]}
                onPress={handleReset}
                accessibilityLabel="Fit map to screen"
                accessibilityRole="button"
              >
                <Maximize2 size={18} color={COLORS.primaryDark} strokeWidth={2.5} />
              </Pressable>
            </Animated.View>
          </>
        )}
      </View>
    </View>
  );
};

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendSwatch, { backgroundColor: color }]} />
    <Text style={styles.legendLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.floorplan.canvas,
    overflow: 'hidden',
  },
  canvasWrapper: {
    width: '100%',
    height: '100%',
  },
  hint: {
    position: 'absolute',
    top: SPACING.md,
    alignSelf: 'center',
    backgroundColor: 'rgba(15, 30, 46, 0.82)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  hintText: {
    ...TEXT.label,
    color: COLORS.textInverse,
  },
  legend: {
    position: 'absolute',
    left: SPACING.md,
    bottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    ...SHADOWS.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs + 2,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendLabel: {
    ...TEXT.label,
    fontSize: 11,
    color: COLORS.textMuted,
  },
  controlsBar: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  controlButton: {
    width: HIT_TARGET,
    height: HIT_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonAccent: {
    backgroundColor: COLORS.accentSoft,
  },
  controlPressed: {
    backgroundColor: COLORS.primarySoft,
  },
  controlDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
});
