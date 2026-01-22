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
  | { readonly type: "toggle"; readonly toggleId: ToggleId };

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
  | "quit";

export type ToggleId = "debug";
