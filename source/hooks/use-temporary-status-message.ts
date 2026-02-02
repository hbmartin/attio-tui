import { useCallback, useEffect, useRef, useState } from "react";
import type { StatusMessage } from "../types/status-message.js";

interface UseTemporaryStatusMessageOptions {
  readonly timeoutMs?: number;
}

interface UseTemporaryStatusMessageResult {
  readonly message: StatusMessage | undefined;
  readonly showMessage: (message: StatusMessage) => void;
  readonly clearMessage: () => void;
}

export function useTemporaryStatusMessage({
  timeoutMs = 3000,
}: UseTemporaryStatusMessageOptions = {}): UseTemporaryStatusMessageResult {
  const [message, setMessage] = useState<StatusMessage | undefined>();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const clearMessage = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setMessage(undefined);
  }, []);

  const showMessage = useCallback(
    (nextMessage: StatusMessage) => {
      setMessage(nextMessage);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setMessage(undefined);
        timeoutRef.current = undefined;
      }, timeoutMs);
    },
    [timeoutMs],
  );

  useEffect(
    () => () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  return { message, showMessage, clearMessage };
}
