import { useSyncExternalStore } from "react";

/** Returns `false` during SSR and the first client render, `true` after hydration. */
export const useIsMounted = (): boolean =>
	useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	);
