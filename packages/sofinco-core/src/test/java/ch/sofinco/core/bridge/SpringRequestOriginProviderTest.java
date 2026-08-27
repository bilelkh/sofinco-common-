package ch.sofinco.core.bridge;

import org.junit.jupiter.api.Test;

import javax.servlet.http.HttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class SpringRequestOriginProviderTest {

    @Test
    void originFrom_omitsDefaultHttpsPort() {
        HttpServletRequest req = request("https", "www.sofinco.fr", 443);
        assertThat(SpringRequestOriginProvider.originFrom(req)).isEqualTo("https://www.sofinco.fr");
    }

    @Test
    void originFrom_keepsNonDefaultPort() {
        HttpServletRequest req = request("http", "localhost", 8080);
        assertThat(SpringRequestOriginProvider.originFrom(req)).isEqualTo("http://localhost:8080");
    }

    @Test
    void originFrom_returnsNullOnMissingData() {
        assertThat(SpringRequestOriginProvider.originFrom(null)).isNull();
        assertThat(SpringRequestOriginProvider.originFrom(request("", "host", 80))).isNull();
        assertThat(SpringRequestOriginProvider.originFrom(request("http", "", 80))).isNull();
    }

    @Test
    void currentOrigin_returnsNullWithoutRequestContext() {
        // hors contexte HTTP (RequestContextHolder vide) → null, sans exception
        assertThat(new SpringRequestOriginProvider().currentOrigin()).isNull();
    }

    private static HttpServletRequest request(String scheme, String host, int port) {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getScheme()).thenReturn(scheme);
        when(req.getServerName()).thenReturn(host);
        when(req.getServerPort()).thenReturn(port);
        return req;
    }
}
