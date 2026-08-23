/**
 * Helper utilities for parsing SVG viewBox and stand nodes.
 */

export interface SvgViewBox {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

/**
 * Extracts viewBox attributes from an SVG string payload.
 */
export function parseSvgViewBox(svgString: string): SvgViewBox {
  const defaultViewBox: SvgViewBox = { minX: 0, minY: 0, width: 1000, height: 700 };
  if (!svgString) return defaultViewBox;

  const match = svgString.match(/viewBox=["']([^"']+)["']/i);
  if (!match || !match[1]) return defaultViewBox;

  const parts = match[1].trim().split(/[\s,]+/).map(Number);
  if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
    return {
      minX: parts[0],
      minY: parts[1],
      width: parts[2],
      height: parts[3],
    };
  }

  return defaultViewBox;
}
