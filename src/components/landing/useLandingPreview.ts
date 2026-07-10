import { useQuery } from '@tanstack/react-query';
import {
  toLandingShowcaseIllustration,
  toLandingShowcaseStatic,
  type LandingShowcaseData,
} from '../../config/landingShowcase';

async function fetchLandingPreview(): Promise<LandingShowcaseData> {
  const res = await fetch('/api/landing/preview');
  if (!res.ok) return toLandingShowcaseStatic();
  return res.json() as Promise<LandingShowcaseData>;
}

export function useLandingPreview() {
  const isProduction = import.meta.env.PROD;

  return useQuery({
    queryKey: ['landing-preview'],
    queryFn: () =>
      isProduction ? Promise.resolve(toLandingShowcaseIllustration()) : fetchLandingPreview(),
    staleTime: isProduction ? Infinity : 60_000,
    placeholderData: isProduction ? toLandingShowcaseIllustration() : toLandingShowcaseStatic(),
  });
}
