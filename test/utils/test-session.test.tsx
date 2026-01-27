import { Text } from "ink";
import { afterEach, describe, expect, it } from "vitest";
import { createInitialAppState } from "../../source/state/app-state.js";
import { useAppState } from "../../source/state/context.js";
import { ActionLogger } from "../../source/utils/action-logger.js";
import { createTestSession, Keys, type TestSession } from "./test-session.js";

// A minimal component that uses the app state
function TestComponent() {
  const state = useAppState();
  const { focusedPane } = state.navigation;

  return (
    <Text>
      Pane: {focusedPane} Debug: {state.debugEnabled ? "on" : "off"}
    </Text>
  );
}

describe("createTestSession", () => {
  let session: TestSession;

  afterEach(() => {
    session?.cleanup();
  });

  it("renders an element and returns frames", () => {
    session = createTestSession(<TestComponent />);

    const frame = session.lastFrame();
    expect(frame).toBeDefined();
    expect(frame).toContain("Pane: navigator");
    expect(frame).toContain("Debug: off");
  });

  it("provides state introspection via getState", () => {
    session = createTestSession(<TestComponent />);

    const state = session.getState();
    expect(state.navigation.focusedPane).toBe("navigator");
    expect(state.debugEnabled).toBe(false);
  });

  it("accepts initialState option", () => {
    const initialState = {
      ...createInitialAppState(),
      debugEnabled: true,
    };

    session = createTestSession(<TestComponent />, { initialState });

    const state = session.getState();
    expect(state.debugEnabled).toBe(true);

    const frame = session.lastFrame();
    expect(frame).toContain("Debug: on");
  });

  it("captures keyboard input via pressKey", () => {
    session = createTestSession(<TestComponent />);

    // Pressing a key doesn't crash
    session.pressKey(Keys.DOWN);
    expect(session.lastFrame()).toBeDefined();
  });

  it("captures multiple keys via pressKeys", () => {
    session = createTestSession(<TestComponent />);

    session.pressKeys([Keys.DOWN, Keys.UP, Keys.ENTER]);
    expect(session.lastFrame()).toBeDefined();
  });

  it("types text via type method", () => {
    session = createTestSession(<TestComponent />);

    session.type("hello");
    expect(session.lastFrame()).toBeDefined();
  });

  it("returns action history from the session", () => {
    session = createTestSession(<TestComponent />);

    // Initially empty (no dispatches yet from inside the component)
    const history = session.getActionHistory();
    expect(Array.isArray(history)).toBe(true);
  });

  it("captures a snapshot with state, frame, and actions", () => {
    session = createTestSession(<TestComponent />);

    const snap = session.snapshot();
    expect(snap).toHaveProperty("state");
    expect(snap).toHaveProperty("frame");
    expect(snap).toHaveProperty("actions");
    expect(snap.state.navigation.focusedPane).toBe("navigator");
    expect(snap.frame).toContain("Pane:");
    expect(Array.isArray(snap.actions)).toBe(true);
  });

  it("waitFor resolves when predicate matches", async () => {
    session = createTestSession(<TestComponent />);

    await session.waitFor((frame) => frame.includes("Pane:"));
  });

  it("waitFor rejects on timeout", async () => {
    session = createTestSession(<TestComponent />);

    await expect(
      session.waitFor((frame) => frame.includes("NEVER_EXISTS"), {
        timeoutMs: 100,
      }),
    ).rejects.toThrow("Timed out");
  });

  it("cleanup clears action history", () => {
    session = createTestSession(<TestComponent />);

    session.cleanup();

    // After cleanup, action logger is cleared
    expect(ActionLogger.getEntries()).toHaveLength(0);
  });
});

describe("Keys constants", () => {
  it("exports expected key codes", () => {
    expect(Keys.UP).toBe("\u001B[A");
    expect(Keys.DOWN).toBe("\u001B[B");
    expect(Keys.RIGHT).toBe("\u001B[C");
    expect(Keys.LEFT).toBe("\u001B[D");
    expect(Keys.ENTER).toBe("\r");
    expect(Keys.ESCAPE).toBe("\u001B");
    expect(Keys.TAB).toBe("\t");
    expect(Keys.CTRL_C).toBe("\u0003");
    expect(Keys.CTRL_D).toBe("\u0004");
  });
});
