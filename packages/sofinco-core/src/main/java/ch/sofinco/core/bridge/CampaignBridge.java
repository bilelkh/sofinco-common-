package ch.sofinco.core.bridge;

import org.jahia.services.content.JCRNodeWrapper;

import java.util.Map;

/**
 * Pont OSGi → JavaScript pour les variables de campagne.
 *
 * <p>Pendant de {@link RepresentativeExampleBridge}, mais pour l'enveloppe commerciale : bornes de
 * montant, de durée et de taux d'une provenance. Interface distincte parce que les deux n'ont pas
 * les mêmes préconditions — une campagne n'exige que la provenance, là où un exemple exige aussi le
 * type de crédit, le montant et la durée.
 *
 * <p>Renvoie une {@code Map} de {@code String} déjà FORMATÉS et prêts à substituer : le gabarit ne
 * doit pas avoir à savoir qu'un taux se rend avec trois décimales et un espace insécable.
 */
public interface CampaignBridge {

    /**
     * Jetons de campagne pour la page englobant un nœud.
     *
     * @param node un nœud de la page, ou la page elle-même
     * @return les jetons formatés, ou {@code null} si la page n'a pas de provenance exploitable
     */
    Map<String, Object> getCampaignVars(JCRNodeWrapper node);
}
