import { RenderChild } from "@jahia/javascript-modules-library";
import { Title, Subtitle } from "sofinco-react";
import type { ProductFocusProps } from "sofinco-react";
import classes from "./component.module.css";
import { clsx } from "clsx";

/**
 * Edit-mode preview — reproduces the live layout (heading, split 3 columns
 * around a central image, contributor-picked background color) so the
 * contributor sees a faithful WYSIWYG. Each side is editable inline via
 * `<RenderChild name="leftFeatures" | "rightFeatures" />` — the wrappers are
 * autocreated, so they always exist.
 *
 * **Image placeholder** — on autocreation the `image` weakreference is empty
 * (mandatory for publication, but a fresh node lands with no value). A dashed
 * placeholder invites the contributor to pick an image ; once contributed,
 * the `<img>` replaces it.
 *
 * When ProductFocus is embedded in `sofnt:arrayFocusWrapper`, the parent's
 * jContent view uses `<RenderChild>` — so this server view still renders,
 * heading and all. The properties hints (`sofnt_productFocus.jcr_title.ui.label.description`)
 * tell the contributor NOT to fill title/subtitle in that context.
 */
export default function ProductFocusServer(props: ProductFocusProps) {
	return (
		<section
			className={clsx("product-focus", classes.editPreview)}
			style={{ backgroundColor: props.backgroundColor || "#f5f9fc" }}
		>
			{(props.title || props.subtitle) && (
				<header className={classes.editHeader}>
					{props.title && <Title {...props.title} />}
					{props.subtitle && <Subtitle>{props.subtitle}</Subtitle>}
				</header>
			)}

			<div className={classes.editGrid}>
				<div className={classes.editColumn}>
					<p className={classes.editColumnTitle}>Arguments — colonne gauche</p>
					<ul className={classes.editList}>
						<RenderChild name="leftFeatures" />
					</ul>
				</div>

				<div className={classes.editImageWrapper}>
					{props.imageSrc ? (
						<img src={props.imageSrc} alt="" className={classes.editImage} loading="lazy" />
					) : (
						<p className={classes.editImagePlaceholder} role="status">
							<span className={classes.editImagePlaceholderIcon} aria-hidden="true">
								🖼️
							</span>
							<span>
								<strong>Focus produit — Image manquante</strong>
								<br />
								Ouvrez le formulaire d'édition et sélectionnez le mockup produit (champ « Image
								centrale »).
							</span>
						</p>
					)}
				</div>

				<div className={classes.editColumn}>
					<p className={classes.editColumnTitle}>Arguments — colonne droite</p>
					<ul className={classes.editList}>
						<RenderChild name="rightFeatures" />
					</ul>
				</div>
			</div>
		</section>
	);
}
