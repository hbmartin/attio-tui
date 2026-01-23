// Command palette command types

export interface Command {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly shortcut?: string;
  readonly action: CommandAction;
}

export type CommandAction =
  | { readonly type: "navigation"; readonly target: NavigationTarget }
  | { readonly type: "action"; readonly actionId: ActionId }
  | { readonly type: "toggle"; readonly toggleId: ToggleId }
  | { readonly type: "webhook"; readonly webhookAction: WebhookActionId };

export type NavigationTarget =
  | "companies"
  | "people"
  | "notes"
  | "tasks"
  | "meetings"
  | "webhooks";

export type ActionId =
  | "copyId"
  | "openInBrowser"
  | "refresh"
  | "exportJson"
  | "help"
  | "columns"
  | "quit";

export type ToggleId = "debug";

export type WebhookActionId = "create" | "edit" | "delete";
