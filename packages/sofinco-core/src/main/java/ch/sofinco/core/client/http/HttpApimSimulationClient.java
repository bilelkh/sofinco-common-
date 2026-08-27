package ch.sofinco.core.client.http;

import ch.sofinco.core.client.ApimSimulationClient;
import ch.sofinco.core.enums.CreditVariant;
import ch.sofinco.core.exception.ApimErrorKind;
import ch.sofinco.core.exception.ApimException;
import ch.sofinco.core.model.apim.ApimError;
import ch.sofinco.core.model.representativeexample.CampaignResponse;
import ch.sofinco.core.model.representativeexample.LoanCalculateRequest;
import ch.sofinco.core.model.representativeexample.LoanCalculateResponse;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateRequest;
import ch.sofinco.core.model.representativeexample.RevolvingCalculateResponse;
import ch.sofinco.core.service.ApimService;
import ch.sofinco.core.util.JsonFacade;
import com.fasterxml.jackson.core.JsonProcessingException;

import java.io.IOException;
import java.util.Optional;
import java.util.function.UnaryOperator;
import java.util.regex.Pattern;

/**
 * Implémentation HTTP réelle de {@link ApimSimulationClient}. Construit l'URL, sérialise
 * le body JSON, délègue à {@link ApimHttpExecutor} (token + retry 401 + fail-closed HTTPS),
 * désérialise via {@link JsonFacade}.
 *
 * <p>Validation paramètres : {@code amount/duration > 0}, cast {@code long → int} borné
 * (anti-overflow silencieux), segments path APIM restreints à {@code [A-Za-z0-9._-]+}
 * (anti-manipulation type "../v2/admin"). Visible package pour tests.
 *
 * <h2>Contrat de retour</h2>
 *
 * <ul>
 *   <li>{@code Optional.of(...)} — APIM 2xx avec body parseable</li>
 *   <li>{@code Optional.empty()} — APIM non-2xx (4xx/5xx) ou body vide ; l'erreur est déjà loggée
 *       avec correlationId par {@link ApimHttpExecutor}</li>
 *   <li>{@link ApimException} avec {@link ApimErrorKind} typé — refus fail-closed ou auth KO</li>
 *   <li>{@link IOException} — transport ou parse JSON</li>
 * </ul>
 */
public class HttpApimSimulationClient implements ApimSimulationClient {

    /** Caractères autorisés dans un segment de path APIM ({@code partnerId}, {@code sourceCode}). */
    private static final Pattern SAFE_PATH_SEGMENT = Pattern.compile("[A-Za-z0-9._-]+");

    /** 401 persistant — l'executor a déjà retenté après refresh du token. */
    private static final int HTTP_UNAUTHORIZED = 401;
    /** Absence FRANCHE de la ressource. */
    private static final int HTTP_NOT_FOUND = 404;
    /** Ce que l'endpoint campagnes renvoie pour une provenance inconnue — cf. {@code callCampaignApi}. */
    private static final int HTTP_SERVER_ERROR = 500;

    /**
     * Chemins de la ressource campagne — un par racine APIM.
     *
     * <p><b>Les deux racines servent l'intégralité des campagnes</b>, vérifié en production dans
     * les deux sens : {@code NEOURL41} ({@code loan}) et {@code NEOURL02} ({@code revolving})
     * répondent en 200 sur l'une comme sur l'autre. La ressource {@code campaigns} est manifestement
     * un service unique exposé sous deux préfixes, sans URL canonique.
     *
     * <p>Le produit ne conditionne donc PAS le résultat : il choisit la racine cohérente avec
     * l'endpoint {@code calculate} correspondant, ce qui met le module à l'abri si la passerelle
     * venait à restreindre une racine à sa propre famille.
     */
    private static final String CAMPAIGN_PATH_LOAN =
            "/loanSimulation/v3/partners/%s/campaigns/%s";
    private static final String CAMPAIGN_PATH_REVOLVING =
            "/revolvingSimulation/v3/partners/%s/campaigns/%s";

    private final ApimService apimService;
    private final ApimHttpExecutor httpExecutor;

    /** Parser de body d'erreur APIM utilisé par l'executor pour produire un log structuré. */
    private final UnaryOperator<String> apimErrorParser = body -> {
        var err = ApimError.tryParse(body);
        return err != null ? err.summary() : null;
    };

    public HttpApimSimulationClient(ApimService apimService) {
        this(apimService, new ApimHttpExecutor(apimService));
    }

    /** Package-private pour injection d'un executor mock en test. */
    HttpApimSimulationClient(ApimService apimService, ApimHttpExecutor httpExecutor) {
        this.apimService = apimService;
        this.httpExecutor = httpExecutor;
    }

    @Override
    public Optional<LoanCalculateResponse> callLoanApi(String sourceCode, long amount, long duration,
                                                       String scaleCode, String effectiveOrigin)
            throws ApimException, IOException {
        validateAmountAndDuration(amount, duration);
        // PB et RAC partagent le même template loan — PRET_PERSO comme variant représentatif.
        var path = String.format(CreditVariant.PRET_PERSO.endpointPathTemplate(),
                safePathSegment(apimService.getPartnerId(), "partnerId"),
                safePathSegment(sourceCode, "sourceCode"));
        String url = apimService.getApiUrl() + path;
        var body = LoanCalculateRequest.forExample(
                String.valueOf(amount), safeIntCast(duration, "duration"), scaleCode);

        ApiResult result;
        try {
            result = httpExecutor.post(url, JsonFacade.writeValueAsString(body),
                    effectiveOrigin, apimErrorParser);
        } catch (JsonProcessingException e) {
            throw new IOException("Sérialisation body loan échouée", e);
        }

        return deserialize(result, LoanCalculateResponse.class);
    }

    @Override
    public Optional<RevolvingCalculateResponse> callRevolvingApi(String sourceCode, long amount, long duration,
                                                                 String effectiveOrigin)
            throws ApimException, IOException {
        validateAmountAndDuration(amount, duration);
        var path = String.format(CreditVariant.CREDIT_RENOUVELABLE.endpointPathTemplate(),
                safePathSegment(apimService.getPartnerId(), "partnerId"),
                safePathSegment(sourceCode, "sourceCode"));
        String url = apimService.getApiUrl() + path;
        var body = RevolvingCalculateRequest.forExample(
                amount, safeIntCast(duration, "duration"));

        ApiResult result;
        try {
            result = httpExecutor.post(url, JsonFacade.writeValueAsString(body),
                    effectiveOrigin, apimErrorParser);
        } catch (JsonProcessingException e) {
            throw new IOException("Sérialisation body revolving échouée", e);
        }

        return deserialize(result, RevolvingCalculateResponse.class);
    }

    /**
     * {@inheritDoc}
     *
     * <p>Routage aligné sur les appels {@code calculate} : PB et RAC vers {@code loanSimulation},
     * CR vers {@code revolvingSimulation}. Les deux racines servant en réalité la même ressource,
     * un produit erroné ou absent ne fait pas échouer l'appel — c'est ce qui permet au contrôle de
     * saisie d'interroger une campagne SANS présumer du produit qu'il doit justement vérifier.
     */
    @Override
    public Optional<CampaignResponse> callCampaignApi(String sourceCode, String product,
                                                      String effectiveOrigin)
            throws ApimException, IOException {
        var path = String.format(campaignPathTemplate(product),
                safePathSegment(apimService.getPartnerId(), "partnerId"),
                safePathSegment(sourceCode, "sourceCode"));
        String url = apimService.getApiUrl() + path;

        /*
         * 404 et 500 sont DES REPONSES, pas des pannes : c'est ainsi que cet endpoint herite
         * signale une provenance inexistante. Les declarer attendus les fait journaliser en
         * DEBUG plutot qu'en ERROR — sans quoi chaque code de campagne mal saisi en contribution
         * ecrivait dans le journal d'erreurs, celui-la meme ou une vraie panne APIM doit
         * ressortir.
         */
        ApiResult result = httpExecutor.get(url, effectiveOrigin, apimErrorParser,
                httpCode -> httpCode == HTTP_NOT_FOUND || httpCode == HTTP_SERVER_ERROR);

        /*
         * SEULS 404 ET 500 VALENT « PROVENANCE INEXISTANTE ».
         *
         * Le 500 n'est pas ce que dit le protocole, c'est ce que dit CET endpoint. Vérifié en
         * production : une provenance inconnue (`NEOURL028555`) renvoie
         * `HTTP 500 {"code":"10","lib":"unexpected SERVER ERROR"}`, là où un 404 serait attendu.
         * L'API est héritée et ne sera pas corrigée pour cette refonte. On assimile donc les deux
         * au même verdict, faute de pouvoir les distinguer. La contrepartie est assumée : pendant
         * un incident APIM répondant en 500, le contrôle de saisie refusera des provenances
         * pourtant valides.
         *
         * <b>Et RIEN D'AUTRE.</b> Étendre l'amalgame à 401 / 403 / 502 / 503 dirait au
         * contributeur que son code de campagne — correct — n'existe pas, à chaque expiration
         * d'identifiants APIM ou panne de passerelle, et rendrait toute page portant le mixin
         * insauvegardable. Ces codes retombent donc sur {@link #deserialize} : 401 y devient
         * {@link ApimErrorKind#AUTH_REJECTED}, le reste un {@code Optional.empty()} que
         * {@code CampaignLookup} traduit en « indisponible », lequel ne bloque aucune saisie.
         *
         * <b>Ce qui reste protégé</b> : une panne SANS réponse HTTP — coupure réseau, délai
         * dépassé, passerelle injoignable — lève une IOException et ne passe jamais par ici.
         *
         * Le RENDU n'est pas concerné : `callAndServe` traite l'exception et l'`Optional` vide
         * par le même repli sur la dernière campagne valide.
         */
        if (result.httpCode() == HTTP_NOT_FOUND || result.httpCode() == HTTP_SERVER_ERROR) {
            throw new ApimException(ApimErrorKind.RESOURCE_NOT_FOUND,
                    "Campagne introuvable pour la provenance '" + sourceCode
                            + "' (HTTP " + result.httpCode() + ")");
        }
        return deserialize(result, CampaignResponse.class);
    }

    /**
     * Convertit {@link ApiResult} en {@link Optional} typé.
     *
     * <ul>
     *   <li>2xx avec body → {@code Optional.of(...)}</li>
     *   <li>2xx sans body → {@code Optional.empty()}</li>
     *   <li>401 persistant (l'executor a déjà retenté) → {@link ApimException} typée
     *       {@link ApimErrorKind#AUTH_REJECTED}</li>
     *   <li>autres 4xx/5xx → {@code Optional.empty()} (l'executor a logué l'erreur avec
     *       le correlationId)</li>
     *   <li>parse JSON échoué sur un 2xx → {@link IOException}</li>
     * </ul>
     */
    private static <T> Optional<T> deserialize(ApiResult result, Class<T> type) throws ApimException, IOException {
        if (result.httpCode() == HTTP_UNAUTHORIZED) {
            throw new ApimException(ApimErrorKind.AUTH_REJECTED,
                    "APIM auth rejetée même après refresh du token (HTTP 401 persistant)");
        }
        if (!result.isSuccess() || !result.hasBody()) {
            return Optional.empty();
        }
        try {
            return Optional.ofNullable(JsonFacade.readValue(result.body(), type));
        } catch (IOException e) {
            throw new IOException("Réponse APIM 2xx illisible (parse JSON échoué)", e);
        }
    }

    /**
     * Racine APIM à interroger pour une campagne.
     *
     * <p>Un produit inconnu ou absent retombe sur {@code revolvingSimulation}. Le choix est
     * arbitraire et sans conséquence : les DEUX racines servent l'INTÉGRALITÉ des campagnes,
     * vérifié dans les quatre sens en production — {@code NEOURL41} ({@code loan}) et
     * {@code NEOURL02} ({@code revolving}) répondent en 200 sur l'une comme sur l'autre.
     *
     * <p>Le routage n'apporte donc aucune correction fonctionnelle : il aligne les chemins sur ceux
     * des appels {@code calculate}, et met le module à l'abri si la passerelle venait à restreindre
     * une racine à sa propre famille.
     */
    static String campaignPathTemplate(String product) {
        var variant = CreditVariant.fromProduct(product);
        return variant == null || variant.usesRevolvingApi()
                ? CAMPAIGN_PATH_REVOLVING
                : CAMPAIGN_PATH_LOAN;
    }

    /** Validation amont des paramètres métier. Visible package pour tests. */
    static void validateAmountAndDuration(long amount, long duration) {
        if (amount <= 0L) {
            throw new IllegalArgumentException("amount doit être > 0 (reçu : " + amount + ")");
        }
        if (duration <= 0L) {
            throw new IllegalArgumentException("duration doit être > 0 (reçu : " + duration + ")");
        }
    }

    /**
     * Valide qu'un segment destiné au path APIM ne contient que {@code [A-Za-z0-9._-]+}.
     * Empêche l'injection / manipulation via {@code sourceCode} ou {@code partnerId} avec
     * {@code /}, {@code "../"}, espaces. Visible package pour tests.
     */
    static String safePathSegment(String value, String fieldName) {
        if (value == null || !SAFE_PATH_SEGMENT.matcher(value).matches()) {
            throw new IllegalArgumentException(
                    fieldName + " invalide pour un segment APIM (attendu [A-Za-z0-9._-]+) : " + value);
        }
        return value;
    }

    /** Cast {@code long → int} borné — empêche l'overflow silencieux. Visible package pour tests. */
    static int safeIntCast(long value, String fieldName) {
        if (value < 1L || value > Integer.MAX_VALUE) {
            throw new IllegalArgumentException(
                    fieldName + " hors plage [1, " + Integer.MAX_VALUE + "] : " + value);
        }
        return (int) value;
    }
}
