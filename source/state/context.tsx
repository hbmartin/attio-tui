import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import { type ActionLogEntry, ActionLogger } from "../utils/action-logger.js";
import {
  type AppAction,
  type AppState,
  appReducer,
  createInitialAppState,
} from "./app-state.js";

interface AppContextValue {
  readonly state: AppState;
  readonly dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  readonly children: ReactNode;
  readonly initialState?: AppState;
  readonly onStateChange?: (state: AppState) => void;
}

export function AppProvider({
  children,
  initialState,
  onStateChange,
}: AppProviderProps) {
  const [state, rawDispatch] = useReducer(
    appReducer,
    initialState ?? createInitialAppState(),
  );

  const stateRef = useRef(state);

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Notify test handles of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  const instrumentedDispatch = useCallback((action: AppAction) => {
    const before = stateRef.current;
    rawDispatch(action);
    // Record after dispatch — stateRef will update in the next render,
    // so we compute the expected next state synchronously via the reducer
    const after = appReducer(before, action);
    ActionLogger.record(action, before, after);
  }, []);

  return (
    <AppContext.Provider value={{ state, dispatch: instrumentedDispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppState(): AppState {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppState must be used within an AppProvider");
  }
  return context.state;
}

export function useAppDispatch(): React.Dispatch<AppAction> {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppDispatch must be used within an AppProvider");
  }
  return context.dispatch;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}

export function useActionHistory(): readonly ActionLogEntry[] {
  return ActionLogger.getEntries();
}
