/**
 * This middleware ensures that Redis-related code only runs on the server
 * It's used to prevent Redis imports from being included in client bundles
 */

export function withServerOnly<T>(handler: () => Promise<T>): Promise<T> {
  if (typeof window !== 'undefined') {
    throw new Error('This function can only be called on the server');
  }
  
  return handler();
}

export const isServer = typeof window === 'undefined'; 