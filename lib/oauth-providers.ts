/**
 * Which social sign-in buttons exist. A provider is only enabled when BOTH of its
 * env vars are set, so the app never shows a button that cannot work.
 */
export const OAUTH_PROVIDERS = [
  { id: "google", label: "Google", icon: "bi-google", idVar: "AUTH_GOOGLE_ID", secretVar: "AUTH_GOOGLE_SECRET" },
  { id: "github", label: "GitHub", icon: "bi-github", idVar: "AUTH_GITHUB_ID", secretVar: "AUTH_GITHUB_SECRET" },
  { id: "facebook", label: "Facebook", icon: "bi-facebook", idVar: "AUTH_FACEBOOK_ID", secretVar: "AUTH_FACEBOOK_SECRET" },
] as const;

export type OAuthProviderId = (typeof OAUTH_PROVIDERS)[number]["id"];

export function isOAuthConfigured(p: (typeof OAUTH_PROVIDERS)[number]): boolean {
  return Boolean(process.env[p.idVar] && process.env[p.secretVar]);
}

export function getEnabledOAuthProviders() {
  return OAUTH_PROVIDERS.filter(isOAuthConfigured);
}

export function isEnabledOAuthProvider(id: unknown): id is OAuthProviderId {
  return getEnabledOAuthProviders().some((p) => p.id === id);
}
