import { createContext, type ReactNode, useContext, useReducer } from "react";
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
}

export function AppProvider({ children, initialState }: AppProviderProps) {
  const [state, dispatch] = useReducer(
    appReducer,
    initialState ?? createInitialAppState(),
  );

  return (
    <AppContext.Provider value={{ state, dispatch }}>
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
