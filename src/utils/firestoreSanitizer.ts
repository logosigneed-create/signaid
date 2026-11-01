/**
 * Utility function to recursively sanitize payloads before Firestore write operations.
 * - Replaces any Base64 string > 2048 chars or starting with "data:image/", "data:", or "blob:"
 *   with the corresponding Storage HTTPS URL (if available in optional urlMap) or "" / null.
 * - Converts undefined values to null to prevent Firestore errors.
 * - Preserves special Firestore FieldValue, Timestamp, and Date objects.
 */
export function sanitizeForFirestore<T>(data: T, urlMap?: Record<string, string>): T {
  if (data === undefined) return null as any;
  if (data === null) return null as any;

  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (urlMap && (urlMap[trimmed] || urlMap[data])) {
      return (urlMap[trimmed] || urlMap[data]) as any;
    }
    // Prevent temporary local blob: URLs from poisoning Firestore
    if (trimmed.startsWith('blob:')) {
      return "" as any;
    }
    // Prevent document size overflow (>1MB limit in Firestore):
    // Strip any data URI (data:image/, data:)
    if (trimmed.startsWith('data:image/') || trimmed.startsWith('data:')) {
      return "" as any;
    }
    // Strip oversized raw Base64 or non-HTTP/HTTPS payloads > 2048 chars
    if (trimmed.length > 2048 && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      return "" as any;
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
    return data.map(item => sanitizeForFirestore(item, urlMap)).filter(item => item !== null && item !== undefined) as any;
  }

  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value === undefined) {
      sanitized[key] = null;
    } else {
      sanitized[key] = sanitizeForFirestore(value, urlMap);
    }
  }
  return sanitized as T;
}
