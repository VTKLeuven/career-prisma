/**
 * API Client for VTK Career Mobile Backend
 */

export const BASE_URL = 'https://jobfair.vtk.be';
export const DEFAULT_TIMEOUT_MS = 8000;

export class ApiError extends Error {
  status?: number;
  isNetworkError: boolean;

  constructor(message: string, status?: number, isNetworkError = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isNetworkError = isNetworkError;
  }
}

/**
 * Perform an HTTP GET request with timeout and error handling.
 */
export async function apiGet<T>(
  endpoint: string,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VTK-Floorplan-Mobile-App/1.0',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(
        `API request failed with status ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    return data as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    const isAbort = error.name === 'AbortError';
    const message = isAbort
      ? `Network request timed out after ${timeoutMs}ms`
      : error.message || 'Network connection failed';

    throw new ApiError(message, undefined, true);
  }
}
