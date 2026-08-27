package ch.sofinco.core.util;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JsonFacadeTest {

    @Test
    void roundTripSerialization() throws Exception {
        Pojo input = new Pojo("hello", 42);
        String json = JsonFacade.writeValueAsString(input);
        assertThat(json).contains("\"name\":\"hello\"").contains("\"count\":42");
        Pojo back = JsonFacade.readValue(json, Pojo.class);
        assertThat(back.name).isEqualTo("hello");
        assertThat(back.count).isEqualTo(42);
    }

    @Test
    void unknownFieldsIgnoredOnAnnotatedRecord() throws Exception {
        String json = "{\"name\":\"x\",\"count\":1,\"extra\":\"ignored\"}";
        Pojo p = JsonFacade.readValue(json, Pojo.class);
        assertThat(p.name).isEqualTo("x");
    }

    @Test
    void malformedJsonThrows() {
        assertThatThrownBy(() -> JsonFacade.readValue("not json", Pojo.class))
                .isInstanceOf(JsonProcessingException.class);
    }

    @Test
    void convertToLinkedMapPreservesKeyOrder() {
        Pojo input = new Pojo("foo", 7);
        Map<String, Object> map = JsonFacade.convertToLinkedMap(input);
        assertThat(map).containsKeys("name", "count");
    }

    @Test
    void readerForReturnsImmutableObjectReader() {
        assertThat(JsonFacade.readerFor(Pojo.class)).isNotNull();
        assertThat(JsonFacade.writer()).isNotNull();
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    record Pojo(@JsonProperty("name") String name, @JsonProperty("count") int count) {}
}
