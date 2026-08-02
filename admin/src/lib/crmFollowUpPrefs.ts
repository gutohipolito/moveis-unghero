import {
  DEFAULT_FOLLOW_UP_SLA,
  normalizeFollowUpSla,
  type FollowUpSlaConfig,
} from "@/lib/followUp";

export const CRM_FOLLOW_UP_SLA_PREF_KEY = "crmFollowUpSla";
const LOCAL_KEY = "mu_crm_follow_up_sla";
export const CRM_FOLLOW_UP_BANNERS_DISMISS_KEY = "mu_crm_follow_up_banners_dismissed";

export function loadFollowUpBannersDismissedFingerprint(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CRM_FOLLOW_UP_BANNERS_DISMISS_KEY);
  } catch {
    return null;
  }
}

export function saveFollowUpBannersDismissedFingerprint(fingerprint: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (!fingerprint) {
      localStorage.removeItem(CRM_FOLLOW_UP_BANNERS_DISMISS_KEY);
    } else {
      localStorage.setItem(CRM_FOLLOW_UP_BANNERS_DISMISS_KEY, fingerprint);
    }
  } catch {
    /* ignore */
  }
}

export function loadFollowUpSlaLocal(): FollowUpSlaConfig {
  if (typeof window === "undefined") return DEFAULT_FOLLOW_UP_SLA;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (!raw) return DEFAULT_FOLLOW_UP_SLA;
    return normalizeFollowUpSla(JSON.parse(raw) as Partial<FollowUpSlaConfig>);
  } catch {
    return DEFAULT_FOLLOW_UP_SLA;
  }
}

export function saveFollowUpSlaLocal(sla: FollowUpSlaConfig) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_KEY, JSON.stringify(normalizeFollowUpSla(sla)));
}

export function resolveFollowUpSla(
  stored?: Partial<FollowUpSlaConfig> | null
): FollowUpSlaConfig {
  return normalizeFollowUpSla(stored ?? undefined);
}
