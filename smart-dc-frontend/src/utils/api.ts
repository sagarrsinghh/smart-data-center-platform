export function unwrapApiData<T>(response: any): T {
  let current = response?.data;

  while (
    current &&
    typeof current === "object" &&
    !Array.isArray(current) &&
    "success" in current &&
    "data" in current
  ) {
    current = current.data;
  }

  return current as T;
}

export function getArrayPayload<T>(response: any): T[] {
  const payload = unwrapApiData<any>(response);

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

export function getObjectPayload<T>(response: any): T {
  const payload = unwrapApiData<any>(response);

  if (payload && typeof payload === "object" && !Array.isArray(payload) && "data" in payload && typeof payload.data === "object" && !Array.isArray(payload.data)) {
    return payload.data as T;
  }

  return (payload || {}) as T;
}
