import type { ProductAdvantageCategory } from "../../ProductAdvantages.type";
import classes from "./ProductAdvantageSlide.module.css";
import Image from "@shared/ui/Image";
import { sanitizeHtml } from "@utils/sanitizeHtml";

export type ProductAdvantageSlideProps = Pick<
	ProductAdvantageCategory,
	"title" | "text" | "imageDesktop" | "imageMobile" | "imageAlt"
>;

/**
 * Single category slide: one primary image (desktop + mobile WebP)
 * overlaid with an HTML-contributed title and text.
 */
export function ProductAdvantageSlide({
	title,
	text,
	imageDesktop,
	imageMobile,
	imageAlt,
}: ProductAdvantageSlideProps) {
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
				<h3
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
