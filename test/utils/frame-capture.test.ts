import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  stripAnsi,
  writeFrameToFile,
} from "../../source/utils/frame-capture.js";

describe("stripAnsi", () => {
  it("strips CSI color sequences", () => {
    expect(stripAnsi("\u001b[32mGreen\u001b[0m")).toBe("Green");
  });

  it("strips bold and underline sequences", () => {
    expect(stripAnsi("\u001b[1mBold\u001b[22m")).toBe("Bold");
    expect(stripAnsi("\u001b[4mUnderline\u001b[24m")).toBe("Underline");
  });

  it("strips cursor movement sequences", () => {
    expect(stripAnsi("\u001b[2J\u001b[HHello")).toBe("Hello");
  });

  it("strips 256-color sequences", () => {
    expect(stripAnsi("\u001b[38;5;196mRed\u001b[0m")).toBe("Red");
  });

  it("strips RGB color sequences", () => {
    expect(stripAnsi("\u001b[38;2;255;0;0mRed\u001b[0m")).toBe("Red");
  });

  it("handles text with no ANSI sequences", () => {
    expect(stripAnsi("plain text")).toBe("plain text");
  });

  it("handles empty string", () => {
    expect(stripAnsi("")).toBe("");
  });

  it("strips multiple sequences in one string", () => {
    const input =
      "\u001b[1m\u001b[32mBold Green\u001b[0m and \u001b[31mRed\u001b[0m";
    expect(stripAnsi(input)).toBe("Bold Green and Red");
  });

  it("strips OSC sequences", () => {
    // OSC sequence terminated by BEL
    expect(stripAnsi("\u001b]0;Title\u0007Text")).toBe("Text");
  });
});

describe("writeFrameToFile", () => {
  it("writes frame text to a file", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "frame-capture-"));

    try {
      const frame = "Line 1\nLine 2\nLine 3";
      const filePath = join(tempDir, "frame.txt");

      await writeFrameToFile(frame, filePath);

      const content = await readFile(filePath, "utf-8");
      expect(content).toBe(frame);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it("creates parent directories if needed", async () => {
    const tempDir = await mkdtemp(join(tmpdir(), "frame-capture-"));

    try {
      const frame = "Frame content";
      const filePath = join(tempDir, "nested", "dir", "frame.txt");

      await writeFrameToFile(frame, filePath);

      const content = await readFile(filePath, "utf-8");
      expect(content).toBe(frame);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
