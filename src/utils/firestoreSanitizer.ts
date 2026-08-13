/**
 * Recursively cleans an object or array to prepare it for Firestore setDoc / updateDoc / addDoc.
 * - Replaces any string starting with "data:image/" or "data:" with null.
 * - Replaces any string longer than 50,000 characters with null.
 * - Skips undefined fields (which Firestore rejects).
 * - Preserves Firestore FieldValue (e.g. serverTimestamp()) and Timestamp objects.
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Intercept base64 data URIs or oversized strings
    if (data.startsWith('data:') || data.length > 50000) {
      return null as unknown as T;
    }
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  // Preserve Date objects
  if (data instanceof Date) {
    return data;
  }

  // Check if it's a Firestore FieldValue, ServerTimestamp, or Timestamp object
  if (
    'methodName' in (data as any) ||
    '_delegate' in (data as any) ||
    (data as any).constructor?.name === 'FieldValue' ||
    (data as any).constructor?.name === 'Timestamp'
  ) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }

  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value === undefined) {
      continue;
    }
    cleaned[key] = sanitizeForFirestore(value);
  }

  return cleaned as T;
}
