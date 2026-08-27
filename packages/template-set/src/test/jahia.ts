// Shared test helpers for the template-set unit tests.
//
// Two things live here:
//   1. `makeNode` — a lightweight stand-in for a Jahia `JCRNodeWrapper`. It implements
//      the slice of the raw JCR API the code actually calls (getProperty/hasProperty/
//      getNodes/getParent/isNodeType…) on top of a plain data bag, so it can drive BOTH
//      the real `src/lib/jcr.ts` helpers AND the data-driven `#lib/jcr` mock below.
//   2. The named `#lib/jcr` mock implementations — data-driven re-implementations of the
//      jcr helpers that read straight from a `makeNode` data bag. A mapper test does
//      `vi.mock("#lib/jcr", () => import("#test/jahia"))` to isolate the mapper from the
//      SSR-bound real helpers.
//
// This module is excluded from coverage (see vitest.config.ts → coverage.exclude).

import type { JCRNodeWrapper } from "org.jahia.services.content";
// Type-only — erased at runtime, so this does not re-enter the module being mocked.
import type { ImageMeta } from "#lib/jcr";

/** A JCR property value as authored in a test fixture. */
export type PropValue =
	| string
	| number
	| boolean
	| JCRNodeWrapper
	| string[]
	| { __millis: number };

export interface NodeOpts {
	id?: string;
	path?: string;
	/** Nom JCR du nœud. Déduit du dernier segment de `path` quand il n'est pas donné. */
	name?: string;
	primaryType?: string;
	nodeTypes?: string[];
	props?: Record<string, PropValue>;
	children?: JCRNodeWrapper[];
	/** Named children, for `getNode(name)` / `getChildNode(node, name)`. */
	named?: Record<string, JCRNodeWrapper>;
	parent?: JCRNodeWrapper;
	/** URL returned by `buildNodeUrl(node)` / `nodeUrl(node)`. */
	url?: string;
	/** Value returned by `getDisplayableName()` — the `alt` fallback for image nodes. */
	displayableName?: string;
}

export interface FakeNode extends NodeOpts {
	__isFakeNode: true;
	__props: Record<string, PropValue>;
	__children: FakeNode[];
	__named: Record<string, FakeNode>;
	__nodeTypes: string[];
	__url?: string;
	getIdentifier(): string;
	getPath(): string;
	getName(): string;
	getPrimaryNodeTypeName(): string;
	getUrl(): string;
	getDisplayableName(): string;
	isNodeType(type: string): boolean;
	getParent(): FakeNode;
	hasProperty(name: string): boolean;
	getProperty(name: string): JcrValue;
	getPropertyAsString(name: string): string;
	hasNode(name: string): boolean;
	getNode(name: string): FakeNode;
	getNodes(): NodeIteratorLike;
}

interface JcrValue {
	getString(): string;
	getLong(): number;
	getDouble(): number;
	getBoolean(): boolean;
	getValues(): Array<{ getString(): string }>;
	getNode(): FakeNode;
	getDate(): { getTimeInMillis(): number };
}

interface NodeIteratorLike extends Iterable<FakeNode> {
	hasNext(): boolean;
	nextNode(): FakeNode;
}

const isNode = (v: unknown): v is FakeNode =>
	typeof v === "object" && v !== null && (v as { __isFakeNode?: boolean }).__isFakeNode === true;

function jcrValue(raw: PropValue): JcrValue {
	return {
		getString: () => (isNode(raw) ? raw.getIdentifier() : String(raw)),
		getLong: () => {
			const n = Number(raw);
			if (!Number.isFinite(n)) throw new Error("not a number");
			return Math.trunc(n);
		},
		getDouble: () => {
			const n = Number(raw);
			if (!Number.isFinite(n)) throw new Error("not a number");
			return n;
		},
		getBoolean: () => raw === true || raw === "true",
		getValues: () =>
			(Array.isArray(raw) ? raw : [raw]).map((v) => ({ getString: () => String(v) })),
		getNode: () => {
			if (isNode(raw)) return raw;
			throw new Error("property is not a reference");
		},
		getDate: () => {
			if (raw && typeof raw === "object" && "__millis" in raw) {
				return { getTimeInMillis: () => raw.__millis };
			}
			throw new Error("property is not a date");
		},
	};
}

/** Builds a minimal fake `JCRNodeWrapper`. Returns it typed as `JCRNodeWrapper` for ergonomics. */
export function makeNode(opts: NodeOpts = {}): JCRNodeWrapper {
	const props = opts.props ?? {};
	const children = (opts.children ?? []) as unknown as FakeNode[];
	const named = (opts.named ?? {}) as unknown as Record<string, FakeNode>;
	const parent = opts.parent as unknown as FakeNode | undefined;
	const nodeTypes = opts.nodeTypes ?? (opts.primaryType ? [opts.primaryType] : []);

	const node: FakeNode = {
		...opts,
		__isFakeNode: true,
		__props: props,
		__children: children,
		__named: named,
		__nodeTypes: nodeTypes,
		__url: opts.url,
		getIdentifier: () => opts.id ?? "id",
		getPath: () => opts.path ?? "/path",
		getName: () => opts.name ?? (opts.path ?? "").split("/").filter(Boolean).pop() ?? "",
		getPrimaryNodeTypeName: () => opts.primaryType ?? nodeTypes[0] ?? "nt:base",
		getUrl: () => opts.url ?? "",
		getDisplayableName: () => opts.displayableName ?? "",
		isNodeType: (type: string) => nodeTypes.includes(type),
		getParent: () => {
			if (!parent) throw new Error("no parent");
			return parent;
		},
		hasProperty: (name: string) => props[name] !== undefined,
		getProperty: (name: string) => jcrValue(props[name]),
		getPropertyAsString: (name: string) => (props[name] != null ? String(props[name]) : ""),
		hasNode: (name: string) => named[name] !== undefined,
		getNode: (name: string) => {
			const child = named[name];
			if (!child) throw new Error(`no child ${name}`);
			return child;
		},
		getNodes: () => {
			let i = 0;
			return {
				hasNext: () => i < children.length,
				nextNode: () => children[i++],
				[Symbol.iterator]: () => children[Symbol.iterator](),
			};
		},
	};

	return node as unknown as JCRNodeWrapper;
}

// ── Data-driven `#lib/jcr` mock implementations ──────────────────────────────
// Read straight from the makeNode data bag. Stateless (no per-test reset needed).

const bag = (node: unknown) => node as unknown as FakeNode;

export const str = (node: JCRNodeWrapper, prop: string, fallback = ""): string => {
	const v = bag(node).__props?.[prop];
	return v == null ? fallback : String(v);
};

export const strList = (node: JCRNodeWrapper, prop: string): string[] => {
	const v = bag(node).__props?.[prop];
	return Array.isArray(v) ? v.map(String) : [];
};

export const strLimit = (
	node: JCRNodeWrapper,
	prop: string,
	limit: number,
	fallback = "",
): string => {
	const v = bag(node).__props?.[prop];
	const p = v == null ? fallback : String(v);
	return p ? p.slice(0, limit) : fallback;
};

export const imgUrl = (node: JCRNodeWrapper, prop: string): string => {
	const v = bag(node).__props?.[prop];
	if (v == null) return "";
	return isNode(v) ? (v.__url ?? "") : String(v);
};

export const imgMeta = (node: JCRNodeWrapper, prop: string): ImageMeta | null => {
	const referenced = getPropertyAsNode(node, prop);
	if (!referenced) return null;
	return {
		url: bag(referenced).__url ?? "",
		width: num(referenced, "j:width"),
		height: num(referenced, "j:height"),
		alt: referenced.getDisplayableName(),
	};
};

export const vidUrl = imgUrl;

export const nodeUrl = (node: JCRNodeWrapper, prop?: string): string => {
	if (prop) return imgUrl(node, prop);
	return bag(node).__url ?? "";
};

export const getChildNode = (node: JCRNodeWrapper, name: string): JCRNodeWrapper | null =>
	(bag(node).__named?.[name] as unknown as JCRNodeWrapper) ?? null;

export const getPropertyAsNode = (node: JCRNodeWrapper, prop: string): JCRNodeWrapper | null => {
	const v = bag(node).__props?.[prop];
	return isNode(v) ? (v as unknown as JCRNodeWrapper) : null;
};

export const num = (node: JCRNodeWrapper, prop: string, fallback = 0): number => {
	const v = bag(node).__props?.[prop];
	if (v == null) return fallback;
	const n = Number(v);
	return Number.isFinite(n) ? n : fallback;
};

export const getDouble = num;

export const DEFAULT_DATE_FORMATTER = new Intl.DateTimeFormat("fr-FR", {
	day: "numeric",
	month: "long",
	year: "numeric",
});

// Fixture d'une date : `props: { publishDate: { __millis: Date.UTC(2026, 1, 18) } }`.
export const getDate = (
	node: JCRNodeWrapper,
	prop: string,
	formatter: Intl.DateTimeFormat = DEFAULT_DATE_FORMATTER,
): { display: string; iso: string } => {
	const v = bag(node).__props?.[prop];
	if (v == null || typeof v !== "object" || !("__millis" in v)) return { display: "", iso: "" };
	const date = new Date(v.__millis);
	// Même calendrier local que `#lib/jcr` — surtout pas `toISOString()`, qui
	// décalerait d'un jour toute date saisie à minuit dans un fuseau à l'est d'UTC.
	const pad = (value: number) => String(value).padStart(2, "0");
	return {
		display: formatter.format(date),
		iso: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
	};
};

export const getChildNodesByType = (node: JCRNodeWrapper, type: string): JCRNodeWrapper[] =>
	(bag(node).__children ?? []).filter((c) =>
		c.__nodeTypes?.includes(type),
	) as unknown as JCRNodeWrapper[];

export const getAsBoolean = (node: JCRNodeWrapper, prop: string, fallback = false): boolean => {
	const v = bag(node).__props?.[prop];
	return v == null ? fallback : v === true || v === "true";
};

export const hasMixin = (node: JCRNodeWrapper, mixin: string): boolean =>
	(bag(node).__nodeTypes ?? []).includes(mixin);

export const findChildByType = (parent: JCRNodeWrapper, type: string): JCRNodeWrapper | null =>
	((bag(parent).__children ?? []).find((c) => c.__nodeTypes?.includes(type)) as unknown as
		| JCRNodeWrapper
		| undefined) ?? null;

// Mirrors the real helper's wrapper resolution: by NAME (`named` bag) when `wrapperName`
// is given — required when several wrappers share one type, e.g. leftFeatures /
// rightFeatures — and by TYPE (`children` bag) otherwise.
export const getWrapperItems = (
	parent: JCRNodeWrapper,
	wrapperType: string,
	itemType: string,
	wrapperName?: string,
): JCRNodeWrapper[] => {
	const wrapper = wrapperName
		? bag(parent).__named?.[wrapperName]
		: (bag(parent).__children ?? []).find((c) => c.__nodeTypes?.includes(wrapperType));
	if (!wrapper) return [];
	return (wrapper.__children ?? []).filter((c) =>
		c.__nodeTypes?.includes(itemType),
	) as unknown as JCRNodeWrapper[];
};

export const findAncestor = (
	node: JCRNodeWrapper,
	nodeType = "jnt:page",
): JCRNodeWrapper | null => {
	let current: FakeNode | undefined = bag(node);
	while (current) {
		if (current.__nodeTypes?.includes(nodeType)) return current as unknown as JCRNodeWrapper;
		current = current.parent ? bag(current.parent) : undefined;
	}
	return null;
};

export const getAncestorUrl = (node: JCRNodeWrapper, nodeType = "jnt:page"): string => {
	const a = findAncestor(node, nodeType);
	return a ? (bag(a).__url ?? "") : "";
};

// Settings/context-bound helpers — not data-derivable from a single node. Tests that need
// real behaviour (qr/avis stickers, tracking) provide a bespoke `vi.mock` instead.
export const getGlobalSettingsNode = (): JCRNodeWrapper | null => null;

// Mirrors the real `getCurrentPageNode`: reads the render context main resource node
// and walks up to its `jnt:page` ancestor. Driven by a `{ getMainResource }` stub.
export const getCurrentPageNode = (renderContext: {
	getMainResource(): { getNode(): JCRNodeWrapper };
}): JCRNodeWrapper | null => {
	try {
		const main = renderContext.getMainResource().getNode();
		return findAncestor(main, "jnt:page");
	} catch {
		return null;
	}
};
