import { revalidatePath, revalidateTag } from "next/cache";

const EVENT_TYPES_CACHE_TAG = "viewer.eventTypes.getUserEventGroups";

/**
 * Membership changes alter whose event types and bookings a member sees,
 * so the cached event-type groups must be dropped for every team member.
 */
export function revalidateWorkspaceMembershipCache() {
  try {
    revalidateTag(EVENT_TYPES_CACHE_TAG, "max");
    revalidatePath("/event-types");
    revalidatePath("/bookings/upcoming");
  } catch {
    // Cache invalidation is best-effort and must never fail the mutation.
  }
}
