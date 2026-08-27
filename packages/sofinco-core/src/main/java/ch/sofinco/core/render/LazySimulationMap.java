package ch.sofinco.core.render;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.AbstractMap;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.function.Supplier;

/**
 * Map dont le contenu n'est calculé qu'au premier accès.
 *
 * <p>C'est ce qui rend gratuite la position du filtre avant le cache : une page entièrement servie
 * depuis le cache de fragments coûte <b>zéro appel APIM</b>, personne n'y lisant le porteur. Une
 * page qui rend au moins un consommateur en coûte exactement un, mutualisé entre tous.
 *
 * <p>{@code Map} et non POJO : le contrat avec le TypeScript est déjà {@code Map<String,Object>}
 * ({@code record["exampleAmount"]}), la paresse reste donc invisible côté TS.
 *
 * <p>Non thread-safe par choix — un attribut de requête est confiné à un thread de rendu.
 */
// Pas de `equals` propre malgré les champs ajoutés : l'égalité d'une Map est fixée par le
// contrat de java.util.Map (comparaison des entrées, AbstractMap.equals). Y mêler le
// fournisseur ou l'état de résolution violerait ce contrat.
@SuppressWarnings("java:S2160")
public final class LazySimulationMap extends AbstractMap<String, Object> {

    /**
     * Passer ce logger en DEBUG est le seul moyen d'observer, sur un serveur, si la paresse opère :
     * une ligne par requête ayant réellement appelé l'APIM, aucune ligne sur un fragment servi
     * depuis le cache.
     */
    private static final Logger LOG = LoggerFactory.getLogger(LazySimulationMap.class);

    private final Supplier<Map<String, Object>> supplier;

    private boolean resolved;
    private Map<String, Object> delegate;

    public LazySimulationMap(Supplier<Map<String, Object>> supplier) {
        this.supplier = supplier;
    }

    /**
     * Résout au premier besoin. Un fournisseur en échec donne une map vide, jamais une exception
     * propagée au rendu : le TypeScript laisse alors les jetons visibles, ce qui est voulu.
     */
    private Map<String, Object> delegate() {
        if (!resolved) {
            resolved = true;
            Map<String, Object> value;
            try {
                value = supplier.get();
            } catch (RuntimeException e) {
                // La cause est déjà journalisée avec le correlationId ; on ne trace ici que le fait
                // que CETTE requête a bien tenté de résoudre.
                LOG.debug("Résolution de l'exemple représentatif en échec : {}", e.getMessage());
                value = null;
            }
            // Vue non modifiable plutôt qu'une copie à chaque accès : `delegate()` est appelé par
            // get/size/containsKey/entrySet, une copie défensive par appel serait payée à chaque
            // lecture. Fige aussi l'`entrySet()` exposé, qui laissait sinon muter la map du
            // fournisseur.
            delegate = value != null ? Collections.unmodifiableMap(value) : Collections.emptyMap();
            LOG.debug("Exemple représentatif résolu pour cette requête — {} entrée(s)", delegate.size());
        }
        return delegate;
    }

    /** Vrai si la donnée a déjà été calculée — utilisé par les tests et la journalisation. */
    public boolean isResolved() {
        return resolved;
    }

    @Override
    public Set<Entry<String, Object>> entrySet() {
        return delegate().entrySet();
    }

    @Override
    public Object get(Object key) {
        return delegate().get(key);
    }

    @Override
    public boolean containsKey(Object key) {
        return delegate().containsKey(key);
    }

    @Override
    public int size() {
        return delegate().size();
    }

    @Override
    public boolean isEmpty() {
        return delegate().isEmpty();
    }
}
