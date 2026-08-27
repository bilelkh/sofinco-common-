import type { ReactNode } from "react";

export type HeaderProps = {
	className?: string;
	/** Optional alert band rendered above the header (e.g. sanitary / warning message). */
	alert?: ReactNode;
	/** Main navigation / menu area (includes its own top bar in Jahia). */
	menu: ReactNode;
	/** Mobile-only "download the app" button, shown beneath the menu on small screens. */
	mobileAppButton?: ReactNode;
	/** Hero block rendered below the header chrome. */
	hero?: ReactNode;
};
