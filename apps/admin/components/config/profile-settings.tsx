import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { ApiErrorPanel } from "@/components/shared/api-error-panel";
import type { AdminUser } from "@/lib/api/types/user";
import type { AuthUser } from "@/lib/auth/types";
import { PasswordChangeForm } from "./password-change-form";
import { ProfileForm } from "./profile-form";

export function ProfileSettings({
  user,
  profile,
  profileError,
}: {
  user: AuthUser;
  profile?: AdminUser;
  profileError?: string;
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
      {profile ? (
        <ProfileForm profile={profile} />
      ) : (
        <Card className="min-w-0" aria-labelledby="profile-title">
          <CardHeader>
            <CardTitle id="profile-title">Información personal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="break-words font-semibold">{user.name}</p>
            <p className="break-all text-sm text-muted">{user.email}</p>
            {profileError ? (
              <ApiErrorPanel message={profileError} />
            ) : (
              <p className="text-sm text-muted">
                Perfil de plataforma — edición limitada para Super Admin.
              </p>
            )}
          </CardContent>
        </Card>
      )}
      <PasswordChangeForm />
    </div>
  );
}
