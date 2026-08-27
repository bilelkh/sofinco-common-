package ch.sofinco.core.model.representativeexample;

/**
 * Une ligne du tableau d'exemple représentatif.
 *
 * <p>Format attendu côté TS : {@code { labelKey, value, highlighted, labelParam? }}.
 * {@code labelKey} est une clé i18n générique (ex.
 * {@code "representativeExample.row.monthlyPayment"}) résolue côté TS ;
 * {@code highlighted} met la ligne en avant (typiquement "Montant total dû") ;
 * {@code labelParam} alimente les labels paramétrables (ex. nombre de mois).
 */
public record Row(String labelKey, String value, boolean highlighted, String labelParam) {

    /** Ligne normale (non highlighted) sans paramètre. */
    public Row(String labelKey, String value) {
        this(labelKey, value, false, null);
    }

    /** Ligne highlighted (typiquement le total dû). */
    public static Row highlighted(String labelKey, String value) {
        return new Row(labelKey, value, true, null);
    }

    /** Ligne paramétrée (ex. durée avec interpolation {@code {mois}}). */
    public static Row parameterized(String labelKey, String value, String labelParam) {
        return new Row(labelKey, value, false, labelParam);
    }
}
