import { createContext, type ReactNode, useCallback, useContext, useLayoutEffect, useMemo, useState } from "react";

interface FitScreen {
  readonly fit: boolean;
  readonly minHeight: number | null;
  readonly setFit: (fit: boolean) => void;
  readonly setMinHeight: (minHeight: number | null) => void;
}

const FitScreenContext = createContext<FitScreen>({
  fit: false,
  minHeight: null,
  setFit: () => undefined,
  setMinHeight: () => undefined,
});

export function FitScreenProvider({ children }: { readonly children: ReactNode }) {
  const [fit, setFitState] = useState(false);
  const [minHeight, setMinHeight] = useState<number | null>(null);
  const setFit = useCallback((next: boolean) => {
    setFitState(next);
    if (!next) {
      setMinHeight(null);
    }
  }, []);
  const value = useMemo(() => ({ fit, minHeight, setFit, setMinHeight }), [fit, minHeight, setFit]);
  return <FitScreenContext.Provider value={value}>{children}</FitScreenContext.Provider>;
}

export function useFitScreen(): void {
  const { setFit } = useContext(FitScreenContext);
  useLayoutEffect(() => {
    setFit(true);
    return () => setFit(false);
  }, [setFit]);
}

export function useIsFitScreen(): boolean {
  return useContext(FitScreenContext).fit;
}

export function useFitMinHeight(): number | null {
  return useContext(FitScreenContext).minHeight;
}

export function useReportFitMinHeight(): (minHeight: number | null) => void {
  return useContext(FitScreenContext).setMinHeight;
}
