package ch.sofinco.core.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Optional;

import static ch.sofinco.core.service.RepexFixtures.req;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * Test white-box de la fonction pure {@link RepresentativeExampleServiceImpl#rejectionReason}.
 *
 * <p>Concern : <b>matrice produit × sourceCode × apimReady</b>. Test direct du contenu du
 * message retourné (les autres tests de la même couche valident l'effet observable via
 * {@link RepresentativeExampleServiceImpl#getExample}).
 */
class RepresentativeExampleServiceImplRejectionReasonTest {

    // ----------------------------------------------------------------- produit

    @Test
    void unknownProduct_returnsProductMessage() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("src", "ZZZ", 1L, 1L, null), true);
        assertThat(r).isPresent().get().asString().contains("inconnu").contains("ZZZ");
    }

    @Test
    void nullProduct_returnsProductMessage() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("src", null, 1L, 1L, null), true);
        assertThat(r).isPresent().get().asString().contains("inconnu");
    }

    @Test
    void emptyProduct_returnsProductMessage() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("src", "", 1L, 1L, null), true);
        assertThat(r).isPresent().get().asString().contains("inconnu");
    }

    // ----------------------------------------------------------------- sourceCode

    @Test
    void blankSourceCode_returnsSourceCodeMessage() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("", "PB", 1L, 1L, null), true);
        assertThat(r).isPresent().get().asString().contains("sourceCode");
    }

    @Test
    void nullSourceCode_returnsSourceCodeMessage() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req(null, "PB", 1L, 1L, null), true);
        assertThat(r).isPresent().get().asString().contains("sourceCode");
    }

    @Test
    void whitespaceOnlySourceCode_returnsSourceCodeMessage() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("   ", "PB", 1L, 1L, null), true);
        assertThat(r).isPresent().get().asString().contains("sourceCode");
    }

    // ----------------------------------------------------------------- apim readiness

    @Test
    void apimNotReady_returnsApimNotReadyMessage() {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("src", "PB", 1L, 1L, null), false);
        assertThat(r).isPresent().get().asString().contains("non prêt");
    }

    // ----------------------------------------------------------------- ordre de priorité des motifs

    @Test
    void productCheckedFirst_evenWhenSourceCodeAlsoBlank() {
        // Si product est inconnu ET sourceCode blank ET apim pas prêt, le motif "produit" gagne.
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("", "ZZZ", 1L, 1L, null), false);
        assertThat(r).isPresent().get().asString().contains("inconnu");
    }

    @Test
    void sourceCodeCheckedBeforeApimReadiness() {
        // Si product OK mais sourceCode blank ET apim pas prêt, le motif "sourceCode" gagne.
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("", "PB", 1L, 1L, null), false);
        assertThat(r).isPresent().get().asString().contains("sourceCode");
    }

    // ----------------------------------------------------------------- cas valides

    /**
     * Chaque produit supporté, plus la variante en minuscules : {@code CreditVariant.fromProduct}
     * applique {@code toUpperCase(Locale.ROOT)}, « pb » doit donc être accepté comme « PB ».
     */
    @ParameterizedTest(name = "product={0}")
    @ValueSource(strings = {"PB", "RAC", "CR", "pb"})
    void validRequest_hasNoRejectionReason(String product) {
        Optional<String> r = RepresentativeExampleServiceImpl.rejectionReason(
                req("src", product, 1L, 1L, null), true);
        assertThat(r).isEmpty();
    }
}
