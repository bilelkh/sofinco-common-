package ch.sofinco.core.validation.image;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.validation.JCRNodeValidator;
import org.junit.jupiter.api.Test;

/**
 * Tests unitaires de {@link ImageWeightNodeValidator} : simple porteur du noeud,
 * annoté au niveau classe par {@link MaxImageWeight}.
 */
class ImageWeightNodeValidatorTest {

    @Test
    void getNode_returnsTheWrappedNode() {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        ImageWeightNodeValidator validator = new ImageWeightNodeValidator(node);

        assertThat(validator.getNode()).isSameAs(node);
    }

    @Test
    void getNode_toleratesNullNode() {
        ImageWeightNodeValidator validator = new ImageWeightNodeValidator(null);

        assertThat(validator.getNode()).isNull();
    }

    @Test
    void implementsJcrNodeValidatorContract() {
        assertThat(new ImageWeightNodeValidator(null)).isInstanceOf(JCRNodeValidator.class);
    }

    @Test
    void isAnnotatedWithMaxImageWeightAtClassLevel() {
        assertThat(ImageWeightNodeValidator.class.isAnnotationPresent(MaxImageWeight.class)).isTrue();
    }
}
