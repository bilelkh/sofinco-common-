package com.sofinco.jahia.oauth;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the pure config-parsing helpers in {@link SofincoGroupConfig}. These drive the
 * managed-group "universe" and the group scope, so trimming / empty-entry / blank-key behaviour is
 * worth pinning down (a stray empty entry or un-normalised site key silently changes who gets synced).
 */
class SofincoGroupConfigTest {

    @Test
    void parseManagedGroups_trimsEntriesAndDropsBlanks() {
        assertThat(SofincoGroupConfig.parseManagedGroups(" a , b ,, c ,  "))
                .containsExactly("a", "b", "c");
    }

    @Test
    void parseManagedGroups_preservesOrderAndDeduplicates() {
        // LinkedHashSet => insertion order kept, duplicates collapsed.
        assertThat(SofincoGroupConfig.parseManagedGroups("z,a,z,a"))
                .containsExactly("z", "a");
    }

    @Test
    void parseManagedGroups_emptyStringYieldsEmptySet() {
        assertThat(SofincoGroupConfig.parseManagedGroups("")).isEmpty();
        assertThat(SofincoGroupConfig.parseManagedGroups("   ")).isEmpty();
    }

    @Test
    void parseManagedGroups_resultIsUnmodifiable() {
        assertThat(SofincoGroupConfig.parseManagedGroups("a"))
                .isUnmodifiable();
    }

    @Test
    void normalizeSiteKey_blankOrNullBecomesNullForServerLevel() {
        assertThat(SofincoGroupConfig.normalizeSiteKey(null)).isNull();
        assertThat(SofincoGroupConfig.normalizeSiteKey("")).isNull();
        assertThat(SofincoGroupConfig.normalizeSiteKey("   ")).isNull();
    }

    @Test
    void normalizeSiteKey_trimsRealKey() {
        assertThat(SofincoGroupConfig.normalizeSiteKey("  sofinco  ")).isEqualTo("sofinco");
    }
}
