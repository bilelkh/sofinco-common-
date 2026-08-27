import { buildNodeUrl } from "@jahia/javascript-modules-library";
import type { RenderContext } from "org.jahia.services.render";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { findAncestor, getChildNode, getGlobalSettingsNode, str } from "#lib/jcr";
import { isAuthoringMode } from "#lib/renderContext";
import trackingBootstrap from "./tracking-bootstrap.ts?inline-script";
import consentBootstrap from "./consent-bootstrap.ts?inline-script";
import consentModeBootstrap from "./consent-mode-bootstrap.ts?inline-script";

export { trackingBootstrap, consentBootstrap, consentModeBootstrap };

export const TRACKING_SETTINGS_PATH = "tracking-settings";
const GA_CHILD = "ga";
const NUMBERLY_CHILD = "numberly";
const DIDOMI_CHILD = "didomi";

const GTM_ID_RE = /^GTM-[A-Z0-9]{4,12}$/;
const EULERIAN_HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
/** Un notice id Didomi est un UUID v4 — le valider évite d'émettre un loader mort. */
const DIDOMI_NOTICE_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const getTrackingChild = (
	site: JCRNodeWrapper | null,
	childName: string,
): JCRNodeWrapper | null => {
	if (!site) return null;
	const parent = getGlobalSettingsNode(TRACKING_SETTINGS_PATH, site);
	if (!parent) return null;
	return getChildNode(parent, childName);
};

/**
 * Reads the GTM container id from `tracking-settings/ga`.
 * Returns empty string when the child or property is absent (= GA disabled).
 */
export const readGaContainerId = (site: JCRNodeWrapper | null): string => {
	const ga = getTrackingChild(site, GA_CHILD);
	const raw = ga ? str(ga, "gtmContainerId") : "";
	return raw && GTM_ID_RE.test(raw) ? raw : "";
};

/**
 * Lit le notice id Didomi depuis `tracking-settings/didomi`.
 * Chaîne vide quand l'enfant, la propriété ou le format manquent (= CMP désactivé).
 *
 * L'id n'est pas codé en dur : il diffère par environnement (recette / production),
 * et un id de prod servi en recette ferait remonter du consentement sur le mauvais
 * périmètre.
 */
export const readDidomiNoticeId = (site: JCRNodeWrapper | null): string => {
	const didomi = getTrackingChild(site, DIDOMI_CHILD);
	const raw = didomi ? str(didomi, "noticeId") : "";
	return raw && DIDOMI_NOTICE_ID_RE.test(raw) ? raw : "";
};

const GLOBAL_PROPS = [
	"env_template",
	"env_work",
	"canal_origin",
	"code_apporteur",
	"partner",
	"platform_mode",
] as const;

type GlobalContext = Partial<Record<(typeof GLOBAL_PROPS)[number], string>>;

interface PageContext {
	virtualPageTitle: string;
	virtualPageURL: string;
	page_title: string;
	page_url: string;
	page_type: string;
}

interface CategorisationContext {
	page_category_level_1?: string;
	page_category_level_2?: string;
	page_category_level_3?: string;
	page_template?: string;
}

export type TrackingContext = GlobalContext & PageContext & CategorisationContext;

const readGlobal = (site: JCRNodeWrapper | null): GlobalContext => {
	const ga = getTrackingChild(site, GA_CHILD);
	if (!ga) return {};
	const out: GlobalContext = {};
	for (const key of GLOBAL_PROPS) {
		const v = str(ga, key);
		if (v) out[key] = v;
	}
	return out;
};

const readCategorisation = (pageNode: JCRNodeWrapper | null): CategorisationContext => {
	if (!pageNode) return {};
	try {
		if (!pageNode.isNodeType("spmix:eaPageOptions")) return {};
	} catch {
		return {};
	}
	const out: CategorisationContext = {};
	const idmetacat = str(pageNode, "idmetacat");
	const idcat = str(pageNode, "idcat");
	const idsubcat = str(pageNode, "idsubcat");
	const pg = str(pageNode, "pg");
	if (idmetacat) out.page_category_level_1 = idmetacat;
	if (idcat) out.page_category_level_2 = idcat;
	if (idsubcat) out.page_category_level_3 = idsubcat;
	if (pg) out.page_template = pg;
	return out;
};

const buildRequestUrl = (renderContext: RenderContext): string => {
	try {
		const url = renderContext.getURLGenerator();
		const server = url.getServer() ?? "";
		const path = url.getCurrent() ?? "";
		const base = `${server}${path}`;
		let qs = "";
		try {
			qs = renderContext.getRequest().getQueryString() ?? "";
		} catch {
			/* no request available */
		}
		return qs ? `${base}?${qs}` : base;
	} catch {
		return "";
	}
};

export interface EulerianConfig {
	host: string;
	rtgsite: string;
	/**
	 * Id du vendor Eulerian dans la notice Didomi. Vide = tag émis SANS condition de
	 * consentement — repli explicite, pas un oubli (cf. le commentaire du CND).
	 *
	 * L'id vit dans le JCR pour la même raison que le notice id : il dépend de la notice,
	 * donc de l'environnement. Un id absent de la notice ne lève pas — il rend le
	 * consentement du vendor indéterminé, donc refusé, et Eulerian ne part jamais. C'est
	 * `window.__SOFINCO_CONSENT_UNRESOLVED__` qui le rend visible en recette.
	 */
	didomiVendorId: string;
}

export const readEulerianConfig = (site: JCRNodeWrapper | null): EulerianConfig | null => {
	const nb = getTrackingChild(site, NUMBERLY_CHILD);
	if (!nb) return null;
	const host = str(nb, "eaTrackerHost");
	if (!host || !EULERIAN_HOST_RE.test(host)) return null;
	return {
		host,
		rtgsite: str(nb, "rtgsite") || "prospect",
		didomiVendorId: str(nb, "didomiVendorId"),
	};
};

/**
 * Builds the EA_push flat alternating array for a page tag, per the
 * Numberly/Eulerian "Plan de taggage Sofinco V3" spec.
 *
 * Fires only when the page carries `spmix:eaPageOptions` (mixin from
 * portal-common-sofinco) — `rtgpg` / `rtgpagename` are sourced from that mixin.
 * Returns null when the page is not taggable.
 *
 * Path = current URL path with '/' replaced by '|'. User-related props are
 * left empty until authentication is wired; `rtgpartner_*` are populated by
 * the Eulerian tag itself at runtime.
 */
export const buildEulerianPageTag = (
	renderContext: RenderContext,
	cfg: EulerianConfig,
): Array<string> | null => {
	const mainNode = (() => {
		try {
			return renderContext.getMainResource().getNode() as JCRNodeWrapper;
		} catch {
			return null;
		}
	})();
	const pageNode = mainNode ? findAncestor(mainNode, "jnt:page") : null;
	if (!pageNode) return null;
	try {
		if (!pageNode.isNodeType("spmix:eaPageOptions")) return null;
	} catch {
		return null;
	}

	let uriPath = "/";
	try {
		uriPath = renderContext.getRequest().getRequestURI() ?? "/";
	} catch {
		/* keep default */
	}
	const path = uriPath.replace(/\//g, "|") || "|";

	const pg = str(pageNode, "pg");
	const pagename = str(pageNode, "pagename");

	return [
		"rtgsite",
		cfg.rtgsite,
		"rtgpg",
		pg,
		"rtgpagename",
		pagename,
		"path",
		path,
		"rtglogged",
		"",
		"rtgcustomer",
		"",
		"uid",
		"",
		"rtgmfactoryid",
		"",
		"rtgtechnical_id",
		"",
		"rtgpartner_name",
		"",
		"rtgpartner_uid",
		"",
		"rtgidperso_hp",
		"",
		"funnel_id",
		"",
		"simulationid",
		"",
	];
};

export const buildTrackingContext = (renderContext: RenderContext): TrackingContext => {
	const site = (() => {
		try {
			return renderContext.getSite() as JCRNodeWrapper;
		} catch {
			return null;
		}
	})();

	const mainNode = (() => {
		try {
			return renderContext.getMainResource().getNode() as JCRNodeWrapper;
		} catch {
			return null;
		}
	})();

	const pageNode = mainNode ? findAncestor(mainNode, "jnt:page") : null;

	const pagePath = pageNode ? buildNodeUrl(pageNode) : "";
	const pageUrl = buildRequestUrl(renderContext) || pagePath;
	const pageTitle = pageNode ? str(pageNode, "jcr:title") : "";

	const categorisation = readCategorisation(pageNode);
	const pagename = pageNode ? str(pageNode, "pagename") : "";

	const virtualPage = pagename || pagePath.replace(/^\//, "");

	const page: PageContext = {
		virtualPageTitle: virtualPage,
		virtualPageURL: virtualPage,
		page_title: pageTitle,
		page_url: pageUrl,
		page_type: categorisation.page_template ?? "",
	};

	return {
		...readGlobal(site),
		...page,
		...categorisation,
	};
};

export const escapeForInlineScript = (json: string): string => {
	return json
		.replace(/</g, "\\u003c")
		.replace(/-->/g, "--\\u003e")
		.replace(/\u2028/g, "\\u2028")
		.replace(/\u2029/g, "\\u2029");
};

/**
 * Scripts inline du `<head>`, d\u00e9j\u00e0 d\u00e9cid\u00e9s : une cha\u00eene vide signifie \u00ab ne rends
 * pas ce `<script>` \u00bb. Extrait de `templates/Layout.tsx` pour que ce c\u00e2blage
 * conditionnel soit testable (les `.tsx` sont hors couverture par construction).
 */
export interface HeadScripts {
	/**
	 * Container GTM valid\u00e9, `""` quand GA est d\u00e9sactiv\u00e9 **ou** que la page est rendue
	 * en contribution \u2014 pilote `gtmSnippet` et le `<noscript>` du body.
	 */
	gtmId: string;
	/**
	 * D\u00e9fauts Google Consent Mode + pont Didomi \u2192 dataLayer. `""` quand aucun CMP n'est
	 * configur\u00e9 ou en contribution.
	 *
	 * **Doit \u00eatre \u00e9mis EN TOUT PREMIER dans le `<head>`**, avant `didomiBootstrap`
	 * lui-m\u00eame \u2014 c'est ce qui ferme la course avec le SDK charg\u00e9 en async. Cf. l'en-t\u00eate
	 * de `consent-mode-bootstrap.ts`.
	 *
	 * \u00c9mis seulement avec un CMP : sans lui, poser des d\u00e9fauts \u00ab denied \u00bb que rien ne
	 * viendrait mettre \u00e0 jour \u00e9teindrait toute la mesure. Le comportement d'avant est
	 * alors conserv\u00e9 \u00e0 l'identique.
	 */
	consentMode: string;
	/**
	 * Loader du CMP Didomi. `""` quand aucun notice id valide n'est configur\u00e9 ou en
	 * contribution. **Doit \u00eatre \u00e9mis en premier dans le `<head>`** : le stub
	 * `__tcfapi` qu'il installe doit exister avant que GTM et Eulerian ne lisent le
	 * consentement.
	 */
	didomiBootstrap: string;
	/**
	 * D\u00e9l\u00e9gu\u00e9 de clic des boutons de consentement (`data-consent-action`). Toujours
	 * \u00e9mis : il ne d\u00e9pend d'aucune config et reste inerte si aucun CMP n'est charg\u00e9.
	 */
	consentBootstrap: string;
	/** Contexte de tracking inline + bootstrap du d\u00e9l\u00e9gu\u00e9 de clics. Toujours \u00e9mis. */
	trackingContext: string;
	/**
	 * Bootstrap GTM ; `""` quand aucun container n'est configur\u00e9.
	 *
	 * Le repli `<noscript><iframe>` du body est conserv\u00e9 par parit\u00e9 avec le legacy. Il
	 * \u00e9chappe par nature \u00e0 Consent Mode, qui est du JavaScript \u2014 cf. le commentaire de
	 * `Layout.tsx` pour la port\u00e9e r\u00e9elle et le moyen de la mesurer.
	 */
	gtmSnippet: string;
	/**
	 * Loader Eulerian ; `""` quand Eulerian est inactif ou la page non taggable.
	 *
	 * Envelopp\u00e9 dans `window.__SOFINCO_ON_CONSENT__(...)` d\u00e8s qu'un CMP est actif et
	 * qu'un `didomiVendorId` est configur\u00e9 \u2014 cf. `EulerianConfig.didomiVendorId`.
	 */
	eulerianBootstrap: string;
	/**
	 * `EA_push(...)` de la page ; vide/non vide toujours en phase avec `eulerianBootstrap`,
	 * et gard\u00e9 par le m\u00eame vendor. Les deux callbacks partent dans leur ordre
	 * d'enregistrement, donc le loader \u2014 qui d\u00e9finit `EA_push` synchroniquement \u2014 s'ex\u00e9cute
	 * toujours avant ce push.
	 */
	eulerianPageTag: string;
}

/**
 * R\u00e9sout le CMP (Didomi) et les deux canaux analytics (GA/GTM et Eulerian), et en
 * d\u00e9rive les scripts inline du `<head>`.
 *
 * L'ordre d'\u00e9mission compte, et il n'est PAS testable ici : c'est `Layout.tsx` qui le
 * garantit, et les `.tsx` sont hors couverture par construction. Ordre attendu :
 *
 *   1. `consentMode`        d\u00e9fauts Consent Mode + garde Eulerian     (synchrone)
 *   2. `didomiBootstrap`    stub `__tcfapi` + loader du CMP           (async)
 *   3. `consentBootstrap`   d\u00e9l\u00e9gu\u00e9 \u00ab G\u00e9rer mes cookies \u00bb
 *   4. `trackingContext`    contexte + d\u00e9l\u00e9gu\u00e9 de clics
 *   5. `gtmSnippet`         gtm.js
 *   6. `eulerian*`          loader + EA_push, diff\u00e9r\u00e9s au consentement
 *
 * ATTENTION \u00e0 une id\u00e9e fausse tenace, qui est \u00e0 l'origine du trou que ce module
 * comble : **GTM ne lit pas `__tcfapi`**. Le stub TCF pos\u00e9 en 2 n'est consomm\u00e9 que par
 * certains produits publicitaires Google (Ads / GAM, vendor TCF 755). Le conteneur GTM
 * ne comprend que les signaux Consent Mode \u2014 c'est le r\u00f4le du point 1, et lui seul.
 *
 * Le point 1 passe donc AVANT le loader Didomi : le SDK est charg\u00e9 en async et peut
 * venir du cache HTTP, donc \u00e9mettre son propre `update` avant que nos d\u00e9fauts ne soient
 * pos\u00e9s. Google traite alors les signaux absents comme accord\u00e9s.
 *
 * Eulerian est tout ou rien : le loader et le `EA_push` de page vont ensemble, et
 * ne sont \u00e9mis que si la config du site est valide **et** que la page porte
 * `spmix:eaPageOptions` (`buildEulerianPageTag` renvoie `null` sinon).
 *
 * Aucun tag \u00e9diteur n'est \u00e9mis en contribution : les sessions des contributeurs
 * dans le Page Builder et l'aper\u00e7u fausseraient les statistiques \u2014 et un outil de
 * rejeu de session (Content Square et consorts, d\u00e9ploy\u00e9s via GTM) enregistrerait
 * l'interface d'administration de Jahia. Le contexte de tracking et son d\u00e9l\u00e9gu\u00e9
 * de clics, eux, restent \u00e9mis : `window.__SOFINCO_TRACK__` doit exister pour les
 * \u00eelots hydrat\u00e9s, qui poussent alors dans un `dataLayer` que personne ne lit.
 */
export const buildHeadScripts = (renderContext: RenderContext): HeadScripts => {
	const site = renderContext.getSite();
	const authoring = isAuthoringMode(renderContext);

	const gtmId = authoring ? "" : readGaContainerId(site);
	const trackingContextJson = escapeForInlineScript(
		JSON.stringify(buildTrackingContext(renderContext)),
	);

	/*
	 * Désactivé en contribution, pour la même raison que GTM et Eulerian : une modale
	 * de consentement par-dessus le Page Builder le rendrait inutilisable, et le
	 * consentement d'un contributeur n'a aucune valeur. Le délégué de clic, lui, reste
	 * émis — le bouton « Gérer mes cookies » est alors simplement inerte en aperçu.
	 */
	const didomiNoticeId = authoring ? "" : readDidomiNoticeId(site);

	const eulerian = authoring ? null : readEulerianConfig(site);
	const eulerianTag = eulerian ? buildEulerianPageTag(renderContext, eulerian) : null;
	const eulerianActive = Boolean(eulerian && eulerianTag);

	/*
	 * Garde de consentement des tags non-Google. Elle n'existe QUE si le CMP est émis :
	 * `__SOFINCO_ON_CONSENT__` est posé par `consentMode`, et les deux se calculent ici,
	 * depuis le même `didomiNoticeId` — ils ne peuvent pas diverger (test dédié).
	 *
	 * Sans vendor id configuré, la garde est absente et le tag part comme avant. C'est un
	 * repli assumé : il vaut mieux une non-conformité visible et documentée qu'un tag
	 * éteint sans que personne ne comprenne pourquoi.
	 */
	const eulerianVendorId = didomiNoticeId && eulerian ? eulerian.didomiVendorId : "";
	const gateOnConsent = (body: string): string =>
		eulerianVendorId
			? `window.__SOFINCO_ON_CONSENT__(${escapeForInlineScript(
					JSON.stringify(eulerianVendorId),
				)},function(){${body}});`
			: body;

	/*
	 * « Repli visible » ne veut rien dire tant que rien ne le rend visible. Le champ vide se
	 * lit dans le JCR, pas dans le navigateur : jusqu'ici, une page servant Eulerian SANS
	 * garde était indiscernable d'une page où la garde passait — c'est précisément ainsi que
	 * le trou a pu vivre en production sans que personne ne le voie.
	 *
	 * Ce marqueur est le pendant de `__SOFINCO_CONSENT_UNRESOLVED__` (id saisi mais inconnu
	 * de la notice). Les deux doivent rester vides ; l'un ou l'autre non vide décrit exactement
	 * ce qui manque, sans avoir à ouvrir jContent.
	 *
	 * Émis UNIQUEMENT quand un CMP est présent : sans notice, il n'y a aucun consentement à
	 * recueillir, donc aucune anomalie à signaler. Porté par le seul `eulerianBootstrap` et
	 * non par `gateOnConsent`, qui est appelé deux fois — le tag partirait en double.
	 */
	const ungatedMarker =
		didomiNoticeId && eulerianActive && !eulerianVendorId
			? `(window.__SOFINCO_CONSENT_UNGATED__=window.__SOFINCO_CONSENT_UNGATED__||[]).push('eulerian');`
			: "";

	return {
		gtmId,
		consentMode: didomiNoticeId ? consentModeBootstrap : "",
		// Stub IAB TCF officiel de Didomi, à l'identique du legacy — seul l'id est
		// interpolé, et il est déjà validé contre un format UUID par sa lecture.
		didomiBootstrap: didomiNoticeId
			? `window.gdprAppliesGlobally=true;(function(){function a(e){if(!window.frames[e]){if(document.body&&document.body.firstChild){var t=document.body;var n=document.createElement("iframe");n.style.display="none";n.name=e;n.title=e;t.insertBefore(n,t.firstChild)}else{setTimeout(function(){a(e)},5)}}}function e(n,r,o,c,s){function e(e,t,n,a){if(typeof n!=="function"){return}if(!window[r]){window[r]=[]}var i=false;if(s){i=s(e,t,n)}if(!i){window[r].push({command:e,parameter:t,callback:n,version:a})}}e.stub=true;function t(a){if(!window[n]||window[n].stub!==true){return}if(!a.data){return}var i=typeof a.data==="string";var e;try{e=i?JSON.parse(a.data):a.data}catch(t){return}if(e[o]){var r=e[o];window[n](r.command,r.parameter,function(e,t){var n={};n[c]={returnValue:e,success:t,callId:r.callId};a.source.postMessage(i?JSON.stringify(n):n,"*")},r.version)}}if(typeof window[n]!=="function"){window[n]=e;if(window.addEventListener){window.addEventListener("message",t,false)}else{window.attachEvent("onmessage",t)}}}e("__tcfapi","__tcfapiBuffer","__tcfapiCall","__tcfapiReturn");a("__tcfapiLocator");(function(e){var t=document.createElement("script");t.id="spcloader";t.type="text/javascript";t.async=true;t.src="https://sdk.privacy-center.org/"+e+"/loader.js?target="+document.location.hostname;t.charset="utf-8";var n=document.getElementsByTagName("script")[0];n.parentNode.insertBefore(t,n)})("${didomiNoticeId}")})();`
			: "",
		consentBootstrap,
		trackingContext: `window.__SOFINCO_TRACKING_CONTEXT__=${trackingContextJson};${trackingBootstrap}`,
		gtmSnippet: gtmId
			? `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`
			: "",
		eulerianBootstrap:
			eulerianActive && eulerian
				? ungatedMarker +
					gateOnConsent(
						`(function(e,a){var i=e.length,y=5381,k='script',s=window,v=document,o=v.createElement(k);for(;i;){i-=1;y=(y*33)^e.charCodeAt(i)}y='_EA_'+(y>>>=0);(function(e,a,s,y){s[a]=s[a]||function(){(s[y]=s[y]||[]).push(arguments);s[y].eah=e;};}(e,a,s,y));i=new Date/1E7|0;o.ea=y;y=i%26;o.async=1;o.src='//'+e+'/'+String.fromCharCode(97+y,122-y,65+y)+(i%1E3)+'.js?2';s=v.getElementsByTagName(k)[0];s.parentNode.insertBefore(o,s);})('${eulerian.host}','EA_push');`,
					)
				: "",
		eulerianPageTag: eulerianActive
			? gateOnConsent(`EA_push(${escapeForInlineScript(JSON.stringify(eulerianTag))});`)
			: "",
	};
};
