package ch.sofinco.core.util;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRPropertyWrapper;
import org.junit.jupiter.api.Test;

import javax.jcr.RepositoryException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JcrReadsTest {

    @Test
    void readString_returnsValueWhenPresent() throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        JCRPropertyWrapper prop = mock(JCRPropertyWrapper.class);
        when(node.hasProperty("product")).thenReturn(true);
        when(node.getProperty("product")).thenReturn(prop);
        when(prop.getString()).thenReturn("PB");

        assertThat(JcrReads.readString(node, "product")).isEqualTo("PB");
    }

    @Test
    void readString_returnsNullWhenAbsentBlankOrNullNode() throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.hasProperty("absent")).thenReturn(false);
        assertThat(JcrReads.readString(node, "absent")).isNull();
        assertThat(JcrReads.readString(null, "x")).isNull();

        JCRPropertyWrapper blank = mock(JCRPropertyWrapper.class);
        when(node.hasProperty("blank")).thenReturn(true);
        when(node.getProperty("blank")).thenReturn(blank);
        when(blank.getString()).thenReturn("   ");
        assertThat(JcrReads.readString(node, "blank")).isNull();
    }

    @Test
    void readString_swallowsRepositoryExceptionAsNull() throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        when(node.hasProperty("boom")).thenThrow(new RepositoryException("jcr down"));
        assertThat(JcrReads.readString(node, "boom")).isNull();
    }

    @Test
    void readLong_andReadLongOr() throws Exception {
        JCRNodeWrapper node = mock(JCRNodeWrapper.class);
        JCRPropertyWrapper prop = mock(JCRPropertyWrapper.class);
        when(node.hasProperty("amount")).thenReturn(true);
        when(node.getProperty("amount")).thenReturn(prop);
        when(prop.getLong()).thenReturn(15000L);
        when(node.hasProperty("missing")).thenReturn(false);

        assertThat(JcrReads.readLong(node, "amount")).isEqualTo(15000L);
        assertThat(JcrReads.readLong(node, "missing")).isNull();
        assertThat(JcrReads.readLongOr(node, "amount", 3000L)).isEqualTo(15000L);
        assertThat(JcrReads.readLongOr(node, "missing", 3000L)).isEqualTo(3000L);
        assertThat(JcrReads.readLongOr(null, "x", 42L)).isEqualTo(42L);
    }
}
