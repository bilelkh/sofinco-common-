package ch.sofinco.core.model.representativeexample;

import ch.sofinco.core.enums.CreditVariant;

import java.util.List;
import java.util.Map;

/**
 * Résultat agrégé d'un appel à {@code RepresentativeExampleService.getExample}.
 *
 * <p>Value object domaine immuable, transformé en {@code Map<String, Object>} JS-friendly par
 * {@code RepresentativeExampleBridgeImpl} avant exposition au runtime JavaScript Jahia.
 *
 * <ul>
 *   <li>{@code variant} : enum typé {@link CreditVariant}</li>
 *   <li>{@code productCode} : code produit retourné par l'APIM (ex. "PBPERSO")</li>
 *   <li>{@code exampleAmount} : montant formaté FR (ex. "15 000,00 €")</li>
 *   <li>{@code rows} : lignes du tableau (labelKey + value + highlighted + labelParam)</li>
 *   <li>{@code insurance} : map de placeholders camelCase pour le TS</li>
 *   <li>{@code insuranceTextOverride} : texte d'assurance éditorial JCR (null/empty si absent)</li>
 * </ul>
 */
public record RepresentativeExample(
        CreditVariant variant,
        String productCode,
        String exampleAmount,
        List<Row> rows,
        Map<String, String> insurance,
        String insuranceTextOverride) {
}
