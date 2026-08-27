package ch.sofinco.core.service;

import ch.sofinco.core.model.representativeexample.RepresentativeExample;
import ch.sofinco.core.model.representativeexample.SimulationRequest;

import java.util.Optional;

/**
 * Service OSGi métier qui calcule un exemple représentatif Sofinco.
 *
 * <p>Ordre de priorité de l'Origin appliqué en interne :
 * <ol>
 *   <li>{@code apimOrigin} de la config OSGi si renseigné non-vide</li>
 *   <li>sinon {@code requestOrigin} (auto-détecté par le bridge)</li>
 *   <li>sinon, pas de header Origin envoyé à l'APIM</li>
 * </ol>
 */
public interface RepresentativeExampleService {

    /**
     * Calcule l'exemple représentatif pour la demande donnée.
     *
     * @param request paramètres de simulation (produit, sourceCode, montant, durée, config JCR…)
     * @return optional vide si la config est incomplète ou l'APIM rejette, rempli sinon
     */
    Optional<RepresentativeExample> getExample(SimulationRequest request);
}
