package com.sofinco.jahia.oauth;

import org.json.JSONArray;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for {@link SofincoGroupSyncProcessor#parseGroups(Object)} — the defensive parser that
 * normalises the userinfo "groups" claim across the three shapes jahia-oauth can hand it in
 * (declared property =&gt; {@link JSONArray}, JSONPath enhancement =&gt; {@link java.util.Collection},
 * raw string =&gt; CSV/space-separated). All three branches must agree on empty-entry filtering, since
 * the result is matched against the managed-group universe.
 */
class SofincoGroupSyncProcessorTest {

    @Test
    void parseGroups_nullClaimYieldsEmptySet() {
        assertThat(SofincoGroupSyncProcessor.parseGroups(null)).isEmpty();
    }

    @Test
    void parseGroups_jsonArrayKeepsValuesAndDropsBlanks() {
        JSONArray array = new JSONArray(List.of("editors", "", "admins"));
        assertThat(SofincoGroupSyncProcessor.parseGroups(array))
                .containsExactlyInAnyOrder("editors", "admins");
    }

    @Test
    void parseGroups_collectionStringifiesEachElement() {
        assertThat(SofincoGroupSyncProcessor.parseGroups(List.of("editors", "admins")))
                .containsExactlyInAnyOrder("editors", "admins");
    }

    @Test
    void parseGroups_collectionDropsBlanks() {
        assertThat(SofincoGroupSyncProcessor.parseGroups(Arrays.asList("editors", "", "admins")))
                .containsExactlyInAnyOrder("editors", "admins");
    }

    @Test
    void parseGroups_collectionDropsNullElements() {
        // A null element must NOT become the literal "null" (String.valueOf(null)); the Collection branch
        // skips nulls like the JSONArray branch drops JSONObject.NULL.
        assertThat(SofincoGroupSyncProcessor.parseGroups(Arrays.asList("editors", null, "admins")))
                .containsExactlyInAnyOrder("editors", "admins");
    }

    @Test
    void parseGroups_stringSplitsOnCommaAndWhitespaceAndDropsBlanks() {
        assertThat(SofincoGroupSyncProcessor.parseGroups("editors, admins  viewers,"))
                .containsExactlyInAnyOrder("editors", "admins", "viewers");
    }

    @Test
    void parseGroups_deduplicatesAcrossShapes() {
        assertThat(SofincoGroupSyncProcessor.parseGroups("editors,editors admins"))
                .containsExactlyInAnyOrder("editors", "admins");
    }
}
