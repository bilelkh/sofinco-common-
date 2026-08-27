import clsx from "clsx";
import styles from "./SeoBlock.module.css";
import type { SeoBlockProps } from "./SeoBlock.type";
import { sanitizeHtml } from "@utils/sanitizeHtml";
import Title from "@shared/ui/Title";

const SeoBlock = ({ className, title, sections, isCentered }: SeoBlockProps) => {
	const mainClassName = clsx(
		styles["seoblock"],
		{ [styles["seoblock--centered"]]: isCentered },
		className,
	);

	return (
		<section className={mainClassName}>
			<Title {...title} className={clsx(styles["seoblock__title"])}>
				{title.children}
			</Title>
			{sections.length > 0 && (
				<div className={styles["seoblock__wrapper"]}>
					{sections.map((section) => (
						<div
							key={section.id}
							className={clsx(
								styles["seoblock__content"],
								styles[`seoblock__content--${section.color}`],
							)}
							style={{ color: section.color }}
							dangerouslySetInnerHTML={{ __html: sanitizeHtml(section.content) }}
						/>
					))}
				</div>
			)}
		</section>
	);
};

export default SeoBlock;
