export type ImageSource = {
	srcSet: string;
	/** Art-direction media query, e.g. "(min-width: 768px)". */
	media?: string;
	/** MIME type, e.g. "image/webp". */
	type?: string;
	/**
	 * Intrinsic size of THIS candidate. Required whenever the art-directed crop has a
	 * different aspect ratio than the `<img>` fallback: the ratio carried by the `<img>`
	 * `width`/`height` would otherwise be reserved at every breakpoint, so the layout
	 * would still shift once the mobile (or desktop) crop decodes.
	 */
	width?: number;
	height?: number;
};

type ImageBaseProps = {
	/** Image URL. Typed to allow `undefined` (mirrors the native `img` `src`) so that
	 * conditionally-resolved Jahia URLs migrate without call-site assertions. */
	src: string | undefined;
	/** When present, wraps the `<img>` in a `<picture>` with these art-directed sources. */
	sources?: ImageSource[];
	/**
	 * Intrinsic size — reserves space to avoid Cumulative Layout Shift (Core Web Vitals),
	 * and what Lighthouse's `unsized-images` audit looks for.
	 *
	 * `src` is contributed in Jahia, so the runtime file's real size is unknown here: pass the
	 * size of the visual the SLOT is designed for — the dimensions of the reference asset in
	 * `public/images/samples/`, or the box the CSS Module pins (`aspect-ratio`, fixed height).
	 * Both describe the same contract; several rules already encode it literally
	 * (`.insurance-focus__image` is `aspect-ratio: 494 / 282`, its asset is 494x282).
	 *
	 * These are a *hint*, never a constraint: wherever CSS resolves the height to `auto`, the
	 * browser swaps in the decoded file's real ratio, so a visual contributed off-ratio is
	 * still rendered undistorted — the attributes only reserve the space beforehand.
	 */
	width?: number;
	height?: number;
	/** Defaults to "lazy" — the single entry point for the lazy-loading strategy. */
	loading?: "lazy" | "eager";
	fetchPriority?: "high" | "low" | "auto";
	/** Defaults to "async". */
	decoding?: "sync" | "async" | "auto";
	sizes?: string;
	/** Resolution-switching candidates on the `<img>` itself. */
	srcSet?: string;
	/** Forwarded verbatim to the `<img>` — the primitive adds no base class of its own. */
	className?: string;
	/** Optional class on the `<picture>` wrapper (only used when `sources` is set). */
	pictureClassName?: string;
	title?: string;
	draggable?: boolean;
	id?: string;
};

/**
 * `alt` is enforced through a discriminated union on `decorative`:
 * - **Content image** (`decorative` omitted/false) → `alt` is **required** (SEO/a11y discipline).
 * - **Decorative image** (`decorative: true`) → the primitive emits `alt="" + aria-hidden`,
 *   so no `alt` should be passed at the call site.
 */
export type ImageProps = ImageBaseProps &
	(
		| {
				/** Purely decorative image — the primitive renders `alt=""` + `aria-hidden`. */
				decorative: true;
				alt?: never;
		  }
		| {
				decorative?: false;
				/** Required — enforces SEO/a11y discipline. */
				alt: string;
		  }
	);
