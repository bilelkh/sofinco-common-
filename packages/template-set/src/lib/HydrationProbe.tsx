import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

interface State {
  err?: Error;
}

let globalListenerInstalled = false;

function installGlobalListener() {
  if (globalListenerInstalled) return;
  if (typeof window === "undefined") return;
  globalListenerInstalled = true;

  // Snapshot every <jsm-island>'s server-rendered innerHTML on the next tick
  // (after Jahia's runtime has placed them, before React hydrates). Then on
  // the first hydration error, dump which island differs from its snapshot.
  const snapshots = new Map<HTMLElement, string>();
  queueMicrotask(() => {
    document.querySelectorAll("jsm-island").forEach((el) => {
      snapshots.set(el as HTMLElement, (el as HTMLElement).innerHTML);
    });
    console.info(
      `[HydrationProbe] snapshotted ${snapshots.size} <jsm-island> roots on the page`,
    );
  });

  function dumpIslandDrift() {
    snapshots.forEach((before, el) => {
      const after = el.innerHTML;
      if (before !== after) {
        console.error(
          "[HydrationProbe:island-drift]",
          "data-src=",
          el.getAttribute("data-src"),
          "\n--- server HTML (first 400 chars) ---\n",
          before.slice(0, 400),
          "\n--- client HTML (first 400 chars) ---\n",
          after.slice(0, 400),
        );
      }
    });
  }

  window.addEventListener("error", (event) => {
    const msg = event.error?.message ?? event.message ?? "";
    if (msg.includes("Minified React error") || msg.includes("Hydration")) {
      console.error(
        "[HydrationProbe:window.error]",
        msg,
        "filename=",
        event.filename,
        "stack=",
        event.error?.stack,
      );
      dumpIslandDrift();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message ?? String(event.reason);
    if (msg.includes("Minified React error") || msg.includes("Hydration")) {
      console.error(
        "[HydrationProbe:unhandledrejection]",
        msg,
        "stack=",
        event.reason?.stack,
      );
      dumpIslandDrift();
    }
  });
}

export class HydrationProbe extends Component<Props, State> {
  state: State = {};

  constructor(props: Props) {
    super(props);
    installGlobalListener();
  }

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error(
      `[HydrationProbe:${this.props.label}]`,
      err.message,
      info.componentStack,
    );
  }

  render() {
    if (this.state.err) return null;
    return this.props.children;
  }
}
