package ch.sofinco.core.util;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.ObjectReader;
import com.fasterxml.jackson.databind.ObjectWriter;
import com.fasterxml.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Façade JSON statique du bundle. L'{@link ObjectMapper} sous-jacent est construit via
 * {@link JsonMapper#builder()} et n'est <b>jamais</b> exposé publiquement (Sonar S2386) —
 * uniquement des {@link ObjectReader}/{@link ObjectWriter} (immuables thread-safe) et
 * quelques méthodes de convenance.
 *
 * <p>Pourquoi : un {@code ObjectMapper} reste mutable — un consommateur pouvait appeler
 * {@code MAPPER.configure(...)} et corrompre l'état global du bundle. Toute config Jackson
 * globale doit être appliquée <b>uniquement ici</b> sur le builder.
 */
public final class JsonFacade {

    /** Instance privée — ne jamais exposer. */
    private static final ObjectMapper MAPPER = JsonMapper.builder().build();

    private JsonFacade() {
        // façade statique
    }

    /** {@link ObjectReader} immuable thread-safe pour la classe donnée. */
    public static ObjectReader readerFor(Class<?> type) {
        return MAPPER.readerFor(type);
    }

    /** {@link ObjectWriter} immuable thread-safe par défaut. */
    public static ObjectWriter writer() {
        return MAPPER.writer();
    }

    public static <T> T readValue(String content, Class<T> type) throws JsonProcessingException {
        return MAPPER.readValue(content, type);
    }

    public static <T> T readValue(InputStream in, Class<T> type) throws IOException {
        return MAPPER.readValue(in, type);
    }

    public static String writeValueAsString(Object value) throws JsonProcessingException {
        return MAPPER.writeValueAsString(value);
    }

    /**
     * Convertit un POJO/Jackson tree en {@link LinkedHashMap} préservant l'ordre des clés.
     * Utilisé par {@code ReviewServiceBridge} pour aplatir un {@code JsonNode} en map
     * JS-friendly sans exposer Jackson au runtime GraalJS.
     */
    public static Map<String, Object> convertToLinkedMap(Object value) {
        @SuppressWarnings("unchecked")
        LinkedHashMap<String, Object> map = MAPPER.convertValue(value, LinkedHashMap.class);
        return map;
    }
}
