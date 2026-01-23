/**
 * Parses a cursor string as an offset number.
 *
 * @param cursor - The cursor string to parse (typically a stringified offset)
 * @returns The parsed offset number, or undefined if the cursor is invalid
 *
 * A cursor is considered valid if:
 * - It's a non-empty string
 * - It parses to a finite integer
 * - The resulting integer is non-negative
 */
export function parseCursorOffset(
  cursor: string | undefined,
): number | undefined {
  if (cursor === undefined || cursor === "") {
    return;
  }

  const parsed = Number.parseInt(cursor, 10);

  if (Number.isNaN(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    return;
  }

  return parsed;
}
