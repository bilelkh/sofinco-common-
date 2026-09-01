import type { ProductAdvantageCategory } from "../../ProductAdvantages.type";
import classes from "./ProductAdvantageSlide.module.css";
import Image from "@shared/ui/Image";
import { sanitizeHtml } from "@utils/sanitizeHtml";

export type ProductAdvantageSlideProps = Pick<
	ProductAdvantageCategory,
	"title" | "titleAs" | "text" | "imageDesktop" | "imageMobile" | "imageAlt"
>;

/**
 * Single category slide: one primary image (desktop + mobile WebP)
 * overlaid with an HTML-contributed title and text.
 */
export function ProductAdvantageSlide({
	title,
	titleAs,
	text,
	imageDesktop,
	imageMobile,
	imageAlt,
}: ProductAdvantageSlideProps) {
	// `h3` par défaut : le niveau codé en dur jusqu'ici, pour que les contenus déjà publiés
	// sans choix explicite rendent exactement la même chose.
	const TitleTagEl = titleAs ?? "h3";

	return (
		<article className={classes["product-advantage-slide"]}>
			<Image
				className={classes["product-advantage-slide__image"]}
				pictureClassName={classes["product-advantage-slide__picture"]}
				src={imageMobile}
				alt={imageAlt ?? ""}
				width={298}
				height={650}
				sources={[
					{
						media: "(min-width: 768px)",
						srcSet: imageDesktop,
						type: "image/webp",
						width: 1040,
						height: 560,
					},
				]}
			/>

			<div className={classes["product-advantage-slide__overlay"]}>
				{/* Balise dynamique : le titre est du HTML contribué, donc `dangerouslySetInnerHTML`
				    plutôt que <Title>, qui enveloppe ses enfants dans <FootnoteText>. */}
				<TitleTagEl
					className={classes["product-advantage-slide__title"]}
					dangerouslySetInnerHTML={{ __html: sanitizeHtml(title) }}
				/>
				<div
					className={classes["product-advantage-slide__text"]}
					dangerouslySetInnerHTML={{ __html: sanitizeHtml(text) }}
				/>
			</div>
		</article>
	);
}
