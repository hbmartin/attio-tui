import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMMANDS,
  filterCommands,
} from "../../source/constants/commands.js";

describe("filterCommands", () => {
  it("should return all commands for empty query", () => {
    const result = filterCommands(DEFAULT_COMMANDS, "");
    expect(result).toEqual(DEFAULT_COMMANDS);
  });

  it("should return all commands for whitespace query", () => {
    const result = filterCommands(DEFAULT_COMMANDS, "   ");
    expect(result).toEqual(DEFAULT_COMMANDS);
  });

  it("should filter by label", () => {
    const result = filterCommands(DEFAULT_COMMANDS, "companies");
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((cmd) => cmd.label.toLowerCase().includes("companies")),
    ).toBe(true);
  });

  it("should filter by description", () => {
    const result = filterCommands(DEFAULT_COMMANDS, "clipboard");
    expect(result.length).toBeGreaterThan(0);
    expect(
      result.every((cmd) =>
        cmd.description.toLowerCase().includes("clipboard"),
      ),
    ).toBe(true);
  });

  it("should be case insensitive", () => {
    const lowerResult = filterCommands(DEFAULT_COMMANDS, "quit");
    const upperResult = filterCommands(DEFAULT_COMMANDS, "QUIT");
    expect(lowerResult).toEqual(upperResult);
  });

  it("should return empty array when no matches", () => {
    const result = filterCommands(DEFAULT_COMMANDS, "xyznonexistent");
    expect(result).toEqual([]);
  });

  it("should match partial strings", () => {
    const result = filterCommands(DEFAULT_COMMANDS, "go");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("DEFAULT_COMMANDS", () => {
  it("should have navigation commands", () => {
    const navCommands = DEFAULT_COMMANDS.filter(
      (cmd) => cmd.action.type === "navigation",
    );
    expect(navCommands.length).toBeGreaterThan(0);
  });

  it("should have action commands", () => {
    const actionCommands = DEFAULT_COMMANDS.filter(
      (cmd) => cmd.action.type === "action",
    );
    expect(actionCommands.length).toBeGreaterThan(0);
  });

  it("should have toggle commands", () => {
    const toggleCommands = DEFAULT_COMMANDS.filter(
      (cmd) => cmd.action.type === "toggle",
    );
    expect(toggleCommands.length).toBeGreaterThan(0);
  });

  it("should have unique ids", () => {
    const ids = DEFAULT_COMMANDS.map((cmd) => cmd.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("should include goto-lists navigation command", () => {
    const listsCommand = DEFAULT_COMMANDS.find(
      (cmd) => cmd.id === "goto-lists",
    );
    expect(listsCommand).toBeDefined();
    expect(listsCommand?.action).toEqual({
      type: "navigation",
      target: "lists",
    });
  });
});
