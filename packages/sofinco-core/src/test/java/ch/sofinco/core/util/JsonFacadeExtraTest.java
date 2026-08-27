package ch.sofinco.core.util;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Cas additionnels pour {@link JsonFacade}.
 */
class JsonFacadeExtraTest {

    @Test
    void readValue_fromInputStream() throws Exception {
        String json = "{\"name\":\"streamed\",\"count\":99}";
        InputStream in = new ByteArrayInputStream(json.getBytes(StandardCharsets.UTF_8));
        Pojo p = JsonFacade.readValue(in, Pojo.class);
        assertThat(p.name).isEqualTo("streamed");
        assertThat(p.count).isEqualTo(99);
    }

    @Test
    void readerForReturnsThreadSafeImmutable() {
        // Les ObjectReader sont thread-safe par contrat Jackson — on vérifie au moins qu'ils ne sont pas null.
        assertThat(JsonFacade.readerFor(Pojo.class)).isNotNull();
        assertThat(JsonFacade.readerFor(Object.class)).isNotNull();
    }

    @Test
    void writerReturnsThreadSafeImmutable() {
        assertThat(JsonFacade.writer()).isNotNull();
    }

    @Test
    void writeValueAsString_nullProducesJsonNullToken() throws Exception {
        // Sérialiser null produit "null" (token JSON).
        assertThat(JsonFacade.writeValueAsString(null)).isEqualTo("null");
    }

    @Test
    void readValue_throwsJsonProcessingExceptionOnMalformedInput() {
        assertThatThrownBy(() -> JsonFacade.readValue("{invalid json}", Pojo.class))
                .isInstanceOf(JsonProcessingException.class);
    }

    @Test
    void convertToLinkedMap_preservesOrderForRecord() {
        // Les records Jackson sérialisent les composants dans l'ordre de déclaration.
        OrderedPojo input = new OrderedPojo("z", "a", "m");
        Map<String, Object> map = JsonFacade.convertToLinkedMap(input);
        assertThat(map.keySet()).containsExactly("alpha", "beta", "gamma");
    }

    @Test
    void convertToLinkedMap_nestedObjectsRepresentedAsNestedMaps() {
        Nested input = new Nested("outer", new Pojo("inner", 7));
        Map<String, Object> map = JsonFacade.convertToLinkedMap(input);
        assertThat(map).containsKeys("label", "child");
        assertThat(map.get("child")).isNotNull();
    }

    @Test
    void roundTrip_withList_preservesOrder() throws Exception {
        WithList input = new WithList(List.of("a", "b", "c"));
        String json = JsonFacade.writeValueAsString(input);
        WithList back = JsonFacade.readValue(json, WithList.class);
        assertThat(back.items).containsExactly("a", "b", "c");
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Pojo(@JsonProperty("name") String name, @JsonProperty("count") int count) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record OrderedPojo(
            @JsonProperty("alpha") String alpha,
            @JsonProperty("beta") String beta,
            @JsonProperty("gamma") String gamma) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Nested(@JsonProperty("label") String label, @JsonProperty("child") Pojo child) {}

    @JsonIgnoreProperties(ignoreUnknown = true)
    record WithList(@JsonProperty("items") List<String> items) {}
}
