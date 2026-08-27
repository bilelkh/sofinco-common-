import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { LinkProps } from "sofinco-react";
import { getAsBoolean, getChildNode, str } from "#lib/jcr";

/**
 * Absolute (site-relative) path of the shared Smart Tribune PUSH configuration node.
 * Hardcoded by design — the `spnt:smartPush` config lives at this fixed system name and
 * must not be resolved by "first child" scanning (several `spnt:smartPush` nodes exist
 * under `contents/config/smartpush`).
 */
export const SMARTPUSH_CONFIG_PATH = "contents/config/smartpush/smartpush-siteSofinco";

/** DOM id carried by the "Aide & Contact" trigger link; the bootstrap delegates on it. */
export const SMARTPUSH_TRIGGER_ID = "smartpush-trigger";

/**
 * Plain DTO projected from the external `spnt:smartPush` node (never pass the raw bean
 * around — GraalVM serialises it to `{}` and may throw).
 *
 * The string fields hold **raw JS fragments** authored to be spliced verbatim into the
 * `stPush.init({...})` object literal — this mirrors the legacy Smart Tribune JSP, which is
 * the contract the (externally-owned) content type's editor targets. We do NOT parse them.
 */
export interface SmartPushConfig {
	/** URL of the Smart Tribune PUSH loader (`push.main.js`). */
	jsUrl: string;
	/** GA measurement id — emitted quoted: `"analyticsUA":"<value>"`. */
	analyticsUA: string;
	/** Knowledge-base id — emitted unquoted (raw number): `"kbId":<value>`. */
	kbId: string;
	cookieOptin: boolean;
	/** Raw JS value emitted as `"customVariables":<value>` (authored verbatim, not JSON). */
	customVariables: string;
	/** When true the tag filter key is `tagsOr` instead of `tags`. */
	tagsOr: boolean;
	/** Defaults to `true` when the property is absent (matches the JSP). */
	searchFiltered: boolean;
	/** Quoted, comma-separated values spliced inside `[ ]` — e.g. `"tag-a","tag-b"`. */
	tags: string;
	/** Quoted, comma-separated values spliced inside `[ ]` (thematics). */
	thematicsFilter: string;
	/** Raw JS value emitted as `"entrypoint":<value>`. */
	entrypoint: string;
	/** Emitted quoted: `"buildName":"<value>"`. */
	buildName: string;
	/** Raw object-body fragment spliced verbatim (incl. its own trailing comma). */
	extraParams: string;
}

/**
 * Reads the shared `spnt:smartPush` config node. Returns `null` when the site is missing,
 * the node is absent, or the two mandatory fields (`jsUrl`, `kbId`) are empty — callers
 * treat `null` as "PUSH disabled".
 */
export function mapSmartPushConfig(site: JCRNodeWrapper | null): SmartPushConfig | null {
	if (!site) return null;
	const node = getChildNode(site, SMARTPUSH_CONFIG_PATH);
	if (!node) return null;

	const jsUrl = str(node, "jsUrl");
	const kbId = str(node, "kbId");
	if (!jsUrl || !kbId) return null;

	return {
		jsUrl,
		analyticsUA: str(node, "analyticsUA"),
		kbId,
		cookieOptin: getAsBoolean(node, "cookieOptin"),
		customVariables: str(node, "customVariables"),
		tagsOr: getAsBoolean(node, "tagsOr"),
		// JSP nets `searchFiltered` to true when the property is unset.
		searchFiltered: getAsBoolean(node, "searchFiltered", true),
		tags: str(node, "tags"),
		thematicsFilter: str(node, "thematicsFilter"),
		entrypoint: str(node, "entrypoint"),
		buildName: str(node, "buildName"),
		extraParams: str(node, "extraParams"),
	};
}

/**
 * Builds the `stPush.init({...})` object literal **exactly like the legacy Smart Tribune
 * JSP**: each property is spliced verbatim (no JSON encoding). `tags`/`thematicsFilter` go
 * inside `[ ]`, `extraParams` is a raw object-body fragment carrying its own trailing comma,
 * and `customVariables`/`entrypoint`/`kbId` are injected unquoted. `searchFiltered` is
 * emitted **after** `extraParams` so the typed value wins over any stray `searchFiltered:`
 * an author left in `extraParams` (last duplicate key wins). Kept separate from the script
 * string so it stays unit-testable.
 */
export function buildSmartPushInitBody(cfg: SmartPushConfig): string {
	const parts: string[] = [];
	if (cfg.analyticsUA) parts.push(`"analyticsUA":"${cfg.analyticsUA}",`);
	if (cfg.kbId) parts.push(`"kbId":${cfg.kbId},`);
	parts.push(`"locale":"fr",`);
	parts.push(`"cookieOptin":${cfg.cookieOptin},`);
	if (cfg.extraParams) parts.push(cfg.extraParams);
	if (cfg.entrypoint) parts.push(`"entrypoint":${cfg.entrypoint},`);
	if (cfg.buildName) parts.push(`"buildName":"${cfg.buildName}",`);
	if (cfg.customVariables) parts.push(`"customVariables":${cfg.customVariables},`);
	parts.push(`"searchFiltered":${cfg.searchFiltered},`);
	const tagsType = cfg.tagsOr ? "tagsOr" : "tags";
	parts.push(`"filters":{"thematics":[${cfg.thematicsFilter}],"${tagsType}":[${cfg.tags}]}`);
	return `{${parts.join("")}}`;
}

/**
 * Builds the inline bootstrap that mirrors sofinco.fr: it sets `window.stPushJsUrl`,
 * registers the `STPUSHLoaded` listener (which calls `stPush.init` then dispatches
 * `STPUSHCanBeOpened`), and installs a capture-phase delegated click listener that
 * **lazy-loads `push.main.js` on the first click** of the trigger and opens the popup
 * (`stPush.show()`) once the widget is ready. Idempotent via `window.__ST_PUSH_BOOT__`.
 */
export function buildSmartPushInitScript(cfg: SmartPushConfig): string {
	const jsUrl = JSON.stringify(cfg.jsUrl);
	const initBody = buildSmartPushInitBody(cfg);
	const triggerSelector = JSON.stringify(`#${SMARTPUSH_TRIGGER_ID},[data-st-push-trigger]`);

	return (
		"(function(){" +
		"if(window.__ST_PUSH_BOOT__)return;window.__ST_PUSH_BOOT__=true;" +
		`var JS_URL=${jsUrl},SELECTOR=${triggerSelector};` +
		"var loading=false,ready=false,wantOpen=false;" +
		"window.stPushJsUrl=JS_URL;" +
		"window.addEventListener('STPUSHLoaded',function(e){" +
		"window.stPush=e.detail;" +
		"try{window.stPush.init(" +
		initBody +
		");}catch(err){}" +
		"ready=true;" +
		"window.dispatchEvent(new CustomEvent('STPUSHCanBeOpened'));" +
		"if(wantOpen&&window.stPush&&window.stPush.show){window.stPush.show();}" +
		"});" +
		"function load(){if(loading)return;loading=true;var s=document.createElement('script');s.async=true;s.src=JS_URL;document.body.appendChild(s);}" +
		"function open(){if(ready&&window.stPush&&window.stPush.show){window.stPush.show();}else{wantOpen=true;load();}}" +
		"document.addEventListener('click',function(e){" +
		"var trigger=e.target&&e.target.closest?e.target.closest(SELECTOR):null;" +
		"if(!trigger)return;" +
		"e.preventDefault();" +
		"open();" +
		"},true);" +
		"})();"
	);
}

/** Label of the "Aide & Contact" trigger link. */
export const SMARTPUSH_LINK_LABEL = "Aide & Contact";

/**
 * Builds the "Aide & Contact" trigger as a {@link LinkProps} (icon on the left). It is
 * appended to the MySpace links of the React Menu; the bootstrap above intercepts its
 * click (matched by {@link SMARTPUSH_TRIGGER_ID}) and opens the Smart Tribune popup.
 */
export function buildSmartPushLink(): LinkProps {
	return {
		id: SMARTPUSH_TRIGGER_ID,
		href: "#",
		label: SMARTPUSH_LINK_LABEL,
		iconLeft: "message-circle-question-mark",
		iconVariant: "primary",
		tracking: { event: "click_menu_myspace", menu_level_1: SMARTPUSH_LINK_LABEL },
	};
}
