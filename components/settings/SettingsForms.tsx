"use client";

import { useActionState } from "react";
import { changePasswordAction, updateSettingsAction } from "@/app/actions/profile.actions";
import { Field } from "@/components/ui/Field";
import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Prefs = { notifyApplicationUpdates: boolean; notifyJobAlerts: boolean; notifyProductNews: boolean; notifyReactions: boolean; notifyComments: boolean; notifyConnections: boolean; notifyMessages: boolean; showOnlineStatus: boolean; profileVisible: boolean; visibility: "PUBLIC" | "CONNECTIONS_ONLY" | "PRIVATE" };

function Switch({ name, label, hint, checked }: { name: string; label: string; hint: string; checked: boolean }) {
  return (
    <div className="form-check form-switch mb-3">
      <input className="form-check-input" type="checkbox" role="switch" id={name} name={name} defaultChecked={checked} />
      <label className="form-check-label fw-semibold" htmlFor={name}>{label}</label>
      <div className="form-text mt-0">{hint}</div>
    </div>
  );
}

export function PreferencesForm({ prefs }: { prefs: Prefs }) {
  const [state, action] = useActionState(updateSettingsAction, {});
  return (
    <form action={action}>
      <Switch name="notifyApplicationUpdates" label="Application updates" hint="Status changes on your tracked applications." checked={prefs.notifyApplicationUpdates} />
      <Switch name="notifyJobAlerts" label="Job alerts" hint="New jobs that match your profile." checked={prefs.notifyJobAlerts} />
      <Switch name="notifyReactions" label="Reactions and shares" hint="When someone reacts to or shares your post." checked={prefs.notifyReactions} />
      <Switch name="notifyComments" label="Comments and replies" hint="When someone comments on your post or replies to your comment." checked={prefs.notifyComments} />
      <Switch name="notifyConnections" label="Connections and followers" hint="Connection requests, accepted requests and new followers." checked={prefs.notifyConnections} />
      <Switch name="notifyMessages" label="Messages" hint="When someone sends you a private message." checked={prefs.notifyMessages} />
      <Switch name="notifyProductNews" label="Product news" hint="Occasional updates about JobSync AI." checked={prefs.notifyProductNews} />
      <Switch name="showOnlineStatus" label="Show my online status" hint="Lets people see when you are online or last active. If you turn it off, you also stop seeing theirs." checked={prefs.showOnlineStatus} />
      <Switch name="profileVisible" label="Profile visible to employers" hint="Controls whether employers may find your profile once employer features exist." checked={prefs.profileVisible} />
      <div className="mb-4">
        <label className="form-label fw-semibold" htmlFor="visibility">Who can see your profile</label>
        <select id="visibility" name="visibility" className="form-select" defaultValue={prefs.visibility}>
          <option value="PUBLIC">Everyone on JobSync AI (appears in People you may know)</option>
          <option value="CONNECTIONS_ONLY">My connections only</option>
          <option value="PRIVATE">Only me</option>
        </select>
        <div className="form-text">Enforced on the server. Private profiles can&apos;t be followed or sent connection requests.</div>
      </div>
      <div className="d-flex flex-wrap align-items-center gap-3">
        <SubmitButton>Save preferences</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePasswordAction, {});
  return (
    <form action={action} noValidate>
      <Field label="Current password" name="currentPassword" type="password" state={state} autoComplete="current-password" required />
      <Field label="New password" name="newPassword" type="password" state={state} autoComplete="new-password" required hint="At least 8 characters with a letter and a number." />
      <Field label="Confirm new password" name="confirmPassword" type="password" state={state} autoComplete="new-password" required />
      <div className="d-flex flex-wrap align-items-center gap-3">
        <SubmitButton pendingText="Updating…">Change password</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
