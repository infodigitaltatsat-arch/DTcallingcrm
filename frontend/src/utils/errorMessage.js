export function getErrorMessage(error, fallback) {
  const responseData = error?.response?.data;
  const candidates = [
    responseData?.error,
    responseData?.message,
    responseData,
    error
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }

    if (candidate && typeof candidate === 'object') {
      if (typeof candidate.message === 'string' && candidate.message.trim()) {
        return candidate.message;
      }

      if (typeof candidate.error === 'string' && candidate.error.trim()) {
        return candidate.error;
      }
    }
  }

  return fallback;
}
