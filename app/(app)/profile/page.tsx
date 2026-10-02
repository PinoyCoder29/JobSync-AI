import type { Metadata } from "next";
import { MediaUploader } from "@/components/media/MediaUploader";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { requireUserId } from "@/lib/session";
import { mediaService } from "@/services/media/media.service";
import { profileService } from "@/services/profile.service";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const userId = await requireUserId();
  const [{ user, profile, skills, completion }, images] = await Promise.all([profileService.get(userId), mediaService.getUserImageUrls(userId)]);
  const displayName = user?.name ?? user?.email ?? "You";
  return (
    <div>
      <h1 className="page-title">Profile</h1>
      <p className="text-muted mb-4">What employers and the matching score use to understand you.</p>
      <div className="row g-5">
        <div className="col-lg-8">
          <section className="side-panel mb-4" aria-labelledby="photos-title">
            <h2 className="sub-title" id="photos-title">Photos</h2>
            <div className="d-grid gap-4">
              <MediaUploader kind="avatar" currentUrl={images.avatarUrl} name={displayName} />
              <MediaUploader kind="cover" currentUrl={images.coverUrl} name={displayName} />
            </div>
          </section>
          <ProfileForm
            values={{
              name: user?.name ?? "",
              headline: profile?.headline ?? "",
              summary: profile?.summary ?? "",
              location: profile?.location ?? "",
              targetRoles: profile?.targetRoles.join(", ") ?? "",
              preferredWorkArrangement: profile?.preferredWorkArrangement ?? "",
              preferredLocations: profile?.preferredLocations.join(", ") ?? "",
              salaryMin: profile?.salaryExpectationMin?.toString() ?? "",
              salaryMax: profile?.salaryExpectationMax?.toString() ?? "",
              portfolioUrl: profile?.portfolioUrl ?? "",
              githubUrl: profile?.githubUrl ?? "",
              linkedinUrl: profile?.linkedinUrl ?? "",
              skills: skills.map((s) => s.skill.name).join(", "),
            }}
          />
        </div>
        <aside className="col-lg-4">
          <div className="side-panel">
            <h2 className="sub-title">Profile completion</h2>
            <ProgressBar value={completion.percent} label="Complete" />
            {completion.missing.length > 0 && (
              <>
                <p className="small fw-semibold mt-3 mb-1">Still missing</p>
                <ul className="check-list small mb-0">{completion.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
