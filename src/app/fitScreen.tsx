import { createContext, type ReactNode, useContext, useLayoutEffect, useMemo, useState } from "react";

interface FitScreen {
  readonly fit: boolean;
  readonly setFit: (fit: boolean) => void;
}

const FitScreenContext = createContext<FitScreen>({ fit: false, setFit: () => undefined });

export function FitScreenProvider({ children }: { readonly children: ReactNode }) {
  const [fit, setFit] = useState(false);
  const value = useMemo(() => ({ fit, setFit }), [fit]);
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
