import DOMPurify from "dompurify";

/**
 * Sanitizes an untrusted HTML string before injecting it through
 * `dangerouslySetInnerHTML`, to prevent XSS from CMS / props content.
 *
 * SSR-safe: when no DOM is available (server render, e.g. GraalVM), DOMPurify
 * is never initialized against a `window`, so `DOMPurify.sanitize` is not a
 * function. We detect that and return the input unchanged. Since injected
 * scripts only execute in the browser, client-side sanitization is what
 * actually neutralizes XSS.
 *
 * Do NOT use this for JSON-LD (`application/ld+json`) or `<script>` payloads:
 * DOMPurify would strip or mangle them.
 */
export function sanitizeHtml(html: string): string {
	if (typeof DOMPurify?.sanitize !== "function") {
		return html;
	}
	return DOMPurify.sanitize(html);
}
