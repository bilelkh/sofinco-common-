import { server } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";

/**
 * Fully-qualified class name of the Java OSGi bridge that exposes
 * portal-common-sofinco's ReviewService to the JS modules engine.
 */
export const REVIEW_SERVICE_BRIDGE = "ch.sofinco.core.bridge.ReviewServiceBridge";

/**
 * Shape of {@code ch.sofinco.core.bridge.ReviewServiceBridge}. Helper for
 * call sites — `server.osgi.getService` itself returns `any`.
 */
export interface ReviewServiceBridge {
	/**
	 * Returns the `nbReview` most recent reviews. The return type is deliberately
	 * `ArrayLike` and not `Array`: GraalVM surfaces the Java `List` as an indexed
	 * polyglot proxy, without any of `Array.prototype`. Run it through `toArray`
	 * before iterating — `.map()` / `.filter()` on the raw value throw at runtime.
	 */
	fetchReviews(
		nbReview: number,
		product: string,
		minNote: number,
		config: JCRNodeWrapper,
	): ArrayLike<JavaRecord> | null;
	getAverageRate(config: JCRNodeWrapper): { average: number; nbReview: number } | null;
}

/**
 * Looks up the ReviewServiceBridge OSGi service. Returns null when the
 * service isn't registered (e.g. portal-common-sofinco bundle not active).
 */
export function getReviewServiceBridge(): ReviewServiceBridge | null {
	const svc = server.osgi.getService(REVIEW_SERVICE_BRIDGE) as ReviewServiceBridge | null;
	return svc ?? null;
}

/**
 * Helpers for consuming Java objects returned from OSGi services
 * (via `server.osgi.getService(...)`).
 *
 * <p>The Jahia javascript-modules-engine surfaces Java collections to JS as
 * polyglot proxies: a `Map<String,Object>` reads like a plain JS object with
 * string keys, a `List` reads like an array (`.length` + indexed access).
 * However, the *values* inside those structures are still Java types
 * (`java.lang.Integer`, `java.lang.Double`, `java.lang.String`, etc.) and
 * occasionally surface as polyglot proxies rather than primitive JS values.
 * These helpers force-coerce them to JS primitives and provide safe defaults
 * so calling code stays terse.</p>
 *
 * <p>Use them whenever you flatten a Java POJO or a Jackson `JsonNode` to
 * `Map<String, Object>` on the Java side before crossing into JS.</p>
 */

export type JavaRecord = Record<string, unknown>;

/**
 * Read a string member from a Java-backed record. Returns `""` when the value
 * is `null` / `undefined`.
 */
export function readString(record: JavaRecord, key: string): string {
	const value = record[key];
	return value == null ? "" : String(value);
}

/**
 * Read a numeric member from a Java-backed record. Returns `0` when the value
 * is missing or non-finite. Handles the case where the value arrives as a
 * Java `Number` proxy (forced through `Number(...)`).
 */
export function readNumber(record: JavaRecord, key: string): number {
	const value = record[key];
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? n : 0;
}

/**
 * Read a boolean member from a Java-backed record. Returns `false` when the
 * value is missing; coerces `"true"` / `"false"` strings (Jackson sometimes
 * serializes booleans as text).
 */
export function readBoolean(record: JavaRecord, key: string): boolean {
	const value = record[key];
	if (typeof value === "boolean") return value;
	if (typeof value === "string") return value.toLowerCase() === "true";
	return false;
}

/**
 * Convert a Java `List<T>` (surfaced by the GraalVM engine as an array-like
 * polyglot proxy — `.length` + indexed access, but NOT a real JS array) into a
 * plain JS array. Returns `[]` for null/undefined or anything non-iterable.
 *
 * The indexed loop below is deliberate and must NOT become a `for...of`: the
 * proxy carries no `@@iterator`, so `for...of` throws `TypeError: … is not
 * iterable` on the very shape this branch exists to handle. `Array.from` is
 * kept as the *other* branch, for iterables that have no numeric `length`.
 *
 * Use this before mapping over `someBean.getResults()` etc. — `list.size()` /
 * `list.get(i)` / `Array.from(list)` are unreliable across the bridge.
 */
export function toArray<T>(javaList: unknown): T[] {
	if (!javaList) return [];
	if (Array.isArray(javaList)) return javaList as T[];
	const a = javaList as ArrayLike<T>;
	if (typeof a.length === "number") {
		const out: T[] = [];
		for (let i = 0; i < a.length; i++) out.push(a[i]);
		return out;
	}
	try {
		return Array.from(javaList as Iterable<T>);
	} catch {
		return [];
	}
}
