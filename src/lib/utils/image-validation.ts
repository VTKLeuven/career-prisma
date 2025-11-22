/**
 * Validates page image dimensions to ensure they have an appropriate aspect ratio
 * for use as background images (e.g., 1280x853 or 871x933).
 * 
 * Allowed aspect ratios:
 * - Landscape: 1.3:1 to 1.7:1 (e.g., 1280x853 ≈ 1.5:1)
 * - Portrait/Square: 0.85:1 to 1.15:1 (e.g., 871x933 ≈ 0.93:1)
 * 
 * This prevents distorted or cut-off images like 600x150 or 6600x1650.
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  aspectRatio?: number;
}

/**
 * Validates that an image file has appropriate dimensions for use as a page background.
 * @param file - The image file to validate
 * @returns Promise resolving to validation result
 */
export async function validatePageImageDimensions(
  file: File
): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const aspectRatio = img.width / img.height;
      
      // Check if aspect ratio is within acceptable ranges
      // Landscape: 1.3:1 to 1.7:1
      // Portrait/Square: 0.85:1 to 1.15:1
      const isValid =
        (aspectRatio >= 1.3 && aspectRatio <= 1.7) ||
        (aspectRatio >= 0.85 && aspectRatio <= 1.15);

      if (!isValid) {
        resolve({
          valid: false,
          error: `Image dimensions are not suitable for use as a background. Recommended aspect ratios: 1.3:1 to 1.7:1 (landscape) or 0.85:1 to 1.15:1 (portrait/square). Your image is ${img.width}x${img.height} (${aspectRatio.toFixed(2)}:1).`,
          aspectRatio,
        });
      } else {
        resolve({
          valid: true,
          aspectRatio,
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({
        valid: false,
        error: "Failed to load image for validation.",
      });
    };

    img.src = url;
  });
}

/**
 * Validates image dimensions from width and height values.
 * Useful for server-side validation or when you already have dimensions.
 */
export function validatePageImageDimensionsFromSize(
  width: number,
  height: number
): ImageValidationResult {
  const aspectRatio = width / height;
  
  const isValid =
    (aspectRatio >= 1.3 && aspectRatio <= 1.7) ||
    (aspectRatio >= 0.85 && aspectRatio <= 1.15);

  if (!isValid) {
    return {
      valid: false,
      error: `Image dimensions are not suitable for use as a background. Recommended aspect ratios: 1.3:1 to 1.7:1 (landscape) or 0.85:1 to 1.15:1 (portrait/square). Your image is ${width}x${height} (${aspectRatio.toFixed(2)}:1).`,
      aspectRatio,
    };
  }

  return {
    valid: true,
    aspectRatio,
  };
}

/**
 * Checks if an existing image (by URL) has valid dimensions.
 * This is used to validate images that are already uploaded.
 */
export async function validateExistingPageImage(
  imageUrl: string
): Promise<ImageValidationResult> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      
      const isValid =
        (aspectRatio >= 1.3 && aspectRatio <= 1.7) ||
        (aspectRatio >= 0.85 && aspectRatio <= 1.15);

      if (!isValid) {
        resolve({
          valid: false,
          error: `Image dimensions are not suitable (${img.width}x${img.height}, ${aspectRatio.toFixed(2)}:1).`,
          aspectRatio,
        });
      } else {
        resolve({
          valid: true,
          aspectRatio,
        });
      }
    };

    img.onerror = () => {
      resolve({
        valid: false,
        error: "Failed to load image for validation.",
      });
    };

    img.src = imageUrl;
  });
}

