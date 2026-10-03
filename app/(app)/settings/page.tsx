import type { Metadata } from "next";
import { PasswordForm, PreferencesForm } from "@/components/settings/SettingsForms";
import { formatDate } from "@/lib/labels";
import { requireUserId } from "@/lib/session";
import { profileService } from "@/services/profile.service";
import { userService } from "@/services/user.service";
import { OAUTH_PROVIDERS } from "@/lib/oauth-providers";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const userId = await requireUserId();
  const [account, { profile }, methods] = await Promise.all([userService.getAccount(userId), profileService.get(userId), userService.getSignInMethods(userId)]);
  const labelOf = (id: string) => OAUTH_PROVIDERS.find((p) => p.id === id)?.label ?? id;
  return (
    <div className="d-grid gap-5" style={{ maxWidth: 720 }}>
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-muted mb-0">Manage your account, notifications and security.</p>
      </div>
      <section>
        <h2 className="section-title">Account</h2>
        <dl className="app-facts">
          <div><dt>Name</dt><dd>{account?.name}</dd></div>
          <div><dt>Email</dt><dd>{account?.email}</dd></div>
          <div><dt>Member since</dt><dd>{account ? formatDate(account.createdAt) : ""}</dd></div>
          <div><dt>Sign-in</dt><dd>{[methods.hasPassword ? "Email and password" : null, ...methods.providers.map(labelOf)].filter(Boolean).join(", ") || "Email and password"}</dd></div>
        </dl>
        <p className="small text-muted">Change your name on the profile page.</p>
      </section>
      <section>
        <h2 className="section-title">Notifications and privacy</h2>
        <p className="text-muted small">Your choices are saved now. Email delivery and employer visibility are not connected yet, so these preferences take effect when those features are added.</p>
        <PreferencesForm prefs={{
          notifyApplicationUpdates: profile?.notifyApplicationUpdates ?? true,
          notifyJobAlerts: profile?.notifyJobAlerts ?? true,
          notifyProductNews: profile?.notifyProductNews ?? false,
          notifyReactions: profile?.notifyReactions ?? true,
          notifyComments: profile?.notifyComments ?? true,
          notifyConnections: profile?.notifyConnections ?? true,
          profileVisible: profile?.profileVisible ?? true,
          visibility: profile?.visibility ?? "PUBLIC",
        }} />
      </section>
      <section>
        <h2 className="section-title">Password</h2>
        {methods.hasPassword ? (
          <PasswordForm />
        ) : (
          <p className="text-muted mb-0">You sign in with {methods.providers.map(labelOf).join(", ")}, so there is no JobSync AI password to change. Manage your password with that provider.</p>
        )}
      </section>
    </div>
  );
}
