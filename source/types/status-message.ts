export type StatusMessageTone = "info" | "error";

export interface StatusMessage {
  readonly text: string;
  readonly tone: StatusMessageTone;
}
