import { useQuery } from '@tanstack/react-query';
import { toLandingShowcaseStatic, type LandingShowcaseData } from '../../config/landingShowcase';

async function fetchLandingPreview(): Promise<LandingShowcaseData> {
  const res = await fetch('/api/landing/preview');
  if (!res.ok) return toLandingShowcaseStatic();
  return res.json() as Promise<LandingShowcaseData>;
}

export function useLandingPreview() {
  return useQuery({
    queryKey: ['landing-preview'],
    queryFn: fetchLandingPreview,
    staleTime: 60_000,
    placeholderData: toLandingShowcaseStatic(),
  });
}
