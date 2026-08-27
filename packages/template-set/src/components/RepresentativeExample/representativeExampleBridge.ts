import { server } from "@jahia/javascript-modules-library";
import type { JCRNodeWrapper } from "org.jahia.services.content";
import { readString, readBoolean, type JavaRecord } from "#lib/javaBridge";

/**
 * Bridge OSGi Java pour le composant `sofnt:representativeExample`.
 *
 * Service Java : `ch.sofinco.core.bridge.RepresentativeExampleBridge`.
 * Méthode : `getExample(componentNode)` — lit directement les propriétés du
 * mixin `sofmix:simulatorCta` sur le node (simSourceId, simAmount, simDuration,
 * simPredefinedCreditType, scaleCode) et retourne le `JavaRecord` calculé.
 */

export const REPRESENTATIVE_EXAMPLE_BRIDGE = "ch.sofinco.core.bridge.RepresentativeExampleBridge";

export interface RepresentativeExampleBridge {
	getExample(componentNode: JCRNodeWrapper): JavaRecord | null;
}

export function getRepresentativeExampleBridge(): RepresentativeExampleBridge | null {
	const svc = server.osgi.getService(
		REPRESENTATIVE_EXAMPLE_BRIDGE,
	) as RepresentativeExampleBridge | null;
	if (!svc || typeof svc.getExample !== "function") return null;
	return svc;
}

/* ──────────────────────────────────────────────────────────────────────────
   Types & helpers de conversion JavaRecord → données typées
   (identiques à V1 — le shape Java est le même, seule la source change)
   ────────────────────────────────────────────────────────────────────────── */

export type ProductVariant = "pretPerso" | "creditRenouvelable" | "rachatCredit";

export interface ExampleRow {
	labelKey: string;
	value: string;
	highlighted: boolean;
	labelParam?: string;
}

export interface ExampleInsurance {
	monthlyAmount?: string;
	taea?: string;
	totalInsuranceCost?: string;
	monthlyWithInsurance?: string;
	lastWithInsurance?: string;
	dueNumber?: string;
	dueNumberMinusOne?: string;
}

export interface ExampleData {
	variant: ProductVariant;
	exampleAmount: string;
	rows: ExampleRow[];
	insurance?: ExampleInsurance;
	/**
	 * Texte d'assurance richtext optionnel défini sur le node config JCR
	 * (insurancePB / insuranceCR / insuranceRAC selon le variant).
	 * Si vide/null, le mapping retombe sur le fallback fr.json.
	 * Le `mention` du composant lui-même reste prioritaire sur cette valeur.
	 */
	insuranceTextOverride?: string;
}

export function toExampleData(record: JavaRecord | null): ExampleData | null {
	if (!record) return null;

	const rawRows = record["rows"] as ArrayLike<JavaRecord> | undefined;
	const rows: ExampleRow[] = [];
	if (rawRows) {
		for (let i = 0; i < rawRows.length; i++) {
			const r = rawRows[i];
			const labelParam = readString(r, "labelParam");
			rows.push({
				labelKey: readString(r, "labelKey"),
				value: readString(r, "value"),
				highlighted: readBoolean(r, "highlighted"),
				labelParam: labelParam || undefined,
			});
		}
	}

	const rawIns = record["insurance"] as JavaRecord | undefined;
	let insurance: ExampleInsurance | undefined;
	if (rawIns) {
		insurance = {
			monthlyAmount: readString(rawIns, "monthlyAmount") || undefined,
			taea: readString(rawIns, "taea") || undefined,
			totalInsuranceCost: readString(rawIns, "totalInsuranceCost") || undefined,
			monthlyWithInsurance: readString(rawIns, "monthlyWithInsurance") || undefined,
			lastWithInsurance: readString(rawIns, "lastWithInsurance") || undefined,
			dueNumber: readString(rawIns, "dueNumber") || undefined,
			dueNumberMinusOne: readString(rawIns, "dueNumberMinusOne") || undefined,
		};
	}

	const variantStr = readString(record, "variant");
	const variant: ProductVariant =
		variantStr === "pretPerso"
			? "pretPerso"
			: variantStr === "rachatCredit"
				? "rachatCredit"
				: "creditRenouvelable";

	const insuranceTextOverride = readString(record, "insuranceTextOverride");

	return {
		variant,
		exampleAmount: readString(record, "exampleAmount"),
		rows,
		insurance,
		insuranceTextOverride: insuranceTextOverride || undefined,
	};
}
