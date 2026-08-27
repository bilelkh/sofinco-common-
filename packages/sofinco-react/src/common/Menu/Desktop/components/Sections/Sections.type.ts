import type { MenuProps } from "@common/Menu/Menu.type";

export type SectionsProps = Omit<MenuProps, "links" | "logo">;
