package ch.sofinco.core.bridge;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import fr.sofinco.portal.jahia.model.AverageRate;
import fr.sofinco.portal.jahia.services.ReviewService;
import org.jahia.services.content.JCRNodeWrapper;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Vérifie que {@link ReviewServiceBridgeImpl} :
 *
 * <ul>
 *   <li>convertit correctement les {@link JsonNode} Jackson en {@link Map} plates pour le JS</li>
 *   <li>retourne {@link java.util.Collections#emptyList()} en cas d'exception upstream</li>
 *   <li>retourne {@code null} sur {@link #getAverageRate(JCRNodeWrapper)} en cas d'échec</li>
 *   <li>expose un seam d'injection {@code Supplier<ReviewService>} testable</li>
 * </ul>
 */
class ReviewServiceBridgeImplTest {

    private final JCRNodeWrapper config = mock(JCRNodeWrapper.class);

    @Test
    void fetchReviews_convertsJsonNodesToPlainMaps() throws Exception {
        ReviewService upstream = mock(ReviewService.class);
        JsonNode node = new ObjectMapper().readTree(
                "{\"firstname\":\"Marie\",\"lastname\":\"D\",\"rate\":5,\"review\":\"super\"}");
        when(upstream.fetchReviews(anyInt(), any(), anyInt(), any())).thenReturn(List.of(node));

        ReviewServiceBridge bridge = new ReviewServiceBridgeImpl(() -> upstream);
        List<Map<String, Object>> out = bridge.fetchReviews(10, "PB", 4, config);

        assertThat(out).hasSize(1);
        assertThat(out.get(0)).containsEntry("firstname", "Marie");
        assertThat(out.get(0)).containsEntry("review", "super");
    }

    @Test
    void fetchReviews_returnsEmptyListOnUpstreamException() {
        ReviewService upstream = mock(ReviewService.class);
        when(upstream.fetchReviews(anyInt(), any(), anyInt(), any()))
                .thenThrow(new RuntimeException("APIM down"));

        ReviewServiceBridge bridge = new ReviewServiceBridgeImpl(() -> upstream);
        assertThat(bridge.fetchReviews(10, "PB", 4, config)).isEmpty();
    }

    @Test
    void fetchReviews_returnsEmptyListOnNumberFormatException() {
        ReviewService upstream = mock(ReviewService.class);
        when(upstream.fetchReviews(anyInt(), any(), anyInt(), any()))
                .thenThrow(new NumberFormatException("got HTML, expected JSON"));

        ReviewServiceBridge bridge = new ReviewServiceBridgeImpl(() -> upstream);
        assertThat(bridge.fetchReviews(10, "PB", 4, config)).isEmpty();
    }

    @Test
    void getAverageRate_returnsFlatMap() {
        ReviewService upstream = mock(ReviewService.class);
        AverageRate rate = mock(AverageRate.class);
        when(rate.getRate()).thenReturn(4.7);
        when(rate.getNbReview()).thenReturn(1234);
        when(upstream.getAverageRate(any())).thenReturn(rate);

        ReviewServiceBridge bridge = new ReviewServiceBridgeImpl(() -> upstream);
        Map<String, Object> out = bridge.getAverageRate(config);

        assertThat(out).containsEntry("average", 4.7).containsEntry("nbReview", 1234);
    }

    @Test
    void getAverageRate_returnsNullOnUpstreamException() {
        ReviewService upstream = mock(ReviewService.class);
        when(upstream.getAverageRate(any())).thenThrow(new RuntimeException("proxy login page"));

        ReviewServiceBridge bridge = new ReviewServiceBridgeImpl(() -> upstream);
        assertThat(bridge.getAverageRate(config)).isNull();
    }

    @Test
    void getAverageRate_returnsNullWhenUpstreamReturnsNull() {
        ReviewService upstream = mock(ReviewService.class);
        when(upstream.getAverageRate(any())).thenReturn(null);

        ReviewServiceBridge bridge = new ReviewServiceBridgeImpl(() -> upstream);
        assertThat(bridge.getAverageRate(config)).isNull();
    }
}
