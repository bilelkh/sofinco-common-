package ch.sofinco.core.model.apim;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ApimErrorTest {

    @Test
    void tryParse_arrayFormat() {
        String body = "[{\"code\":\"UOM_JWT\",\"shortlib\":\"Invalid token\"}]";
        ApimError err = ApimError.tryParse(body);
        assertThat(err).isNotNull();
        assertThat(err.code()).isEqualTo("UOM_JWT");
        assertThat(err.summary()).isEqualTo("UOM_JWT: Invalid token");
    }

    @Test
    void tryParse_wso2NestedFaultFormat() {
        String body = "{\"fault\":{\"code\":\"900901\",\"message\":\"Invalid Credentials\"}}";
        ApimError err = ApimError.tryParse(body);
        assertThat(err).isNotNull();
        assertThat(err.code()).isEqualTo("900901");
        assertThat(err.summary()).isEqualTo("900901: Invalid Credentials");
    }

    @Test
    void tryParse_plainObjectFormat() {
        String body = "{\"code\":\"E400\",\"shortlib\":\"Bad request\",\"longlib\":\"detail\"}";
        ApimError err = ApimError.tryParse(body);
        assertThat(err).isNotNull();
        assertThat(err.shortlib()).isEqualTo("Bad request");
    }

    @Test
    void tryParse_returnsNullOnNullEmptyOrMalformed() {
        assertThat(ApimError.tryParse(null)).isNull();
        assertThat(ApimError.tryParse("")).isNull();
        assertThat(ApimError.tryParse("<html>not json</html>")).isNull();
    }

    @Test
    void summary_fallbackChainAndEmpty() {
        ApimError codeOnly = new ApimError("C", null, null, null, null, null, null, null);
        assertThat(codeOnly.summary()).isEqualTo("C");

        ApimError viaMessage = new ApimError("C", null, null, null, "msg", null, null, null);
        assertThat(viaMessage.summary()).isEqualTo("C: msg");

        ApimError empty = new ApimError(null, null, null, null, null, null, null, null);
        assertThat(empty.summary()).isEqualTo("(no error details)");
    }
}
