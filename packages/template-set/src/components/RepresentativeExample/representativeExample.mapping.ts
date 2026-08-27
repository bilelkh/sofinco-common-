import type { JCRNodeWrapper } from "org.jahia.services.content";
import type { RenderContext } from "org.jahia.services.render";
import type {
	RepresentativeExampleProps,
	TableRow,
	EmptyRepresentativeExampleProps,
} from "sofinco-react";
import type { RepresentativeExampleServerProps } from "./representativeExampleServer.types";
import type { TFunction } from "#lib/i18n";

import { str, num } from "#lib/jcr";
import { buildInsuranceVarMap, readSimulationRecord } from "#lib/insuranceVars";
import { readSimulationParams, readSimulationParamsState } from "#lib/simulationParams";
import { buildSimulatorCtaFromNode } from "#lib/simulatorCta";
import {
	getRepresentativeExampleBridge,
	toExampleData,
	type ExampleInsurance,
	type ProductVariant,
} from "./representativeExampleBridge";

/**
 * Mapping JCR (`sofnt:representativeExample`) → React props.
 *
 * Données simulateur lues via le mixin `sofmix:simulatorCta` directement sur
 * le node (simSourceId, simPredefinedCreditType, simAmount, simDuration).
 * CTA construit via `buildSimulatorCtaFromNode` (helper partagé cross-composants).
 * Bridge Java OSGi appelé pour le calcul TAEG/mensualités.
 */
export function mapRepresentativeExampleProps(
	node: JCRNodeWrapper,
	renderContext: RenderContext,
	t: TFunction,
): RepresentativeExampleProps | null {
	/*
	 * CONSOMMATEUR D'ABORD, calculateur seulement en dernier recours.
	 *
	 * `readSimulationRecord()` renvoie l'exemple de la PAGE, résolu une seule fois par rendu et
	 * partagé avec la substitution des jetons `{{taea}}` des mentions. Ce composant ne déclenche
	 * donc plus d'appel APIM qui lui soit propre : c'est tout l'objet du filtre `sofinco-core`.
	 *
	 * Le repli ne sert qu'aux nœuds NON ENCORE MIGRÉS, qui portent toujours leurs propres
	 * `product` / `sourceId` / `amount` / `dueNumber` / `scaleCode`. Il disparaîtra avec eux, à
	 * la seconde livraison (cf. `migrate-simulation-params-to-page.groovy`). Tant qu'il existe,
	 * une page migrée coûte un appel et une page non migrée en coûte un aussi — jamais deux.
	 */
	const raw = readSimulationRecord() ?? getRepresentativeExampleBridge()?.getExample(node) ?? null;
	const data = toExampleData(raw);
	if (!data) return null;

	// === Rows : libellé résolu via i18n local fr.json ===
	const rows: TableRow[] = data.rows.map((r) => ({
		label: r.labelParam ? t(r.labelKey, { mois: r.labelParam }) : t(r.labelKey),
		value: r.value,
		highlighted: r.highlighted,
	}));

	// === Mention d'assurance — priorité mention > config > fr.json ===
	const editorialMention = str(node, "mention");
	const insuranceLegalText = resolveInsuranceText(
		editorialMention,
		data.insuranceTextOverride,
		data.variant,
		data.exampleAmount,
		data.insurance,
		t,
	);

	const intro = str(node, "subtitle");
	const subtitle = intro ? substitutePlaceholders(intro, data.exampleAmount, data.insurance) : "";

	const cta =
		buildSimulatorCtaFromNode(node, renderContext, t, {
			ctaSection: "representative-example",
		}) ?? undefined;

	return {
		variant: data.variant,
		title: str(node, "jcr:title"),
		subtitle,
		amountLabel: t("representativeExample.amountLabel"),
		exampleAmount: data.exampleAmount,
		rows,
		insuranceLegalText,
		cta,
	};
}

/* ──────────────────────────────────────────────────────────────────────────
   Insurance text resolution — inchangée vs V1 (logique pure)
   ────────────────────────────────────────────────────────────────────────── */

function resolveInsuranceText(
	editorialMention: string,
	configOverride: string | undefined,
	variant: ProductVariant,
	exampleAmount: string,
	insurance: ExampleInsurance | undefined,
	t: TFunction,
): string {
	if (editorialMention) {
		return substitutePlaceholders(editorialMention, exampleAmount, insurance);
	}
	if (configOverride) {
		return substitutePlaceholders(configOverride, exampleAmount, insurance);
	}
	return buildInsuranceText(variant, exampleAmount, insurance, t);
}

/**
 * Substitution locale des jetons, à partir des valeurs calculées POUR CE COMPOSANT.
 *
 * La table d'alias vient de `#lib/insuranceVars` — source de vérité unique, partagée avec la
 * substitution globale de `str()`, la choicelist du CND et le menu CKEditor. Un jeton ne peut
 * exister que si le bridge sait produire sa valeur ; dupliquer la table ici ferait diverger
 * les deux listes et publierait des jetons jamais résolus.
 *
 * Redondant avec `str()` une fois les paramètres remontés sur la page — et sans effet de bord,
 * la substitution étant idempotente. Ce chemin reste néanmoins nécessaire tant que des nœuds
 * non migrés portent encore leurs propres paramètres.
 */
function substitutePlaceholders(
	text: string,
	exampleAmount: string,
	insurance: ExampleInsurance | undefined,
): string {
	const map = buildInsuranceVarMap({ exampleAmount, ...insurance });

	let result = text.replace(/\{\{(\w+)\}\}/g, (full, key: string) => map[key] ?? full);
	result = result.replace(/\{(\w+)\}/g, (full, key: string) => map[key] ?? full);
	return result;
}

function buildInsuranceText(
	variant: ProductVariant,
	exampleAmount: string,
	insurance: ExampleInsurance | undefined,
	t: TFunction,
): string {
	if (!insurance) return "";
	const key =
		variant === "pretPerso"
			? "representativeExample.insurance.pb"
			: variant === "rachatCredit"
				? "representativeExample.insurance.rac"
				: "representativeExample.insurance.cr";

	return t(key, {
		exampleAmount,
		monthlyAmount: insurance.monthlyAmount ?? "",
		taea: insurance.taea ?? "",
		totalInsuranceCost: insurance.totalInsuranceCost ?? "",
		monthlyWithInsurance: insurance.monthlyWithInsurance ?? "",
		lastWithInsurance: insurance.lastWithInsurance ?? "",
		dueNumber: insurance.dueNumber ?? "",
		dueNumberMinusOne: insurance.dueNumberMinusOne ?? "",
	});
}

/**
 * Construit le bloc preview simulateur affiché en édition Jahia.
 *
 * Les paramètres ne sont plus portés par le composant mais par la PAGE
 * (`sofmix:simulationParams`, onglet Options). Cette vue devient donc un miroir en lecture
 * seule : elle affiche la valeur ET son origine, ce qui évite le ticket « les champs ont
 * disparu du formulaire » et indique où corriger.
 *
 * Trois états, que le contributeur doit pouvoir distinguer :
 *   - `absent`     : option non activée → on explique comment l'activer, sans afficher de
 *                    valeurs qui n'existent pas ;
 *   - `incomplete` : option activée, type de crédit non renseigné → la simulation reste
 *                    inactive, et c'est dit explicitement ;
 *   - `ready`      : les cinq paramètres, marqués « hérité de la page ».
 */
function buildSimulatorPreview(
	renderContext: RenderContext,
	t: TFunction,
): RepresentativeExampleServerProps["simulator"] {
	const heading = t("representativeExample.simulatorPreview.heading");
	const { state, params } = readSimulationParamsState(renderContext);

	if (state === "absent") {
		return {
			heading,
			state,
			notice: t("representativeExample.simulatorPreview.noParams"),
			items: [],
		};
	}
	if (state === "incomplete" || !params) {
		return {
			heading,
			state: "incomplete",
			notice: t("representativeExample.simulatorPreview.noProduct"),
			items: [],
		};
	}

	const AMOUNT_FORMATTER = new Intl.NumberFormat("fr-FR");
	const inherited = t("representativeExample.simulatorPreview.inherited");

	const productKey = `representativeExample.simulatorPreview.product.${params.product}`;
	const productLabel = t(productKey);

	return {
		heading,
		state,
		origin: inherited,
		items: [
			{
				label: t("representativeExample.simulatorPreview.fields.product"),
				value: productLabel !== productKey ? productLabel : params.product,
			},
			{
				label: t("representativeExample.simulatorPreview.fields.sourceId"),
				value: params.sourceId || "-",
			},
			{
				label: t("representativeExample.simulatorPreview.fields.amount"),
				value: `${AMOUNT_FORMATTER.format(params.amount)} €`,
			},
			{
				label: t("representativeExample.simulatorPreview.fields.duration"),
				value: `${params.duration} mois`,
			},
			{
				label: t("representativeExample.simulatorPreview.fields.scaleCode"),
				value: params.scaleCode || "-",
			},
		],
	};
}

export function mapRepresentativeExampleServerProps(
	node: JCRNodeWrapper,
	renderContext: RenderContext,
	t: TFunction,
): RepresentativeExampleServerProps {
	/*
	 * Lecture ordinaire, et c'est bien l'intention : cette vue n'existe qu'en mode édition, où
	 * `Layout` arme le registre SANS résolution. Les jetons `{{taea}}` arrivent donc bruts — ce
	 * que le contributeur doit voir pour les vérifier avant publication — et le contrôle
	 * statique alimente le panneau d'audit au passage, sans qu'aucun appel APIM ne soit émis.
	 */
	const mention = str(node, "mention");

	return {
		title: str(node, "jcr:title"),
		subtitle: str(node, "subtitle"),
		...(mention ? { mention } : {}),
		simulator: buildSimulatorPreview(renderContext, t),
		cta:
			buildSimulatorCtaFromNode(node, renderContext, t, {
				ctaSection: "representative-example",
			}) ?? undefined,
	};
}

/**
 * Vue dégradée — utilisée quand le bridge OSGi est absent ou que l'exemple
 * est introuvable. Affiche au moins le montant configuré (R.G. 3 — lisibilité
 * SEO/LLM), sans quoi la page perdrait aussi le `{{amount}}` du sous-titre.
 *
 * La PAGE d'abord, le composant ensuite : `amount` a migré vers `simAmount`
 * (`sofmix:simulationParams`) et le script de migration l'efface du composant.
 * Ne lire que le composant ferait disparaître le montant de toute page migrée,
 * silencieusement. L'ordre est celui du bridge — c'est la page que le
 * contributeur peut encore éditer, les champs du composant étant masqués.
 */
export function mapEmptyRepresentativeExampleProps(
	node: JCRNodeWrapper,
	renderContext: RenderContext,
	t: TFunction,
): EmptyRepresentativeExampleProps {
	const AMOUNT_FORMATTER = new Intl.NumberFormat("fr-FR");

	const configuredAmount = readSimulationParams(renderContext)?.amount ?? num(node, "amount", 0);
	const amount = configuredAmount ? `${AMOUNT_FORMATTER.format(configuredAmount)} €` : "";

	const intro = str(node, "subtitle");
	const subtitle = intro ? substitutePlaceholders(intro, amount, undefined) : undefined;

	return {
		title: str(node, "jcr:title"),
		subtitle,
		amountLabel: t("representativeExample.amountLabel"),
		amount,
		cta:
			buildSimulatorCtaFromNode(node, renderContext, t, {
				ctaSection: "representative-example",
			}) ?? undefined,
	};
}
