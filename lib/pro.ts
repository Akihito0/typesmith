// One switch for the whole Pro story.
//
// While TypeSmith is in beta every Pro layout is unlocked for everyone — free,
// no account, nothing to buy. That is the current product promise and the copy
// everywhere says so.
//
// When TypeSmith leaves beta, Pro becomes a real paid plan. Flipping
// PRO_BETA_FREE to false is the whole change: the sidebar and the toolbar's
// layout menu start routing Pro items to the upgrade modal instead of opening
// them, and every "free while in beta" string swaps to its post-beta wording.
// Nothing else needs editing.
//
// Deliberately no price constant: the landing page used to advertise a $49
// plan that didn't exist, and we're not reintroducing a number we can't honour.
// Add one here (and only here) when billing is actually decided.

export const PRO_BETA_FREE = true;

/** Layout tools that carry the PRO badge. */
export const PRO_LAYOUT_IDS = ["slides", "social", "newsletter"] as const;
export type ProLayoutId = (typeof PRO_LAYOUT_IDS)[number];

export function isProLayout(id: string): id is ProLayoutId {
  return (PRO_LAYOUT_IDS as readonly string[]).includes(id);
}

/** True while Pro layouts are usable without paying. */
export function isProUnlocked(): boolean {
  return PRO_BETA_FREE;
}

/** Short line for badges and tooltips. */
export const PRO_STATUS_LABEL = PRO_BETA_FREE
  ? "Free while in beta"
  : "Requires a Pro subscription";

/** The honest explanation shown in ProModal and on the landing Editions table. */
export const PRO_STATUS_NOTICE = PRO_BETA_FREE
  ? "There's nothing to buy yet. Every Pro layout is unlocked while TypeSmith is in beta — no account, no card. When the beta ends, Pro becomes a paid plan and these layouts move behind it; projects you've already made stay yours and keep exporting."
  : "Pro layouts are part of the paid plan. Your existing projects, exports, and share links stay free forever.";
