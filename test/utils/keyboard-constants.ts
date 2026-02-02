/**
 * Common escape sequences for special keys.
 * These can be used with stdin.write() to simulate special keys in ink-testing-library.
 *
 * Example usage:
 * ```tsx
 * import { ESCAPE_SEQUENCES } from "./keyboard-constants.js";
 *
 * const instance = render(<MyComponent />);
 * instance.stdin.write(ESCAPE_SEQUENCES.escape); // Send Escape
 * instance.stdin.write(ESCAPE_SEQUENCES.enter);  // Send Enter
 * instance.stdin.write("q");                      // Send 'q' character
 * ```
 */
export const ESCAPE_SEQUENCES = {
  escape: "\x1B",
  enter: "\r",
  backspace: "\x7F",
  tab: "\t",
  upArrow: "\x1B[A",
  downArrow: "\x1B[B",
  rightArrow: "\x1B[C",
  leftArrow: "\x1B[D",
  ctrlC: "\x03",
  ctrlD: "\x04",
} as const;

export type EscapeSequenceKey = keyof typeof ESCAPE_SEQUENCES;
