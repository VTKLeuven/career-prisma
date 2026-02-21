// lib/utils/svg-booth-extractor.ts
"use server";

import { BoothExtraction } from "./pdf-processor";

/**
 * Extract booths from SVG file
 * Based on the Python script logic: finds rects and text elements, matches them
 */
export async function extractBoothsFromSVG(svgContent: string): Promise<BoothExtraction[]> {
  try {
    console.error("[EXTRACT] Starting booth extraction from SVG...");
    // Parse SVG using DOMParser (Node.js compatible)
    const { DOMParser } = await import("@xmldom/xmldom");
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgContent, "text/xml");
    const root = doc.documentElement;
    console.error("[EXTRACT] SVG parsed, root element:", root?.tagName);

    if (!root) {
      throw new Error("Invalid SVG: no root element");
    }

    // Get SVG dimensions
    const svgWidth = parseFloat(stripUnit(root.getAttribute("width") || ""));
    const svgHeight = parseFloat(stripUnit(root.getAttribute("height") || ""));
    let width = svgWidth;
    let height = svgHeight;

    // Fallback to viewBox if width/height not available
    if (!width || !height || isNaN(width) || isNaN(height)) {
      const viewBox = root.getAttribute("viewBox");
      if (viewBox) {
        const parts = viewBox.trim().split(/\s+/);
        if (parts.length >= 4) {
          width = parseFloat(parts[2]) || 0;
          height = parseFloat(parts[3]) || 0;
        }
      }
    }

    if (!width || !height || isNaN(width) || isNaN(height)) {
      throw new Error("Could not determine SVG dimensions");
    }

    // Build parent map
    const parentMap = new Map<Element, Element>();
    function buildParentMap(element: Element) {
      for (let i = 0; i < element.childNodes.length; i++) {
        const child = element.childNodes[i];
        if (child.nodeType === 1) { // ELEMENT_NODE
          parentMap.set(child as Element, element);
          buildParentMap(child as Element);
        }
      }
    }
    buildParentMap(root);

    // Helper: strip units from values
    function stripUnit(value: string | null): string {
      if (!value) return "0";
      return value.replace(/[a-zA-Z%]+$/, "").trim();
    }

    // Parse transform attribute - returns full matrix info for path transforms
    function parseTransform(transformStr: string | null): { 
      tx: number; 
      ty: number;
      matrix?: number[]; // Full 6-element matrix [a, b, c, d, e, f]
      rotation_deg?: number;
    } {
      let tx = 0;
      let ty = 0;
      let matrix: number[] | undefined = undefined;
      let rotation_deg: number | undefined = undefined;
      if (!transformStr) return { tx, ty };

      // rotate(angle[, cx, cy])
      const rotateMatch = transformStr.match(/rotate\s*\(\s*([^,\)]+)(?:\s*,\s*([^,\)]+))?(?:\s*,\s*([^\)]+))?\)/);
      if (rotateMatch) {
        const angle = parseFloat(rotateMatch[1]);
        if (!isNaN(angle)) rotation_deg = angle;
      }

      // matrix(a b c d e f) -> e,f are translations; a,b,c,d encode scale and rotation
      const matrixMatch = transformStr.match(/matrix\s*\(\s*([^\)]+)\)/);
      if (matrixMatch) {
        // Split by spaces or commas, handle negative numbers and -0
        const parts = matrixMatch[1].trim().split(/[\s,]+/).filter(p => p.trim() !== "");
        const nums = parts.map(p => {
          // Handle -0 specifically
          if (p === '-0' || p === '-0.0') return 0;
          const num = Number(p);
          return isNaN(num) ? null : num;
        }).filter(n => n !== null) as number[];
        
        if (nums.length >= 6) {
          matrix = nums;
          tx += nums[4];
          ty += nums[5];
          // Extract rotation from matrix: angle = atan2(b, a) in radians
          if (rotation_deg === undefined) {
            const [a, b] = nums;
            const angleRad = Math.atan2(b, a);
            if (Math.abs(angleRad) > 0.001) rotation_deg = (angleRad * 180) / Math.PI;
          }
        }
      }

      // translate(tx[,ty])
      const translateMatch = transformStr.match(/translate\s*\(\s*([^\)]+)\)/);
      if (translateMatch) {
        const nums = translateMatch[1].split(/[ ,]+/).map(Number).filter(n => !isNaN(n));
        if (nums.length >= 1) tx += nums[0];
        if (nums.length >= 2) ty += nums[1];
      }

      // When we have rotation but no matrix, build matrix from rotation + translation
      if (rotation_deg != null && !matrix) {
        const rad = (rotation_deg * Math.PI) / 180;
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        matrix = [c, s, -s, c, tx, ty];
      }

      return { tx, ty, matrix, rotation_deg };
    }

    // Apply transform matrix to a point
    function applyTransform(x: number, y: number, transform: { tx: number; ty: number; matrix?: number[] }): { x: number; y: number } {
      if (transform.matrix) {
        // matrix(a, b, c, d, e, f) transforms (x, y) to (a*x + c*y + e, b*x + d*y + f)
        const [a, b, c, d, e, f] = transform.matrix;
        return {
          x: a * x + c * y + e,
          y: b * x + d * y + f,
        };
      }
      return {
        x: x + transform.tx,
        y: y + transform.ty,
      };
    }

    // Parse path data to extract rectangle coordinates
    // Handles paths like: M x y H x2 V y2 H x Z (rectangular path)
    function parsePathRect(pathData: string): { x: number; y: number; w: number; h: number } | null {
      // Pattern: M x y H x2 V y2 H x Z or similar rectangular patterns
      // Also handle: M x y H x2 V y2 H x3 V y3 Z
      const commands = pathData.match(/[MmLlHhVvZz][^MmLlHhVvZz]*/g);
      if (!commands || commands.length < 4) return null;

      const coords: number[] = [];
      let lastX = 0;
      let lastY = 0;
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (const cmd of commands) {
        const type = cmd[0];
        const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));

        if (type === 'M' || type === 'm') {
          if (nums.length >= 2) {
            if (type === 'M') {
              lastX = nums[0];
              lastY = nums[1];
            } else {
              lastX += nums[0];
              lastY += nums[1];
            }
            minX = Math.min(minX, lastX);
            minY = Math.min(minY, lastY);
            maxX = Math.max(maxX, lastX);
            maxY = Math.max(maxY, lastY);
          }
        } else if (type === 'H' || type === 'h') {
          if (nums.length >= 1) {
            if (type === 'H') {
              lastX = nums[0];
            } else {
              lastX += nums[0];
            }
            minX = Math.min(minX, lastX);
            maxX = Math.max(maxX, lastX);
          }
        } else if (type === 'V' || type === 'v') {
          if (nums.length >= 1) {
            if (type === 'V') {
              lastY = nums[0];
            } else {
              lastY += nums[0];
            }
            minY = Math.min(minY, lastY);
            maxY = Math.max(maxY, lastY);
          }
        } else if (type === 'L' || type === 'l') {
          if (nums.length >= 2) {
            if (type === 'L') {
              lastX = nums[0];
              lastY = nums[1];
            } else {
              lastX += nums[0];
              lastY += nums[1];
            }
            minX = Math.min(minX, lastX);
            minY = Math.min(minY, lastY);
            maxX = Math.max(maxX, lastX);
            maxY = Math.max(maxY, lastY);
          }
        } else if (type === 'Z' || type === 'z') {
          // Close path - rectangle should be complete
        }
      }

      if (minX !== Infinity && minY !== Infinity && maxX !== -Infinity && maxY !== -Infinity) {
        const w = maxX - minX;
        const h = maxY - minY;
        if (w > 0 && h > 0) {
          return { x: minX, y: minY, w, h };
        }
      }

      return null;
    }

    // Accumulate transforms up the ancestor chain
    function accumulateTranslation(elem: Element): { tx: number; ty: number } {
      let tx = 0;
      let ty = 0;
      let cur: Element | null = elem;

      while (cur) {
        const transform = cur.getAttribute("transform") || "";
        const { tx: dtx, ty: dty } = parseTransform(transform);
        tx += dtx;
        ty += dty;
        cur = parentMap.get(cur) || null;
      }

      return { tx, ty };
    }

    // Get full transform (including rotation from parent groups) for an element
    function getFullTransformForElement(elem: Element): { tx: number; ty: number; matrix?: number[]; rotation_deg?: number } {
      const parts: string[] = [];
      let cur: Element | null = elem;
      while (cur) {
        const t = cur.getAttribute("transform");
        if (t) parts.push(t);
        cur = parentMap.get(cur) || null;
      }
      if (parts.length === 0) return { tx: 0, ty: 0 };
      const combined = parts.reverse().join(" ");
      return parseTransform(combined);
    }

    // Collect all rect elements
    const rects: Array<{
      elem: Element;
      x: number;
      y: number;
      w: number;
      h: number;
      cx: number;
      cy: number;
      rotation_deg?: number;
    }> = [];

    const rectElements = root.getElementsByTagName("rect");
    console.log(`Found ${rectElements.length} <rect> elements in SVG`);
    
    for (let i = 0; i < rectElements.length; i++) {
      const r = rectElements[i];
      try {
        const x = parseFloat(stripUnit(r.getAttribute("x") || "0"));
        const y = parseFloat(stripUnit(r.getAttribute("y") || "0"));
        const w = parseFloat(stripUnit(r.getAttribute("width") || "0"));
        const h = parseFloat(stripUnit(r.getAttribute("height") || "0"));

        if (w > 0 && h > 0) {
          const transform = getFullTransformForElement(r);
          const transformed = applyTransform(x, y, transform);
          const transformedEnd = applyTransform(x + w, y + h, transform);
          const bboxW = Math.abs(transformedEnd.x - transformed.x);
          const bboxH = Math.abs(transformedEnd.y - transformed.y);
          const cx = transformed.x + bboxW / 2;
          const cy = transformed.y + bboxH / 2;
          // For rotated rects: use ORIGINAL dimensions (w,h), not bbox - otherwise display is wrong
          const hasRotation = transform.rotation_deg != null && Math.abs(transform.rotation_deg) > 0.5;
          const useW = hasRotation ? w : bboxW;
          const useH = hasRotation ? h : bboxH;
          const useX = hasRotation ? cx - useW / 2 : transformed.x;
          const useY = hasRotation ? cy - useH / 2 : transformed.y;
          
          rects.push({
            elem: r,
            x: useX,
            y: useY,
            w: useW,
            h: useH,
            cx: cx,
            cy: cy,
            rotation_deg: transform.rotation_deg,
          });
        }

      } catch (e) {
        // Skip invalid rects
        continue;
      }
    }
    
    // Now collect <path> elements that represent rectangles
    const pathElements = root.getElementsByTagName("path");
    console.log(`Found ${pathElements.length} <path> elements in SVG`);
    
    for (let i = 0; i < pathElements.length; i++) {
      const p = pathElements[i];
      const pathData = p.getAttribute("d");
      if (!pathData) continue;

      try {
        const pathRect = parsePathRect(pathData);
        if (pathRect) {
          // Apply transform to the path rectangle (including parent transforms)
          const transform = getFullTransformForElement(p);
          const topLeft = applyTransform(pathRect.x, pathRect.y, transform);
          const bottomRight = applyTransform(pathRect.x + pathRect.w, pathRect.y + pathRect.h, transform);
          
          const bboxX = Math.min(topLeft.x, bottomRight.x);
          const bboxY = Math.min(topLeft.y, bottomRight.y);
          const bboxW = Math.abs(bottomRight.x - topLeft.x);
          const bboxH = Math.abs(bottomRight.y - topLeft.y);
          const cx = bboxX + bboxW / 2;
          const cy = bboxY + bboxH / 2;
          const hasRotation = transform.rotation_deg != null && Math.abs(transform.rotation_deg) > 0.5;
          const useW = hasRotation ? pathRect.w : bboxW;
          const useH = hasRotation ? pathRect.h : bboxH;
          const useX = hasRotation ? cx - useW / 2 : bboxX;
          const useY = hasRotation ? cy - useH / 2 : bboxY;

          if (bboxW > 0 && bboxH > 0) {
            rects.push({
              elem: p,
              x: useX,
              y: useY,
              w: useW,
              h: useH,
              cx,
              cy,
              rotation_deg: transform.rotation_deg,
            });
          }
        }
      } catch (e) {
        // Skip invalid paths
        continue;
      }
    }
    
    console.log(`Valid rects found: ${rects.length} (${rectElements.length} <rect> + ${rects.length - rectElements.length} <path> rectangles)`);

    // Get text position (with proper transform handling)
    function getTextXY(textElem: Element): { x: number; y: number } {
      let x: number | null = null;
      let y: number | null = null;

      // First, try to get x/y from tspan (most common in this SVG)
      const tspans = textElem.getElementsByTagName("tspan");
      if (tspans.length > 0) {
        const tspan = tspans[0]; // Use first tspan
        const tspanX = tspan.getAttribute("x");
        const tspanY = tspan.getAttribute("y");
        
        if (tspanX !== null && tspanX !== undefined) {
          try {
            // Handle multiple x values (for multi-character text) - use first
            const xValues = tspanX.trim().split(/\s+/).filter(v => v.trim() !== "");
            if (xValues.length > 0) {
              const xVal = stripUnit(xValues[0]);
              x = parseFloat(xVal);
              if (isNaN(x)) x = null;
            }
          } catch (e) {
            console.warn(`Failed to parse tspan x="${tspanX}":`, e);
          }
        }
        if (tspanY !== null && tspanY !== undefined) {
          try {
            const yVal = stripUnit(tspanY.trim());
            y = parseFloat(yVal);
            if (isNaN(y)) y = null;
          } catch (e) {
            console.warn(`Failed to parse tspan y="${tspanY}":`, e);
          }
        }
      }

      // Fallback to text element's own x/y attributes
      if (x === null) {
        const xAttr = textElem.getAttribute("x");
        if (xAttr) {
          try {
            const xVal = stripUnit(xAttr.trim().split(/\s+/)[0]);
            x = parseFloat(xVal);
            if (isNaN(x)) x = 0;
          } catch {
            x = 0;
          }
        } else {
          x = 0;
        }
      }
      if (y === null) {
        const yAttr = textElem.getAttribute("y");
        if (yAttr) {
          try {
            const yVal = stripUnit(yAttr.trim().split(/\s+/)[0]);
            y = parseFloat(yVal);
            if (isNaN(y)) y = 0;
          } catch {
            y = 0;
          }
        } else {
          y = 0;
        }
      }

      // Apply transforms: start from the text element itself, then go up the chain
      let cur: Element | null = textElem;
      while (cur) {
        const transformAttr = cur.getAttribute("transform");
        if (transformAttr) {
          const transform = parseTransform(transformAttr);
          const transformed = applyTransform(x, y, transform);
          x = transformed.x;
          y = transformed.y;
        }
        cur = parentMap.get(cur) || null;
      }

      return { x, y };
    }

    // Check if point is inside rect (handles rotated rects via inverse-rotate)
    function rectContainsPoint(
      rect: { x: number; y: number; w: number; h: number; cx: number; cy: number; rotation_deg?: number },
      px: number,
      py: number
    ): boolean {
      if (rect.rotation_deg == null || Math.abs(rect.rotation_deg) < 0.5) {
        return (
          px >= rect.x - 1e-6 &&
          px <= rect.x + rect.w + 1e-6 &&
          py >= rect.y - 1e-6 &&
          py <= rect.y + rect.h + 1e-6
        );
      }
      const rad = (-rect.rotation_deg * Math.PI) / 180;
      const c = Math.cos(rad);
      const s = Math.sin(rad);
      const dx = px - rect.cx;
      const dy = py - rect.cy;
      const localX = dx * c - dy * s;
      const localY = dx * s + dy * c;
      return (
        localX >= -rect.w / 2 - 1e-6 &&
        localX <= rect.w / 2 + 1e-6 &&
        localY >= -rect.h / 2 - 1e-6 &&
        localY <= rect.h / 2 + 1e-6
      );
    }

    // Find distance between two points
    function distance(x1: number, y1: number, x2: number, y2: number): number {
      return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    }

    // Collect all text elements and match to rects
    const booths: BoothExtraction[] = [];
    const textElements = root.getElementsByTagName("text");
    const textPositions: Array<{ label: string; x: number; y: number }> = [];
    
    console.log(`Found ${textElements.length} <text> elements in SVG`);

    for (let i = 0; i < textElements.length; i++) {
      const text = textElements[i];
      const rawText = text.textContent?.trim() || "";
      if (!rawText) continue;

      const boothLabel = rawText.replace(/\n/g, " ").trim();
      if (!boothLabel) continue;

      // Only extract numeric booth numbers (filter out labels like "entrance", "exit", etc.)
      // Check if the text is purely numeric or contains numbers
      const isNumeric = /^\d+$/.test(boothLabel);
      if (!isNumeric) {
        console.log(`Skipping non-numeric text: "${boothLabel}"`);
        continue;
      }

      // Get text position FIRST - we need this for all matching strategies
      const { x: tx, y: ty } = getTextXY(text);
      textPositions.push({ label: boothLabel, x: tx, y: ty });
      
      // Debug: log raw tspan values if available - ALWAYS log to help debug
      const tspans = text.getElementsByTagName("tspan");
      if (tspans.length > 0) {
        const tspan = tspans[0];
        const rawX = tspan.getAttribute("x");
        const rawY = tspan.getAttribute("y");
        const transform = text.getAttribute("transform");
        // Parse the raw values to see what we're working with
        let parsedX = 0, parsedY = 0;
        if (rawX) {
          const xValues = rawX.trim().split(/\s+/).filter(v => v.trim() !== "");
          if (xValues.length > 0) {
            parsedX = parseFloat(stripUnit(xValues[0]));
          }
        }
        if (rawY) {
          parsedY = parseFloat(stripUnit(rawY.trim()));
        }
        console.error(`[BOOTH ${boothLabel}] raw tspan: x="${rawX}" (parsed: ${parsedX}), y="${rawY}" (parsed: ${parsedY}), transform="${transform}", final: (${tx.toFixed(2)}, ${ty.toFixed(2)})`);
      } else {
        console.error(`[BOOTH ${boothLabel}] no tspan, text position: (${tx.toFixed(2)}, ${ty.toFixed(2)})`);
      }

      // 1) See if any rect contains this point (check all, pick closest) - PRIORITY MATCHING
      let containing: typeof rects[0] | null = null;
      let minContainDist = Infinity;
      for (const r of rects) {
        if (rectContainsPoint(r, tx, ty)) {
          const dist = distance(r.cx, r.cy, tx, ty);
          if (dist < minContainDist) {
            containing = r;
            minContainDist = dist;
          }
        }
      }

      if (containing) {
        const boothNumber = parseInt(boothLabel, 10);
        if (isNaN(boothNumber)) {
          console.log(`[SKIP] Invalid booth number: "${boothLabel}"`);
          continue;
        }
        const boothData: BoothExtraction = {
          booth_number: boothNumber,
          coords: {
            type: "rect" as const,
            x_pct: Number(((containing.x / width) * 100).toFixed(4)),
            y_pct: Number(((containing.y / height) * 100).toFixed(4)),
            width_pct: Number(((containing.w / width) * 100).toFixed(4)),
            height_pct: Number(((containing.h / height) * 100).toFixed(4)),
            x_px: containing.x,
            y_px: containing.y,
            w_px: containing.w,
            h_px: containing.h,
            match: "contains",
            ...(containing.rotation_deg != null && { rotation_deg: containing.rotation_deg }),
          },
        };
        console.log(`[MATCH] Booth ${boothNumber}: text(${tx.toFixed(1)}, ${ty.toFixed(1)}) -> rect(${containing.x.toFixed(1)}, ${containing.y.toFixed(1)}, ${containing.w.toFixed(1)}x${containing.h.toFixed(1)}${containing.rotation_deg != null ? ` rot=${containing.rotation_deg}°` : ""})`);
        booths.push(boothData);
        continue;
      }

      // 2) Fallback: nearest rect by center distance, but with better matching
      // Find all rectangles within a reasonable distance threshold
      if (rects.length > 0) {
        // Calculate distance to all rectangles and find the closest
        const rectDistances = rects.map(r => {
          const centerDist = distance(r.cx, r.cy, tx, ty);
          
          // Check if point is inside the rectangle (handles rotated rects)
          const isInside = rectContainsPoint(r, tx, ty);
          
          // Calculate minimum distance from point to rectangle (use center dist for rotated)
          const edgeDist = r.rotation_deg != null
            ? centerDist
            : Math.sqrt(
                Math.pow(Math.max(r.x - tx, 0, tx - (r.x + r.w)), 2) +
                Math.pow(Math.max(r.y - ty, 0, ty - (r.y + r.h)), 2)
              );
          
          return {
            rect: r,
            centerDist,
            edgeDist,
            isInside,
          };
        });

        // Sort by: 1) inside rectangles first, 2) then by edge distance (closer is better)
        rectDistances.sort((a, b) => {
          // Prefer rectangles where text is inside
          if (a.isInside && !b.isInside) return -1;
          if (!a.isInside && b.isInside) return 1;
          // If both inside or both outside, sort by edge distance
          return a.edgeDist - b.edgeDist;
        });

        const nearest = rectDistances[0].rect;
        const nearestDist = rectDistances[0].centerDist;
        
        const boothNumber = parseInt(boothLabel, 10);
        if (isNaN(boothNumber)) {
          console.log(`[SKIP] Invalid booth number: "${boothLabel}"`);
          continue;
        }
        const boothData: BoothExtraction = {
          booth_number: boothNumber,
          coords: {
            type: "rect" as const,
            x_pct: Number(((nearest.x / width) * 100).toFixed(4)),
            y_pct: Number(((nearest.y / height) * 100).toFixed(4)),
            width_pct: Number(((nearest.w / width) * 100).toFixed(4)),
            height_pct: Number(((nearest.h / height) * 100).toFixed(4)),
            x_px: nearest.x,
            y_px: nearest.y,
            w_px: nearest.w,
            h_px: nearest.h,
            match: "nearest",
            ...(nearest.rotation_deg != null && { rotation_deg: nearest.rotation_deg }),
          },
        };
        console.log(`[MATCH] Booth ${boothNumber}: text(${tx.toFixed(1)}, ${ty.toFixed(1)}) -> nearest rect(${nearest.x.toFixed(1)}, ${nearest.y.toFixed(1)}, ${nearest.w.toFixed(1)}x${nearest.h.toFixed(1)}${nearest.rotation_deg != null ? ` rot=${nearest.rotation_deg}°` : ""}) dist=${nearestDist.toFixed(1)}`);
        booths.push(boothData);
      } else {
        // No rects found - create booth with estimated size based on text position
        // Use a default booth size (e.g., 2% of width/height)
        const defaultWidth = width * 0.02;
        const defaultHeight = height * 0.02;
        const boothX = tx - defaultWidth / 2;
        const boothY = ty - defaultHeight / 2;

        const boothNumber = parseInt(boothLabel, 10);
        if (isNaN(boothNumber)) {
          console.log(`[SKIP] Invalid booth number: "${boothLabel}"`);
          continue;
        }
        booths.push({
          booth_number: boothNumber,
          coords: {
            type: "rect" as const,
            x_pct: Number(((boothX / width) * 100).toFixed(4)),
            y_pct: Number(((boothY / height) * 100).toFixed(4)),
            width_pct: Number(((defaultWidth / width) * 100).toFixed(4)),
            height_pct: Number(((defaultHeight / height) * 100).toFixed(4)),
            x_px: boothX,
            y_px: boothY,
            w_px: defaultWidth,
            h_px: defaultHeight,
            match: "no_rects_found",
          },
        } as BoothExtraction);
      }
    }

    // Check if all text positions are the same (indicates a bug)
    if (textPositions.length > 1) {
      const firstPos = textPositions[0];
      const allSame = textPositions.every(p => Math.abs(p.x - firstPos.x) < 0.01 && Math.abs(p.y - firstPos.y) < 0.01);
      if (allSame) {
        console.error(`[ERROR] All ${textPositions.length} text positions are the same: (${firstPos.x.toFixed(2)}, ${firstPos.y.toFixed(2)})`);
        console.error("This indicates a bug in text position calculation!");
        console.error("First 5 text positions:", textPositions.slice(0, 5).map(p => `${p.label}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join(", "));
      } else {
        console.log(`[OK] Text positions are unique. Range: x=[${Math.min(...textPositions.map(p => p.x)).toFixed(1)}, ${Math.max(...textPositions.map(p => p.x)).toFixed(1)}], y=[${Math.min(...textPositions.map(p => p.y)).toFixed(1)}, ${Math.max(...textPositions.map(p => p.y)).toFixed(1)}]`);
        console.log("First 5 text positions:", textPositions.slice(0, 5).map(p => `${p.label}: (${p.x.toFixed(2)}, ${p.y.toFixed(2)})`).join(", "));
      }
    }

    console.log(`Extracted ${booths.length} booths from SVG`);
    
    // Log summary of extracted booths to debug matching issue
    if (booths.length > 0) {
      console.error("[EXTRACT SUMMARY] First 5 booths:");
      booths.slice(0, 5).forEach(b => {
        console.error(`  Booth ${b.booth_number}: (${b.coords.x_px.toFixed(1)}, ${b.coords.y_px.toFixed(1)}) ${b.coords.w_px.toFixed(1)}x${b.coords.h_px.toFixed(1)}, match=${b.coords.match}`);
      });
      
      // Check if all booths have the same coordinates
      const firstBooth = booths[0];
      const allSame = booths.every(b => 
        Math.abs(b.coords.x_px - firstBooth.coords.x_px) < 0.1 &&
        Math.abs(b.coords.y_px - firstBooth.coords.y_px) < 0.1
      );
      if (allSame) {
        console.error(`[ERROR] All ${booths.length} booths have the same coordinates: (${firstBooth.coords.x_px.toFixed(1)}, ${firstBooth.coords.y_px.toFixed(1)})`);
      }
    }
    
    if (booths.length === 0) {
      console.warn("No booths extracted. Make sure the SVG contains <rect> and <text> elements.");
      console.warn(`SVG had ${rects.length} rects and ${textElements.length} text elements`);
    }

    return booths;
  } catch (error) {
    console.error("Error extracting booths from SVG:", error);
    throw new Error(
      `Failed to extract booths: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

function stripUnit(value: string | null): string {
  if (!value) return "0";
  return value.replace(/[a-zA-Z%]+$/, "").trim();
}

