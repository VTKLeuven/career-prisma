import React, { memo, useEffect } from 'react';
import { G, Rect, Path, Text as SvgText } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { ExportedBooth } from '../../types/floorplan';
import { COLORS, FONTS } from '../../constants/theme';

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

/**
 * Zoom-driven level of detail. Drawing 211 company names at fit-scale produces
 * illegible mush, so labels are revealed as the user zooms in:
 *   0 — shape only, 1 — stand number, 2 — stand number + company name.
 */
export type BoothLod = 0 | 1 | 2;

export interface BoothNodeProps {
  booth: ExportedBooth;
  isSelected: boolean;
  isHighlighted?: boolean;
  highlightColor?: string;
  isFlickering?: boolean;
  lod?: BoothLod;
  onSelect: (booth: ExportedBooth) => void;
}

const areEqual = (a: BoothNodeProps, b: BoothNodeProps) =>
  a.booth === b.booth &&
  a.isSelected === b.isSelected &&
  a.isHighlighted === b.isHighlighted &&
  a.highlightColor === b.highlightColor &&
  a.isFlickering === b.isFlickering &&
  a.lod === b.lod &&
  a.onSelect === b.onSelect;

/**
 * One interactive stand on the map.
 *
 * Filter dimming and the search "ping" both animate on the UI thread, and the
 * component is memoised so panning or zooming the canvas never re-renders the
 * 200+ nodes underneath it.
 */
export const BoothNode: React.FC<BoothNodeProps> = memo(
  ({ booth, isSelected, isHighlighted = true, highlightColor, isFlickering = false, lod = 0, onSelect }) => {
    const targetOpacity = 1;
    const opacity = useSharedValue(targetOpacity);
    const pulse = useSharedValue(0);

    // Filter changes fade rather than snap
    useEffect(() => {
      opacity.value = withTiming(targetOpacity, {
        duration: 220,
        easing: Easing.out(Easing.quad),
      });
    }, [targetOpacity, opacity]);

    // The search "found it" moment: three attention pulses, then rest.
    useEffect(() => {
      if (!isFlickering) {
        cancelAnimation(pulse);
        pulse.value = withTiming(0, { duration: 160 });
        return;
      }
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 420, easing: Easing.in(Easing.quad) })
        ),
        3,
        false
      );
      return () => cancelAnimation(pulse);
    }, [isFlickering, pulse]);

    const groupProps = useAnimatedProps(() => ({ opacity: opacity.value }));

    const ringProps = useAnimatedProps(() => ({
      opacity: pulse.value * 0.9,
      strokeWidth: 1.5 + pulse.value * 3.5,
    }));

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSelect(booth);
    };

    const coords = booth.coords;
    const company = booth.company;
    const hasCompany = Boolean(company?.name);
    const isActive = isSelected || isFlickering;
    
    // Determine the base fill based on whether it is highlighted with a specific color
    const baseFill = (isHighlighted && highlightColor && hasCompany) ? highlightColor : COLORS.floorplan.boothDefaultFill;
    const baseStroke = (isHighlighted && highlightColor && hasCompany) ? highlightColor : COLORS.floorplan.boothDefaultStroke;

    // Unassigned stands read as inert grey furniture — that alone removes a lot
    // of visual noise from a 211-stand map.
    const fillColor = isActive
      ? COLORS.accent
      : hasCompany
        ? baseFill
        : COLORS.floorplan.boothEmptyFill;
    const strokeColor = isActive
      ? COLORS.accentDark
      : hasCompany
        ? baseStroke
        : COLORS.floorplan.boothEmptyStroke;

    const labelColor = isActive
      ? COLORS.primaryDark
      : hasCompany
        ? COLORS.textInverse
        : COLORS.textMuted;

    if ('x' in coords && 'width' in coords) {
      const { x, y, width, height } = coords;
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // Type scales with the stand so labels never overflow their box.
      const numberSize = Math.min(width, height) * (lod >= 2 ? 0.42 : 0.55);
      const nameSize = Math.min(width, height) * 0.3;
      const maxNameChars = Math.max(6, Math.floor(width / (nameSize * 0.58)));
      const name = company?.name ?? '';
      const shortName =
        name.length > maxNameChars ? `${name.slice(0, maxNameChars - 1)}…` : name;

      return (
        <AnimatedG animatedProps={groupProps} onPress={handlePress}>
          {/* Search ping — an expanding ring, drawn under the stand itself. */}
          {isFlickering && (
            <AnimatedRect
              x={x - 6}
              y={y - 6}
              width={width + 12}
              height={height + 12}
              rx={6}
              ry={6}
              fill="none"
              stroke={COLORS.accent}
              animatedProps={ringProps}
            />
          )}

          {isSelected && (
            <Rect
              x={x - 3}
              y={y - 3}
              width={width + 6}
              height={height + 6}
              rx={5}
              ry={5}
              fill={COLORS.accent}
              opacity={0.28}
            />
          )}

          <Rect
            x={x}
            y={y}
            width={width}
            height={height}
            rx={2.5}
            ry={2.5}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={isSelected ? 1.4 : 0.5}
          />

          {/* Always show booth number, regardless of zoom level */}
          <SvgText
            x={centerX}
            y={centerY + (lod >= 2 ? -numberSize * 0.25 : numberSize * 0.35)}
            textAnchor="middle"
            fontSize={numberSize}
            fontFamily={FONTS.bold}
            fontWeight="700"
            fill={labelColor}
          >
            {booth.booth_number}
          </SvgText>

          {lod >= 2 && shortName !== '' && (
            <SvgText
              x={centerX}
              y={centerY + nameSize * 1.5}
              textAnchor="middle"
              fontSize={nameSize}
              fontFamily={FONTS.medium}
              fontWeight="500"
              fill={labelColor}
              opacity={0.92}
            >
              {shortName}
            </SvgText>
          )}
        </AnimatedG>
      );
    }

    if ('d' in coords) {
      return (
        <AnimatedG animatedProps={groupProps} onPress={handlePress}>
          <Path
            d={coords.d}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={isSelected ? 1.4 : 0.5}
          />
          {isSelected && (
            <Path d={coords.d} fill="none" stroke={COLORS.accent} strokeWidth={3} opacity={0.5} />
          )}
        </AnimatedG>
      );
    }

    return null;
  },
  areEqual
);

BoothNode.displayName = 'BoothNode';
