package ch.sofinco.core.model.representativeexample;

/**
 * Interface partagée par {@link LoanProposal} et {@link RevolvingProposal}.
 *
 * <p>Capture les champs <em>logiquement communs</em> aux deux endpoints APIM (taux, assurance,
 * échéancier, durée) sans imposer une classe abstraite — les implémentations sont des records
 * Jackson immutables, incompatibles avec l'héritage de classe.
 *
 * <p>Le {@code contractFees} (loan-only) n'est <b>pas</b> dans l'interface : seuls les types
 * {@link LoanProposal} l'exposent, la type-safety empêche un usage erroné depuis du revolving.
 *
 * <p><b>Sealed</b> : seuls {@link LoanProposal} et {@link RevolvingProposal} sont autorisés à
 * implémenter ce type. Garantit l'exhaustivité des switch expressions chez les consommateurs
 * et empêche un troisième implémenteur incohérent.
 */
public sealed interface CommonProposal permits LoanProposal, RevolvingProposal {

    Integer dueNumber();

    Double annualDebitRate();

    Double annualGlobalEffectiveRate();

    Double annualInsuranceEffectiveRate();

    Double totalAmountWithoutInsurance();

    /**
     * Montant total dû, assurance comprise. Présent dans les deux records depuis toujours, remonté
     * ici pour alimenter le jeton {@code totalWithInsurance} — c'est une donnée d'exemple
     * représentatif courante que rien ne consommait.
     */
    Double totalAmountWithInsurance();

    Installment installmentWithoutInsurance();

    Installment installmentWithInsurance();

    InsuranceProposal borrowerInsurance();
}
