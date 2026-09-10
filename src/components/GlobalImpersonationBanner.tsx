import { getEffectiveSessionUser } from '@/lib/impersonate-actions';
import StopImpersonateBanner from './StopImpersonateBanner';

export default async function GlobalImpersonationBanner() {
  const effectiveSession = await getEffectiveSessionUser();

  if (
    !effectiveSession?.isImpersonating ||
    !effectiveSession.staffProfile ||
    !effectiveSession.realUser
  ) {
    return null;
  }

  return (
    <StopImpersonateBanner
      targetName={effectiveSession.staffProfile.fullName}
      targetEmail={effectiveSession.staffProfile.email}
      realUserName={effectiveSession.realUser.name || effectiveSession.realUser.email}
    />
  );
}
