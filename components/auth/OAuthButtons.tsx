import { oauthSignInAction } from "@/app/actions/auth.actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { getEnabledOAuthProviders } from "@/lib/oauth-providers";

/** Server component: renders only the providers whose keys are set in .env. */
export function OAuthButtons({
  callbackUrl = "/dashboard",
}: {
  callbackUrl?: string;
}) {
  const providers = getEnabledOAuthProviders();
  if (providers.length === 0) return null;

  return (
    <div className="mb-3">
      <div className="d-grid gap-2">
        {providers.map((p) => (
          <form action={oauthSignInAction} key={p.id}>
            <input type="hidden" name="provider" value={p.id} />
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <SubmitButton
              className="btn btn-outline-secondary w-100 oauth-btn"
              pendingText={`Opening ${p.label}…`}
            >
              <i className={`bi ${p.icon} me-2`} aria-hidden="true" />
              Continue with {p.label}
            </SubmitButton>
          </form>
        ))}
      </div>
      <div className="divider-text" role="separator">
        <span>or use your email</span>
      </div>
    </div>
  );
}
