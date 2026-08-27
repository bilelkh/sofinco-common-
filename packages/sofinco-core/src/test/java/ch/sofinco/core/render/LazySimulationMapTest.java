package ch.sofinco.core.render;

import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

// Les inspections de flux de l'IDE supposent qu'une Map locale jamais écrite reste vide : ici le
// contenu vient du fournisseur passé au constructeur, invisible pour elles. Lire sans jamais écrire
// est précisément ce que ces tests vérifient.
@SuppressWarnings({"MismatchedQueryAndUpdateOfCollection", "ConstantValue", "DataFlowIssue"})
class LazySimulationMapTest {

    private static Map<String, Object> sample() {
        Map<String, Object> insurance = new LinkedHashMap<>();
        insurance.put("taea", "1,20 %");
        Map<String, Object> simulation = new LinkedHashMap<>();
        simulation.put("exampleAmount", "3 000 €");
        simulation.put("insurance", insurance);
        return simulation;
    }

    /**
     * La raison d'être de la classe : une page entièrement servie depuis le cache de fragments ne
     * doit coûter AUCUN appel APIM. Tant que personne ne lit la map, le fournisseur dort.
     */
    @Test
    void supplierIsNotCalledUntilTheMapIsRead() {
        AtomicInteger calls = new AtomicInteger();
        LazySimulationMap map = new LazySimulationMap(() -> {
            calls.incrementAndGet();
            return sample();
        });

        assertThat(calls).hasValue(0);
        assertThat(map.isResolved()).isFalse();
    }

    @Test
    void supplierIsCalledOnceThenMemoized() {
        AtomicInteger calls = new AtomicInteger();
        LazySimulationMap map = new LazySimulationMap(() -> {
            calls.incrementAndGet();
            return sample();
        });

        assertThat(map).containsKey("exampleAmount")
            .containsEntry("exampleAmount","3 000 €");
        assertThat(map.get("insurance")).isInstanceOf(Map.class);
        assertThat(map).hasSize(2);

        assertThat(calls).hasValue(1);
        assertThat(map.isResolved()).isTrue();
    }

    /** Le contrat avec le TypeScript est `record["cle"]` : la map doit se comporter en Map. */
    @Test
    void exposesTheRecordExactlyAsAPlainMapWould() {
        LazySimulationMap map = new LazySimulationMap(LazySimulationMapTest::sample);

        assertThat(map).containsEntry("exampleAmount", "3 000 €")
                .containsKeys("exampleAmount", "insurance")
                .hasSize(2)
                .isNotEmpty();
    }

    /**
     * Un échec de calcul ne doit jamais casser le rendu de la page : le TypeScript retombe sur
     * « aucune donnée » et laisse les jetons visibles, ce qui est le comportement voulu.
     */
    @Test
    void throwingSupplierYieldsAnEmptyMapInsteadOfPropagating() {
        LazySimulationMap map = new LazySimulationMap(() -> {
            throw new IllegalStateException("APIM indisponible");
        });

        assertThat(map).isEmpty();
    }

    @Test
    void nullSupplierResultYieldsAnEmptyMap() {
        LazySimulationMap map = new LazySimulationMap(() -> null);

        assertThat(map).isEmpty();
    }

    @Test
    void aFailedResolutionIsNotRetried() {
        AtomicInteger calls = new AtomicInteger();
        LazySimulationMap map = new LazySimulationMap(() -> {
            calls.incrementAndGet();
            throw new IllegalStateException("APIM indisponible");
        });

        assertThat(map.get("taea")).isNull();
        assertThat(map.get("taea")).isNull();

        // Réessayer à chaque lecture multiplierait les appels sortants pendant une panne.
        assertThat(calls).hasValue(1);
    }
}
