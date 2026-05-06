export function extractErrorMessage(error: any, fallback: string) {
  const payload = error?.response?.data;
  const message = payload?.message;

  if (typeof message === "string") {
    return message;
  }

  if (message && typeof message === "object") {
    if (typeof message.message === "string") {
      return message.message;
    }

    if (typeof message.error === "string") {
      return message.error;
    }
  }

  if (typeof payload?.error === "string") {
    return payload.error;
  }

  if (typeof error?.message === "string") {
    return error.message;
  }

  return fallback;
}
