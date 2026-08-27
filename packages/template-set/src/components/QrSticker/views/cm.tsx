import type { QrProps } from "sofinco-react";
import classes from "./qr.module.css";
import { QrCode } from "sofinco-react";

import { useAppTranslation } from "#lib/i18n";

export default function CM(props: Readonly<QrProps>) {
	const { t } = useAppTranslation();
	const editBorderClass = props.isActive ? classes.editActive : classes.editDisabled;
	return (
		<div className={[classes.qrBlock, editBorderClass].join(" ").trim()}>
			{props.isActive ? (
				<div className={classes.activedBadge}>{t("qrSticker.active")}</div>
			) : (
				<div className={classes.disabledBadge}>{t("qrSticker.disable")}</div>
			)}
			{/* `alwaysVisible` : l'aperçu jContent vit dans une iframe souvent plus étroite que le
			    seuil d'affichage du QR. Sans ça le contributeur qui vient de choisir une image ne
			    verrait que le badge d'état, et croirait sa configuration cassée. */}
			<QrCode {...props} alwaysVisible />
		</div>
	);
}
