// Dated editorial pieces (a weather bulletin summary, a notice with a deadline) carry `validUntil`,
// the last India-time day the information applies to. After that day the article stays readable
// with its original dates, marked as an archived issue: it is never shown as current guidance.

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const todayIndia = (now = Date.now()) => new Date(Number(now) + 5.5 * 3600e3).toISOString().slice(0, 10);

/** A real calendar day written as YYYY-MM-DD. */
export const isEditorialDay = value => DAY.test(value || '') && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

/** True once the India-time date is past `validUntil`; false without a valid `validUntil`. */
export function isArchivedPost(post, now = Date.now()) {
  return isEditorialDay(post?.validUntil) && todayIndia(now) > post.validUntil;
}
