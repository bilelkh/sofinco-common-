import { RenderChild } from "@jahia/javascript-modules-library";
import type { FooterPropsServer } from "../footer.types";
import classes from "./footer.module.css";

export function FooterServer(props: FooterPropsServer) {
	return (
		<footer className={`${classes.footer} ${classes.isEdit}`}>
			<div className={classes.container}>
				{props.mainLogoUrl && (
					<div className={classes.mainLogoWrapper}>
						<img src={props.mainLogoUrl} alt="Sofinco" className={classes.mainLogo} />
					</div>
				)}

				<div className={classes.mainGrid}>
					<div className={classes.partnersCol}>
						<div className={classes.editLabel}>{props.partnersTitle}</div>
						<RenderChild name="partners" />
					</div>

					<nav className={classes.categoriesCol}>
						<div className={classes.editLabel}>{props.categoryLinkTitle}</div>
						<RenderChild name="categories" />
					</nav>

					<div className={classes.socialCol}>
						<div className={classes.editLabel}>{props.moreInfosTitle}</div>

						<div className={classes.appSection}>
							<RenderChild name="qrCode" />
						</div>

						<div className={classes.socialLinksWrapper}>
							<div className={classes.editLabel}>{props.socialTitle}</div>
							<div className={classes.socialIcons}>
								<RenderChild name="socialLinks" />
							</div>
						</div>

						<RenderChild name="avisClients" />
					</div>
				</div>

				<div className={classes.bottomBar}>
					<div className={classes.legalLinks}>
						<div className={classes.editLabel}>{props.bottomSubtitle}</div>
						<RenderChild name="bottomLinks" />
					</div>

					{props.legalMention && (
						<div
							className={classes.legalText}
							// Rich-text HTML géré dans Jahia — injection volontaire
							// eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml
							dangerouslySetInnerHTML={{ __html: props.legalMention }}
						/>
					)}
				</div>
			</div>
		</footer>
	);
}
