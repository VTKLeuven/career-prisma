// lib/utils/pdf-polyfills.ts
// This file must be imported BEFORE pdfjs-dist to provide necessary polyfills

// Polyfill browser APIs for Node.js environment
if (typeof window === "undefined") {
  // Add DOMMatrix polyfill
  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = class DOMMatrix {
      a = 1;
      b = 0;
      c = 0;
      d = 1;
      e = 0;
      f = 0;
      m11 = 1;
      m12 = 0;
      m13 = 0;
      m14 = 0;
      m21 = 0;
      m22 = 1;
      m23 = 0;
      m24 = 0;
      m31 = 0;
      m32 = 0;
      m33 = 1;
      m34 = 0;
      m41 = 0;
      m42 = 0;
      m43 = 0;
      m44 = 1;
      is2D = true;
      isIdentity = true;
      
      constructor(init?: string | number[]) {
        if (init) {
          if (typeof init === "string") {
            // Parse matrix string
            const values = init.match(/[\d.]+/g)?.map(Number) || [];
            if (values.length >= 6) {
              this.a = values[0];
              this.b = values[1];
              this.c = values[2];
              this.d = values[3];
              this.e = values[4];
              this.f = values[5];
              this.m11 = values[0];
              this.m12 = values[1];
              this.m21 = values[2];
              this.m22 = values[3];
              this.m41 = values[4];
              this.m42 = values[5];
              this.isIdentity = false;
            }
          }
        }
      }
      
      multiply() { return this; }
      translate() { return this; }
      scale() { return this; }
      rotate() { return this; }
      rotateFromVector() { return this; }
      flipX() { return this; }
      flipY() { return this; }
      skewX() { return this; }
      skewY() { return this; }
      inverse() { return this; }
      setMatrixValue() { return this; }
    } as any;
  }
  
  // Add DOMPoint polyfill
  if (typeof globalThis.DOMPoint === "undefined") {
    globalThis.DOMPoint = class DOMPoint {
      x = 0;
      y = 0;
      z = 0;
      w = 1;
      constructor(x = 0, y = 0, z = 0, w = 1) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
      }
    } as any;
  }
  
  // Add DOMRect polyfill
  if (typeof globalThis.DOMRect === "undefined") {
    globalThis.DOMRect = class DOMRect {
      x = 0;
      y = 0;
      width = 0;
      height = 0;
      top = 0;
      right = 0;
      bottom = 0;
      left = 0;
      constructor(x = 0, y = 0, width = 0, height = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.top = y;
        this.left = x;
        this.right = x + width;
        this.bottom = y + height;
      }
    } as any;
  }
}

// Export an empty object to make this file a module
export {};

