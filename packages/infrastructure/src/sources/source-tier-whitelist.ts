import { type SourceTier } from '@kawal/domain';

/**
 * Spec: evidence-ledger / "Source tier whitelist is loaded from configuration
 * only" + osint-ingestion / Tier-1 & Tier-2 coverage requirements.
 *
 * This module is the only place that knows the tier of a publisher. It is
 * loaded into memory at process boot and never mutated thereafter. There is
 * no HTTP-writable endpoint that touches it.
 */
export interface PublisherDescriptor {
  readonly host: string;
  readonly publisher: string;
  readonly tier: SourceTier;
}

const TIER_1: readonly PublisherDescriptor[] = [
  { host: 'story.kejaksaan.go.id', publisher: 'Kejaksaan Agung', tier: 'tier_1' },
  { host: 'putusan3.mahkamahagung.go.id', publisher: 'Mahkamah Agung', tier: 'tier_1' },
  { host: 'kpk.go.id', publisher: 'KPK', tier: 'tier_1' },
  { host: 'bpk.go.id', publisher: 'BPK', tier: 'tier_1' },
  { host: 'lkpp.go.id', publisher: 'LKPP', tier: 'tier_1' },
  { host: 'inaproc.id', publisher: 'LPSE', tier: 'tier_1' },
  { host: 'elhkpn.kpk.go.id', publisher: 'LHKPN (KPK)', tier: 'tier_1' },
  { host: 'dpr.go.id', publisher: 'DPR RI', tier: 'tier_1' },
  { host: 'bnpb.go.id', publisher: 'BNPB', tier: 'tier_1' },
];

const TIER_2: readonly PublisherDescriptor[] = [
  { host: 'tempo.co', publisher: 'Tempo', tier: 'tier_2' },
  { host: 'kompas.com', publisher: 'Kompas', tier: 'tier_2' },
  { host: 'detik.com', publisher: 'Detik', tier: 'tier_2' },
  { host: 'antaranews.com', publisher: 'Antara', tier: 'tier_2' },
  { host: 'cnnindonesia.com', publisher: 'CNN Indonesia', tier: 'tier_2' },
  { host: 'reuters.com', publisher: 'Reuters', tier: 'tier_2' },
  { host: 'apnews.com', publisher: 'AP', tier: 'tier_2' },
  { host: 'bbc.com', publisher: 'BBC', tier: 'tier_2' },
  { host: 'mongabay.com', publisher: 'Mongabay', tier: 'tier_2' },
  { host: 'jakartaglobe.id', publisher: 'Jakarta Globe', tier: 'tier_2' },
  { host: 'thejakartapost.com', publisher: 'Jakarta Post', tier: 'tier_2' },
];

const WHITELIST: ReadonlyArray<PublisherDescriptor> = [...TIER_1, ...TIER_2];

export interface SourceTierWhitelist {
  resolve(url: string): PublisherDescriptor | null;
}

export const sourceTierWhitelist: SourceTierWhitelist = {
  resolve(url: string): PublisherDescriptor | null {
    let host: string;
    try {
      host = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    } catch {
      return null;
    }
    return WHITELIST.find((p) => host === p.host || host.endsWith(`.${p.host}`)) ?? null;
  },
};
