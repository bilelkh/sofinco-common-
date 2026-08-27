/*
 * Les scripts inline ci-dessous (GTM, Eulerian, tracking, footnotes) doivent être
 * injectés via dangerouslySetInnerHTML — c'est le seul moyen de rendre un <script>
 * inline en SSR. Les données dynamiques sont échappées via escapeForInlineScript.
 */
/* eslint-disable @eslint-react/dom/no-dangerously-set-innerhtml */
import {
	AddResources,
	buildModuleFileUrl,
	useServerContext,
} from "@jahia/javascript-modules-library";
import type { ReactNode } from "react";
import type { BreadcrumbItem } from "sofinco-react";
import "modern-normalize/modern-normalize.css";
import "./global.css";
import { buildHeadScripts, escapeForInlineScript } from "#lib/tracking";
import { footnoteBootstrap } from "#lib/footnotes-script";
import { startFootnoteCollection } from "#lib/footnoteCollector";
import { startInsuranceVars } from "#lib/insuranceVars";
import { FootnoteAudit } from "#audit/FootnoteAudit";
import { auditPanel } from "#audit/panel-script";
import { useAppTranslation } from "#lib/i18n";
import { buildHeadMeta } from "#lib/seoHead";

/**
 * Enveloppe HTML racine. Toute la logique de décision du `<head>` vit dans
 * `#lib/seoHead` (métadonnées) et `#lib/tracking` (scripts analytics), qui sont
 * des `.ts` testables — ce composant ne fait que rendre ce qu'ils ont décidé.
 *
 * @param title Titre de repli — le `jcr:title` passé par les templates de page.
 *   Le `<title>` réellement rendu est `titleSEO` (mixin `spmix:seoPageOptions`)
 *   quand la page le renseigne, `noindex` / `nofollow` du même mixin alimentent
 *   `<meta name="robots">`, `jcr:description` alimente
 *   `<meta name="description">`, `j:tagList` alimente `<meta name="keywords">`,
 *   et le mixin `spmix:openGraphTags` alimente les balises sociales. L'URL
 *   publique absolue (`#lib/pageUrl`) alimente `<link rel="canonical">`,
 *   `og:url` et `twitter:url`. Le `@graph` JSON-LD (`#lib/structuredData`) est
 *   dérivé des mêmes valeurs, plus l'arborescence de la page et ses blocs de
 *   contenu. Point unique de résolution pour tous les templates de
 *   `templates/Page/`.
 */
export const Layout = ({
	title,
	breadcrumbItems,
	children,
}: {
	title: string;
	/**
	 * Le fil d'Ariane que le template rend lui-même, transmis pour que le
	 * `BreadcrumbList` du JSON-LD décrive exactement la navigation affichée sans
	 * refaire le walk d'ancêtres — cf. `#lib/seoHead`.
	 */
	breadcrumbItems?: BreadcrumbItem[];
	children: ReactNode;
}) => {
	const { currentResource, renderContext } = useServerContext();
	const jcrLocale = currentResource.getLocale();
	const { t } = useAppTranslation();

	/*
	 * Libellé lecteur d'écran des renvois de note, publié sur `globalThis` AVANT le rendu
	 * des descendants — le corps d'un composant s'exécute avant celui de ses enfants, donc
	 * tout îlot rendu dans `children` le verra.
	 *
	 * C'est le pendant serveur de la globale posée par le script inline ci-dessous. Les
	 * deux portent la MÊME valeur, ce qui est la condition pour que `FootnoteText`
	 * (sofinco-react) produise un balisage identique au rendu serveur et à l'hydratation.
	 * Un contexte React ne conviendrait pas : il ne franchit pas la frontière d'un îlot,
	 * qui s'hydrate comme sa propre racine à partir de ses seules props sérialisées.
	 */
	const footnoteLabel = t("a11y.noteBasDePage");
	(globalThis as unknown as Record<string, unknown>).__SOFINCO_FOOTNOTE_LABEL__ = footnoteLabel;

	/*
	 * CONTRÔLE DES MENTIONS LÉGALES — MODE ÉDITION.
	 *
	 * Le script des renvois, lui, se met en veille complète ici : il réécrit des nœuds de
	 * texte pour poser les liens, ce que le Page Builder ne supporte pas (ses références
	 * deviennent caduques et les zones disparaissent).
	 *
	 * Le contrôle, en revanche, ne s'exécute plus dans le navigateur du tout : il est
	 * CALCULÉ PENDANT LE RENDU (footnoteCollector.ts) et rendu en HTML statique après
	 * `{children}`. Zéro JavaScript, zéro mutation, zéro défilement — donc rien qui puisse
	 * perturber jContent, par construction et non par précaution. C'est la leçon de quatre
	 * tentatives d'affichage côté client, cassées pour quatre raisons différentes.
	 */
	const isEditMode = renderContext.isEditMode();
	startFootnoteCollection(isEditMode);

	/*
	 * VARIABLES DE SIMULATION — armement du registre, avant tout descendant.
	 *
	 * Contrairement à la collecte de renvois, ce registre est actif EN LIVE AUSSI : ce n'est pas
	 * un contrôle éditorial mais un mécanisme de rendu. L'armement est obligatoire à chaque
	 * rendu, l'état de module survivant d'une requête à l'autre dans le moteur JS de Jahia.
	 *
	 * En ÉDITION, il est armé SANS résolution : les jetons restent affichés tels quels et aucun
	 * appel APIM n'est émis. Une session d'édition recharge le Page Builder en continu ; solliciter
	 * un service bancaire externe à chaque rechargement n'aurait aucun sens, et le contributeur
	 * doit de toute façon relire ses propres jetons. Le contrôle bascule alors sur sa variante
	 * statique, qui alimente le panneau d'audit sans rien résoudre. Pour voir les valeurs réelles,
	 * le mode Aperçu est là pour ça.
	 */
	startInsuranceVars(!isEditMode);

	const head = buildHeadMeta({
		renderContext,
		fallbackTitle: title,
		language: jcrLocale.getLanguage(),
		country: jcrLocale.getCountry(),
		breadcrumbItems,
	});
	const scripts = buildHeadScripts(renderContext);

	return (
		<html lang={head.lang} {...head.microdata}>
			<head>
				{/* La spec HTML exige le charset dans les 1024 premiers octets — et le
				    contenu est en français accentué. Il reste donc en tête du <head>. */}
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1.0" />
				{/*
				 * CONSENTEMENT — EN TOUT PREMIER, avant même le loader du CMP.
				 *
				 * Ce script pose SYNCHRONEMENT les défauts Google Consent Mode (tout en
				 * « denied » sauf `security_storage`), et arme la garde de consentement des
				 * tags non-Google (`__SOFINCO_ON_CONSENT__`, utilisée par Eulerian plus bas).
				 *
				 * Le loader Didomi juste en dessous est chargé en `async` et peut venir du
				 * cache HTTP : s'il émettait son `update` avant nos défauts, Google
				 * considérerait les signaux absents comme ACCORDÉS. Cette position est la
				 * seule qui ferme la course — ne pas la déplacer.
				 *
				 * Il ne pousse NI `consent update` NI événement de consentement : les deux
				 * intégrations de la console Didomi (Consent Mode et GTM) le font déjà, c'est
				 * vérifié en production. Cf. l'en-tête de `#lib/consent-mode-bootstrap`.
				 */}
				{scripts.consentMode && (
					<script dangerouslySetInnerHTML={{ __html: scripts.consentMode }} />
				)}
				{/* CMP (Didomi) — avant tout script analytics, comme dans le legacy JSP. */}
				{scripts.didomiBootstrap && (
					<script dangerouslySetInnerHTML={{ __html: scripts.didomiBootstrap }} />
				)}
				{/* Délégué du bouton « Gérer mes cookies » — cf. `#lib/consent-bootstrap`. */}
				<script dangerouslySetInnerHTML={{ __html: scripts.consentBootstrap }} />
				<AddResources type="css" resources={buildModuleFileUrl("dist/assets/style.css")} />
				<title>{head.title}</title>
				{/* Jahia sert la même page sous plusieurs URLs (chemin de nœud, vanity
				    URLs secondaires) : le canonical désigne l'unique URL de référence. */}
				{head.canonical && <link rel="canonical" href={head.canonical} />}
				{head.metas.map(({ key, content, ...attrs }) => (
					<meta key={key} {...attrs} content={content} />
				))}
				{/*
				 * Données structurées : UN SEUL bloc par page, contenant un `@graph` où les
				 * nœuds se citent par `@id` (`publisher`, `provider`) au lieu de redéclarer
				 * l'entité de marque dans chacun d'eux. Le contenu est déjà sérialisé et
				 * échappé par `#lib/structuredData` — cf. `serializeJsonLd`.
				 */}
				{head.jsonLd && (
					<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: head.jsonLd }} />
				)}
				<script dangerouslySetInnerHTML={{ __html: scripts.trackingContext }} />
				{/*
				 * Le libellé lecteur d'écran des renvois `((n))` est passé au script plutôt
				 * que codé dedans : la traduction reste dans settings/locales, côté serveur.
				 * Il porte la MÊME valeur que la globale posée plus haut pour le rendu serveur,
				 * condition pour que `FootnoteText` produise un balisage identique au SSR et à
				 * l'hydratation des îlots.
				 */}
				<script
					dangerouslySetInnerHTML={{
						__html:
							`window.__SOFINCO_FOOTNOTE_LABEL__=${escapeForInlineScript(
								JSON.stringify(footnoteLabel),
							)};` +
							/*
							 * Drapeau lu par le script principal, posé AVANT lui : il se met alors
							 * entièrement en veille (cf. l'en-tête de footnote-bootstrap.ts).
							 */
							(isEditMode ? "window.__SOFINCO_EDIT_MODE__=true;" : "") +
							footnoteBootstrap,
					}}
				/>
				{scripts.gtmSnippet && <script dangerouslySetInnerHTML={{ __html: scripts.gtmSnippet }} />}
				{scripts.eulerianBootstrap && (
					<script dangerouslySetInnerHTML={{ __html: scripts.eulerianBootstrap }} />
				)}
				{scripts.eulerianPageTag && (
					<script dangerouslySetInnerHTML={{ __html: scripts.eulerianPageTag }} />
				)}
			</head>
			<body>
				{scripts.gtmId && (
					<noscript>
						<iframe
							src={`https://www.googletagmanager.com/ns.html?id=${scripts.gtmId}`}
							height="0"
							width="0"
							style={{ display: "none", visibility: "hidden" }}
						/>
					</noscript>
				)}
				{children}
				{/*
				 * APRÈS `{children}` : le rendu serveur est en profondeur d'abord, donc la
				 * collecte est complète à ce point précis. Placé avant, le panneau serait
				 * toujours vide.
				 */}
				{isEditMode && (
					<>
						{/* Bloc de données inerte : aucun rendu, aucune emprise sur la mise en page. */}
						<FootnoteAudit />
						{/*
						 * Construit le bandeau DANS LE DOCUMENT DE jCONTENT, au niveau du titre de
						 * page. L'iframe commençant sous le `moonstone-header`, c'est le seul moyen
						 * de s'y afficher — et cela met le Page Builder définitivement hors de
						 * portée : la page éditée ne reçoit que les données.
						 */}
						<script dangerouslySetInnerHTML={{ __html: auditPanel }} />
					</>
				)}
			</body>
		</html>
	);
};
