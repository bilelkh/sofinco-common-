package ch.sofinco.core.model.apim;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TokenResponseTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void deserializesOAuth2Fields() throws Exception {
        String json = "{\"access_token\":\"87edea62\",\"scope\":\"default\","
                + "\"token_type\":\"Bearer\",\"expires_in\":1171}";
        TokenResponse r = mapper.readValue(json, TokenResponse.class);
        assertThat(r.accessToken()).isEqualTo("87edea62");
        assertThat(r.tokenType()).isEqualTo("Bearer");
        assertThat(r.scope()).isEqualTo("default");
        assertThat(r.expiresIn()).isEqualTo(1171L);
    }

    @Test
    void ignoresUnknownFields() throws Exception {
        String json = "{\"access_token\":\"x\",\"expires_in\":60,\"unexpected\":\"ignored\"}";
        TokenResponse r = mapper.readValue(json, TokenResponse.class);
        assertThat(r.accessToken()).isEqualTo("x");
        assertThat(r.expiresIn()).isEqualTo(60L);
    }
}
