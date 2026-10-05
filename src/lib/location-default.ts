/** Prefer default location; else first active. Empty string if none. */
export function pickDefaultLocationId(
  locations: Array<{ id: string; isDefault?: boolean }>
): string {
  if (!locations.length) return "";
  return locations.find((l) => l.isDefault)?.id ?? locations[0].id;
}
