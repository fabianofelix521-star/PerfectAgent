import { useEffect, useState } from "react";
import { webContainerEngine } from "../engine/WebContainerEngine";
import type { EngineState } from "../types";

export interface UseWebContainerResult {
  engine: typeof webContainerEngine;
  state: EngineState;
  init: () => Promise<void>;
  teardown: () => Promise<void>;
}

export function useWebContainer(autoInit = false): UseWebContainerResult {
  const [state, setState] = useState<EngineState>(() =>
    webContainerEngine.getState(),
  );

  useEffect(() => {
    const off = webContainerEngine.on({
      onBoot: () => setState(webContainerEngine.getState()),
      onServerReady: () => setState(webContainerEngine.getState()),
      onError: () => setState(webContainerEngine.getState()),
    });
    setState(webContainerEngine.getState());
    return off;
  }, []);

  useEffect(() => {
    if (!autoInit) return;
    let cancelled = false;
    void webContainerEngine.init().then(() => {
      if (!cancelled) setState(webContainerEngine.getState());
    });
    return () => {
      cancelled = true;
    };
  }, [autoInit]);

  return {
    engine: webContainerEngine,
    state,
    init: () => webContainerEngine.init(),
    teardown: () => webContainerEngine.teardown(),
  };
}
