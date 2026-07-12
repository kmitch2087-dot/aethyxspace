const SESSION_KEY = "aethyx_sid";

// Public-site traffic only — admin/portal usage isn't what ad partners are buying.
export const shouldTrackPath = (path: string): boolean =>
  !path.startsWith("/admin") && !path.startsWith("/portal");

export const getSessionId = (): string => {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return crypto.randomUUID();
  }
};

export const getExternalReferrer = (): string | null => {
  const ref = document.referrer;
  if (!ref) return null;
  try {
    if (new URL(ref).origin === window.location.origin) return null;
  } catch {
    return null;
  }
  return ref.slice(0, 500);
};
