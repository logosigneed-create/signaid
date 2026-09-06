/**
 * Utility function to recursively sanitize payloads before Firestore write operations.
 * - Converts undefined values to null to prevent Firestore errors.
 * - Replaces Base64 data URIs (data:image/... or long data: strings > 500 chars) with null.
 * - Preserves special Firestore FieldValue, Timestamp, and Date objects.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) return null as any;
  if (data === null) return null as any;

  if (typeof data === 'string') {
    // Prevent temporary local blob: URLs from poisoning Firestore
    if (data.startsWith('blob:')) {
      return null as any;
    }
    // Prevent document size overflow (>1MB limit in Firestore): strip oversized data URIs >250KB
    if ((data.startsWith('data:image/') || data.startsWith('data:')) && data.length > 250000) {
      return null as any;
    }
    return data as any;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (data instanceof Date) return data as any;

  // Preserve Firestore FieldValues and Timestamps
  if (
    typeof data === 'object' &&
    ('_methodName' in (data as any) || 'toMillis' in (data as any) || (data as any).constructor?.name === 'FieldValue' || (data as any).constructor?.name === 'Timestamp')
  ) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)).filter(item => item !== null && item !== undefined && item !== '') as any;
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value === undefined) {
      sanitized[key] = null;
    } else {
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  return sanitized as T;
}
