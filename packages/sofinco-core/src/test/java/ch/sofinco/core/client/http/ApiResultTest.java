package ch.sofinco.core.client.http;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ApiResultTest {

    @Test
    void successDiscrimination() {
        ApiResult r = new ApiResult(200, "{\"ok\":true}", "corr-1");
        assertThat(r.isSuccess()).isTrue();
        assertThat(r.isClientError()).isFalse();
        assertThat(r.isServerError()).isFalse();
        assertThat(r.isAuthFailure()).isFalse();
        assertThat(r.hasBody()).isTrue();
    }

    @Test
    void clientErrorDiscrimination() {
        ApiResult r = new ApiResult(400, "{\"code\":\"E400\"}", "corr-2");
        assertThat(r.isClientError()).isTrue();
        assertThat(r.isSuccess()).isFalse();
        assertThat(r.isAuthFailure()).isFalse();
    }

    @Test
    void authFailureDiscrimination() {
        assertThat(new ApiResult(401, "", "c").isAuthFailure()).isTrue();
        assertThat(new ApiResult(403, "", "c").isAuthFailure()).isTrue();
        assertThat(new ApiResult(404, "", "c").isAuthFailure()).isFalse();
    }

    @Test
    void serverErrorDiscrimination() {
        assertThat(new ApiResult(500, "", "c").isServerError()).isTrue();
        assertThat(new ApiResult(503, "", "c").isServerError()).isTrue();
        assertThat(new ApiResult(499, "", "c").isServerError()).isFalse();
    }

    @Test
    void hasBodyHandlesNullAndEmpty() {
        assertThat(new ApiResult(200, null, "c").hasBody()).isFalse();
        assertThat(new ApiResult(200, "", "c").hasBody()).isFalse();
        assertThat(new ApiResult(200, "{}", "c").hasBody()).isTrue();
    }

    @Test
    void toStringExcludesBody() {
        ApiResult r = new ApiResult(200, "secret-payload-token-xyz", "corr-99");
        String s = r.toString();
        assertThat(s).doesNotContain("secret-payload-token-xyz")
        .contains("corr-99")
        .contains("200");
    }
}
