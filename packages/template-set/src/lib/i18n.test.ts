import { describe, it, expect, vi } from "vitest";

vi.mock("react-i18next", () => ({
	useTranslation: vi.fn(() => ({ t: (k: string) => `t:${k}`, i18n: { language: "fr" } })),
}));

import { useTranslation } from "react-i18next";
import { useAppTranslation } from "./i18n";

describe("useAppTranslation", () => {
	it("scopes translation to the sofinco-template namespace and exposes the current language", () => {
		const { t, currentLang } = useAppTranslation();
		expect(t("hello")).toBe("t:hello");
		expect(currentLang).toBe("fr");
		expect(useTranslation).toHaveBeenCalledWith("sofinco-template");
	});
});
