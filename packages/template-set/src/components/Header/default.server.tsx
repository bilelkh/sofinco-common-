import {
	jahiaComponent,
	RenderChild,
	AbsoluteArea,
	Island,
} from "@jahia/javascript-modules-library";
import classes from "./component.module.css";

import { imgUrl, getChildNode } from "#lib/jcr";
import { isEditMode } from "#lib/renderContext";
import { getQrAppSettings } from "../../lib/siteConfigs";
import MobileAppBtn from "../QrSticker/MobileAppBtn.client";
import type { QrMobileProps } from "sofinco-react";
import { AlertBand, Header } from "sofinco-react";

jahiaComponent(
	{
		componentType: "view",
		nodeType: "sofnt:header",
		displayName: "Default Header",
	},
	(_, { renderContext, currentNode }) => {
		const site = renderContext.getSite();
		let isAlertActive = false;
		let typeMessage = "";
		let message = "";
		let pictoUrl: string | null = null;
		let textColor: string | null = null;
		let bgColor: string | null = null;

		if (currentNode.isNodeType("sofmix:alert") && currentNode.hasProperty("activate")) {
			isAlertActive = currentNode.getProperty("activate").getBoolean();
			if (isAlertActive) {
				message = currentNode.getPropertyAsString("message") ?? "";
				typeMessage = currentNode.getPropertyAsString("typeMessage") ?? "";
				if (currentNode.hasProperty("textColor")) {
					textColor = currentNode.getPropertyAsString("textColor");
				}
				if (currentNode.hasProperty("bgColor")) {
					bgColor = currentNode.getPropertyAsString("bgColor");
				}
				// `imgUrl` passe par `getPropertyAsNode` qui déclare automatiquement
				// une dépendance de cache sur l'image référencée (via weakref).
				pictoUrl = imgUrl(currentNode, "picto") || null;
			}
		}

		const alertStyle: React.CSSProperties = {};
		if (bgColor) (alertStyle as Record<string, string>)["--alert-band-bg"] = bgColor;
		if (textColor) (alertStyle as Record<string, string>)["--alert-band-fg"] = textColor;

		const props: QrMobileProps | null = getQrAppSettings(site);

		// Shared slots — identical Jahia areas in every mode; only the surrounding chrome differs.
		const alert = isAlertActive ? (
			<AlertBand
				message={message}
				variant={typeMessage === "warning" ? "warning" : "info"}
				style={alertStyle}
				iconLeft={
					pictoUrl ? (
						<img src={pictoUrl} alt="" aria-hidden="true" className={classes.alertPicto} />
					) : undefined
				}
			/>
		) : undefined;

		// `getChildNode` déclare automatiquement `{ node: menuArea }` en cache dep :
		// modification directe du nœud "menu" du site → header invalidé sur toutes
		// les pages qui l'incluent. `AbsoluteArea` gère ensuite les enfants via
		// son propre mécanisme (RenderChildren interne).
		const menuArea = getChildNode(site, "menu");
		const menu = menuArea ? (
			<AbsoluteArea name="menu" parent={menuArea} nodeType="sofnt:navMenu" />
		) : null;

		const mobileAppButton = props ? <Island component={MobileAppBtn} props={props} /> : undefined;

		const hero = <RenderChild name="hero" view="small" />;

		// Edit view: keep the original markup so the Jahia editing chrome stays untouched.
		if (isEditMode(renderContext)) {
			return (
				<div>
					{alert}
					<div className={classes.header}>{menu}</div>
					{mobileAppButton && <div className={classes.mobileOnly}>{mobileAppButton}</div>}
					<div>{hero}</div>
				</div>
			);
		}

		// Preview & live: render through the sofinco-react design-system Header.
		return <Header alert={alert} menu={menu} mobileAppButton={mobileAppButton} hero={hero} />;
	},
);
