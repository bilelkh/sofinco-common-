import type { ImageProps } from "./Image.type";

/**
 * Single entry point for every content image in the design system.
 *
 * Renders a semantic `<img>` (or `<picture>` when art-directed `sources` are given)
 * with SEO/perf-sane defaults (`loading="lazy"`, `decoding="async"`). It owns **no
 * visual CSS** — the consumer's `className` is forwarded verbatim, so migrating a raw
 * `<img>` to `<Image>` is byte-identical. Centralizing here means future tuning
 * (IntersectionObserver lazy-loading, blur-up placeholders, Jahia rendition `srcset`)
 * is a one-file change rather than a call-site sweep.
 */
export default function Image({
	src,
	alt,
	decorative,
	sources,
	width,
	height,
	loading = "lazy",
	decoding = "async",
	fetchPriority,
	sizes,
	srcSet,
	className,
	pictureClassName,
	title,
	draggable,
	id,
}: ImageProps) {
	const img = (
		<img
			id={id}
			src={src}
			alt={decorative ? "" : alt}
			aria-hidden={decorative ? true : undefined}
			width={width}
			height={height}
			loading={loading}
			decoding={decoding}
			fetchPriority={fetchPriority}
			sizes={sizes}
			srcSet={srcSet}
			title={title}
			draggable={draggable}
			className={className}
		/>
	);

	if (sources?.length) {
		return (
			<picture className={pictureClassName}>
				{sources.map((source) => (
					<source
						key={`${source.media ?? ""}|${source.type ?? ""}|${source.srcSet}`}
						media={source.media}
						srcSet={source.srcSet}
						type={source.type}
						width={source.width}
						height={source.height}
					/>
				))}
				{img}
			</picture>
		);
	}

	return img;
}
