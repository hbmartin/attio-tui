import { render } from "ink-testing-library";
import { describe, expect, it } from "vitest";
import { SdkView } from "../../../source/components/detail/sdk-view.js";
import type { ResultItem } from "../../../source/types/navigation.js";

describe("SdkView", () => {
  it("shows placeholder when no item is selected", () => {
    const instance = render(<SdkView item={undefined} />);

    try {
      expect(instance.lastFrame()).toContain(
        "// Select an item to view SDK code",
      );
    } finally {
      instance.cleanup();
    }
  });

  it("renders records.get for object items", () => {
    const item: ResultItem = {
      type: "object",
      id: "rec-123",
      title: "Acme Corp",
      data: {
        id: "rec-123",
        objectId: "obj-companies",
        values: {},
        createdAt: "2024-01-01T00:00:00.000Z",
        webUrl: "https://app.attio.com/acme",
      },
    };

    const instance = render(<SdkView item={item} />);

    try {
      const frame = instance.lastFrame() ?? "";
      expect(frame).toContain("records.get");
      expect(frame).toContain('object: "obj-companies"');
      expect(frame).toContain('recordId: "rec-123"');
    } finally {
      instance.cleanup();
    }
  });

  it("renders lists.entries.query for list items", () => {
    const item: ResultItem = {
      type: "list",
      id: "list-456",
      title: "Sales Pipeline",
      data: {
        id: "list-456",
        apiSlug: "sales-pipeline",
        name: "Sales Pipeline",
        parentObject: "companies",
      },
    };

    const instance = render(<SdkView item={item} />);

    try {
      const frame = instance.lastFrame() ?? "";
      expect(frame).toContain("lists.entries.query");
      expect(frame).toContain('listId: "list-456"');
    } finally {
      instance.cleanup();
    }
  });

  it("renders statuses.list for list-status items", () => {
    const item: ResultItem = {
      type: "list-status",
      id: "status-789",
      title: "In Progress",
      data: {
        statusId: "status-789",
        attributeId: "attr-stage",
        title: "In Progress",
        isArchived: false,
        celebrationEnabled: false,
        targetTimeInStatus: null,
      },
    };

    const instance = render(<SdkView item={item} />);

    try {
      const frame = instance.lastFrame() ?? "";
      expect(frame).toContain("statuses.list");
      expect(frame).toContain('attribute: "attr-stage"');
      // Should NOT contain listId — status items don't carry it
      expect(frame).not.toContain("listId");
    } finally {
      instance.cleanup();
    }
  });

  it("renders lists.entries.get for list-entry items", () => {
    const item: ResultItem = {
      type: "list-entry",
      id: "entry-abc",
      title: "Deal #42",
      data: {
        id: "entry-abc",
        listId: "list-456",
        parentRecordId: "rec-parent",
        values: {},
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    };

    const instance = render(<SdkView item={item} />);

    try {
      const frame = instance.lastFrame() ?? "";
      expect(frame).toContain("lists.entries.get");
      expect(frame).toContain('listId: "list-456"');
      expect(frame).toContain('entryId: "entry-abc"');
    } finally {
      instance.cleanup();
    }
  });

  it("renders notes.get for note items", () => {
    const item: ResultItem = {
      type: "notes",
      id: "note-111",
      title: "Meeting Notes",
      data: {
        id: "note-111",
        parentObject: "companies",
        parentRecordId: "rec-parent",
        title: "Meeting Notes",
        contentPlaintext: "Some notes",
        createdAt: "2024-01-01T00:00:00.000Z",
        createdByType: "workspace-member",
        createdById: "wm-1",
      },
    };

    const instance = render(<SdkView item={item} />);

    try {
      const frame = instance.lastFrame() ?? "";
      expect(frame).toContain("notes.get");
      expect(frame).toContain('noteId: "note-111"');
    } finally {
      instance.cleanup();
    }
  });

  it("renders tasks.get for task items", () => {
    const item: ResultItem = {
      type: "tasks",
      id: "task-222",
      title: "Follow up",
      data: {
        id: "task-222",
        content: "Follow up with client",
        deadlineAt: "2024-02-01T00:00:00.000Z",
        isCompleted: false,
        assignees: [],
        linkedRecords: [],
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    };

    const instance = render(<SdkView item={item} />);

    try {
      const frame = instance.lastFrame() ?? "";
      expect(frame).toContain("tasks.get");
      expect(frame).toContain('taskId: "task-222"');
    } finally {
      instance.cleanup();
    }
  });

  it("renders meetings.get for meeting items", () => {
    const item: ResultItem = {
      type: "meetings",
      id: "mtg-333",
      title: "Team Standup",
      data: {
        id: "mtg-333",
        title: "Team Standup",
        description: "Daily standup",
        startAt: "2024-01-01T09:00:00.000Z",
        endAt: "2024-01-01T09:15:00.000Z",
        participants: [],
      },
    };

    const instance = render(<SdkView item={item} />);

    try {
      const frame = instance.lastFrame() ?? "";
      expect(frame).toContain("meetings.get");
      expect(frame).toContain('meetingId: "mtg-333"');
    } finally {
      instance.cleanup();
    }
  });

  it("renders webhooks.get for webhook items", () => {
    const item: ResultItem = {
      type: "webhooks",
      id: "wh-444",
      title: "My Webhook",
      data: {
        id: "wh-444",
        targetUrl: "https://example.com/hook",
        status: "active",
        subscriptions: [],
        createdAt: "2024-01-01T00:00:00.000Z",
      },
    };

    const instance = render(<SdkView item={item} />);

    try {
      const frame = instance.lastFrame() ?? "";
      expect(frame).toContain("webhooks.get");
      expect(frame).toContain('webhookId: "wh-444"');
    } finally {
      instance.cleanup();
    }
  });
});
