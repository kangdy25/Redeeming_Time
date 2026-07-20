/**
 * Keep full-page navigations behind a small seam so OAuth controls can remain
 * testable without replacing the browser's non-configurable Location object.
 */
export function navigateToExternalUrl(url: string) {
  window.location.assign(url);
}

const socialAuthVerifierStorageKey = 'redeeming-time.social-auth-verifier';

function generateSocialAuthVerifier() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random values are unavailable.');
  }
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

/**
 * Bind a callback code to the browser tab that started OAuth. Session storage
 * is intentionally used instead of local storage so a copied callback URL
 * cannot establish a session in another browser or tab.
 */
export function createSocialAuthVerifier() {
  const verifier = generateSocialAuthVerifier();
  window.sessionStorage.setItem(socialAuthVerifierStorageKey, verifier);
  return verifier;
}

export function getSocialAuthVerifier() {
  return window.sessionStorage.getItem(socialAuthVerifierStorageKey);
}

export function clearSocialAuthVerifier() {
  window.sessionStorage.removeItem(socialAuthVerifierStorageKey);
}
