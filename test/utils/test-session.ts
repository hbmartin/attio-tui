import { render } from "ink-testing-library";
import { createElement, type ReactElement } from "react";
import {
  type AppState,
  createInitialAppState,
} from "../../source/state/app-state.js";
import { AppProvider } from "../../source/state/context.js";
import {
  type ActionLogEntry,
  ActionLogger,
} from "../../source/utils/action-logger.js";

// Common key constants for terminal input
const Keys = {
  UP: "\u001B[A",
  DOWN: "\u001B[B",
  RIGHT: "\u001B[C",
  LEFT: "\u001B[D",
  ENTER: "\r",
  ESCAPE: "\u001B",
  TAB: "\t",
  BACKSPACE: "\x7f",
  CTRL_C: "\u0003",
  CTRL_D: "\u0004",
  CTRL_O: "\u000F",
  CTRL_R: "\u0012",
} as const;

interface TestSnapshot {
  readonly state: AppState;
  readonly frame: string | undefined;
  readonly actions: readonly ActionLogEntry[];
}

interface WaitForOptions {
  readonly timeoutMs?: number;
  readonly intervalMs?: number;
}

interface TestSession {
  pressKey(key: string): void;
  pressKeys(keys: string[]): void;
  type(text: string): void;
  lastFrame(): string | undefined;
  waitFor(
    predicate: (frame: string) => boolean,
    options?: WaitForOptions,
  ): Promise<void>;
  getState(): AppState;
  getActionHistory(): readonly ActionLogEntry[];
  snapshot(): TestSnapshot;
  cleanup(): void;
}

interface CreateTestSessionOptions {
  readonly initialState?: AppState;
}

function createTestSession(
  element: ReactElement,
  options?: CreateTestSessionOptions,
): TestSession {
  // Initialize with known initial state so getState() works synchronously
  let currentState: AppState = options?.initialState ?? createInitialAppState();

  const onStateChange = (state: AppState): void => {
    currentState = state;
  };

  // Clear action logger before each session
  ActionLogger.clear();

  // Wrap the element in AppProvider with state change callback
  const wrappedElement = createElement(
    AppProvider,
    {
      initialState: options?.initialState,
      onStateChange,
    },
    element,
  );

  const instance = render(wrappedElement);

  // Patch stdin to have ref/unref/read methods for Ink compatibility
  Object.assign(instance.stdin, {
    ref: () => undefined,
    unref: () => undefined,
    read: () => null,
  });

  function pressKey(key: string): void {
    instance.stdin.write(key);
  }

  function pressKeys(keys: string[]): void {
    for (const key of keys) {
      instance.stdin.write(key);
    }
  }

  function typeText(text: string): void {
    instance.stdin.write(text);
  }

  function lastFrame(): string | undefined {
    return instance.lastFrame();
  }

  async function waitFor(
    predicate: (frame: string) => boolean,
    waitOptions: WaitForOptions = {},
  ): Promise<void> {
    const { timeoutMs = 2000, intervalMs = 25 } = waitOptions;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const frame = instance.lastFrame();
      if (frame && predicate(frame)) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    throw new Error(
      `Timed out after ${String(timeoutMs)}ms waiting for frame predicate`,
    );
  }

  function getState(): AppState {
    return currentState;
  }

  function getActionHistory(): readonly ActionLogEntry[] {
    return ActionLogger.getEntries();
  }

  function snapshot(): TestSnapshot {
    return {
      state: getState(),
      frame: lastFrame(),
      actions: getActionHistory(),
    };
  }

  function cleanup(): void {
    instance.cleanup();
    ActionLogger.clear();
  }

  return {
    pressKey,
    pressKeys,
    type: typeText,
    lastFrame,
    waitFor,
    getState,
    getActionHistory,
    snapshot,
    cleanup,
  };
}

export { createTestSession, Keys };
export type { TestSession, TestSnapshot };
