import { describe, expect, it } from "vitest";
import {
  findKeyAction,
  GLOBAL_KEYBINDINGS,
  LIST_KEYBINDINGS,
  matchesKeybinding,
} from "./keybindings.js";

describe("matchesKeybinding", () => {
  it("should match simple key", () => {
    const input = { key: "j", ctrl: false, shift: false, meta: false };
    const binding = { key: "j", action: "moveDown" as const };
    expect(matchesKeybinding(input, binding)).toBe(true);
  });

  it("should not match different key", () => {
    const input = { key: "k", ctrl: false, shift: false, meta: false };
    const binding = { key: "j", action: "moveDown" as const };
    expect(matchesKeybinding(input, binding)).toBe(false);
  });

  it("should match key with ctrl modifier", () => {
    const input = { key: "c", ctrl: true, shift: false, meta: false };
    const binding = { key: "c", ctrl: true, action: "copyId" as const };
    expect(matchesKeybinding(input, binding)).toBe(true);
  });

  it("should not match when ctrl modifier differs", () => {
    const input = { key: "c", ctrl: false, shift: false, meta: false };
    const binding = { key: "c", ctrl: true, action: "copyId" as const };
    expect(matchesKeybinding(input, binding)).toBe(false);
  });

  it("should match key with shift modifier", () => {
    const input = { key: "tab", ctrl: false, shift: true, meta: false };
    const binding = {
      key: "tab",
      shift: true,
      action: "previousPane" as const,
    };
    expect(matchesKeybinding(input, binding)).toBe(true);
  });

  it("should not match when shift modifier differs", () => {
    const input = { key: "tab", ctrl: false, shift: false, meta: false };
    const binding = {
      key: "tab",
      shift: true,
      action: "previousPane" as const,
    };
    expect(matchesKeybinding(input, binding)).toBe(false);
  });

  it("should handle undefined modifiers as false", () => {
    const input = { key: "j" };
    const binding = { key: "j", action: "moveDown" as const };
    expect(matchesKeybinding(input, binding)).toBe(true);
  });
});

describe("findKeyAction", () => {
  it("should find action for vim j key in list bindings", () => {
    const input = { key: "j", ctrl: false, shift: false, meta: false };
    const action = findKeyAction(input, LIST_KEYBINDINGS);
    expect(action).toBe("moveDown");
  });

  it("should find action for vim k key in list bindings", () => {
    const input = { key: "k", ctrl: false, shift: false, meta: false };
    const action = findKeyAction(input, LIST_KEYBINDINGS);
    expect(action).toBe("moveUp");
  });

  it("should find action for arrow keys in list bindings", () => {
    const input = { key: "downArrow", ctrl: false, shift: false, meta: false };
    const action = findKeyAction(input, LIST_KEYBINDINGS);
    expect(action).toBe("moveDown");
  });

  it("should find action for tab in global bindings", () => {
    const input = { key: "tab", ctrl: false, shift: false, meta: false };
    const action = findKeyAction(input, GLOBAL_KEYBINDINGS);
    expect(action).toBe("nextPane");
  });

  it("should find action for shift+tab in global bindings", () => {
    const input = { key: "tab", ctrl: false, shift: true, meta: false };
    const action = findKeyAction(input, GLOBAL_KEYBINDINGS);
    expect(action).toBe("previousPane");
  });

  it("should find action for colon (command palette)", () => {
    const input = { key: ":", ctrl: false, shift: false, meta: false };
    const action = findKeyAction(input, GLOBAL_KEYBINDINGS);
    expect(action).toBe("openCommandPalette");
  });

  it("should find action for q (quit)", () => {
    const input = { key: "q", ctrl: false, shift: false, meta: false };
    const action = findKeyAction(input, GLOBAL_KEYBINDINGS);
    expect(action).toBe("quit");
  });

  it("should return undefined for unbound key", () => {
    const input = { key: "z", ctrl: false, shift: false, meta: false };
    const action = findKeyAction(input, LIST_KEYBINDINGS);
    expect(action).toBeUndefined();
  });

  it("should find enter for select in list bindings", () => {
    const input = { key: "return", ctrl: false, shift: false, meta: false };
    const action = findKeyAction(input, LIST_KEYBINDINGS);
    expect(action).toBe("selectItem");
  });
});
