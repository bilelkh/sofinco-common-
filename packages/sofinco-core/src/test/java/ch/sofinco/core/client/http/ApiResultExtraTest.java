package ch.sofinco.core.client.http;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cas additionnels pour {@link ApiResult} : limites des intervalles HTTP, format toString,
 * correlation id null-safe.
 */
class ApiResultExtraTest {

    // ----------------------------------------------------------------- limites des intervalles

    @Test
    void httpCode199_notSuccess() {
        assertThat(new ApiResult(199, "", "c").isSuccess()).isFalse();
    }

    @Test
    void httpCode200_isSuccess() {
        assertThat(new ApiResult(200, "", "c").isSuccess()).isTrue();
    }

    @Test
    void httpCode299_isSuccess() {
        assertThat(new ApiResult(299, "", "c").isSuccess()).isTrue();
    }

    @Test
    void httpCode300_notSuccess() {
        // Redirections 3xx ne sont PAS du succès du point de vue APIM (redirections désactivées).
        ApiResult r = new ApiResult(300, "", "c");
        assertThat(r.isSuccess()).isFalse();
        assertThat(r.isClientError()).isFalse();
        assertThat(r.isServerError()).isFalse();
    }

    @Test
    void httpCode399_notClientError() {
        assertThat(new ApiResult(399, "", "c").isClientError()).isFalse();
    }

    @Test
    void httpCode400_isClientError() {
        assertThat(new ApiResult(400, "", "c").isClientError()).isTrue();
    }

    @Test
    void httpCode499_isClientError() {
        assertThat(new ApiResult(499, "", "c").isClientError()).isTrue();
    }

    @Test
    void httpCode499_notServerError() {
        assertThat(new ApiResult(499, "", "c").isServerError()).isFalse();
    }

    @Test
    void httpCode500_isServerError() {
        assertThat(new ApiResult(500, "", "c").isServerError()).isTrue();
    }

    @Test
    void httpCode599_isServerError() {
        assertThat(new ApiResult(599, "", "c").isServerError()).isTrue();
    }

    @Test
    void httpCode600_notServerError() {
        assertThat(new ApiResult(600, "", "c").isServerError()).isFalse();
    }

    // ----------------------------------------------------------------- auth failures

    @Test
    void httpCode401_isAuthFailure() {
        assertThat(new ApiResult(401, "", "c").isAuthFailure()).isTrue();
    }

    @Test
    void httpCode403_isAuthFailure() {
        assertThat(new ApiResult(403, "", "c").isAuthFailure()).isTrue();
    }

    @Test
    void httpCode402_notAuthFailure() {
        // 402 (Payment Required) n'est PAS dans la liste auth.
        assertThat(new ApiResult(402, "", "c").isAuthFailure()).isFalse();
    }

    @Test
    void httpCode404_notAuthFailure() {
        assertThat(new ApiResult(404, "", "c").isAuthFailure()).isFalse();
    }

    // ----------------------------------------------------------------- toString — pas de leak du body

    @Test
    void toString_doesNotExposeBody_evenIfBodyContainsSecrets() {
        ApiResult r = new ApiResult(401, "{\"access_token\":\"secret-uuid-1234\"}", "corr-99");
        String s = r.toString();
        assertThat(s).doesNotContain("secret-uuid-1234")
        .doesNotContain("access_token");
    }

    @Test
    void toString_includesHttpCodeAndCorrelationId() {
        String s = new ApiResult(503, "anything", "corr-X").toString();
        assertThat(s).contains("503")
        .contains("corr-X");
    }

    @Test
    void toString_withNullCorrelationId() {
        // Ne doit pas crasher.
        String s = new ApiResult(200, "", null).toString();
        assertThat(s).contains("200");
    }

    // ----------------------------------------------------------------- hasBody

    @Test
    void hasBody_trueForJsonBody() {
        assertThat(new ApiResult(200, "{\"a\":1}", "c").hasBody()).isTrue();
    }

    @Test
    void hasBody_trueForSingleChar() {
        assertThat(new ApiResult(200, "x", "c").hasBody()).isTrue();
    }
}
