import { useTranslation } from "react-i18next";

// On centralise le nom du module (Namespace).
const MODULE_NAMESPACE = "sofinco-template";

/**
 * Custom hook d'internationalisation dédié au module Sofinco.
 */
export const useAppTranslation = () => {
	const { t, i18n } = useTranslation(MODULE_NAMESPACE);

	return {
		t,
		currentLang: i18n.language,
	};
};

export type TFunction = (key: string, params?: Record<string, string>) => string;
