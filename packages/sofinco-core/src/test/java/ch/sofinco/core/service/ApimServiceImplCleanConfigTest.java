package ch.sofinco.core.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Régression du bug Docker observé en recette : la variable d'environnement
 * {@code SOFINCO_APIM_API_URL} arrive avec un espace de fin (lecture {@code .env} CRLF ou
 * heredoc shell). La concaténation {@code apimApiUrl + path} produisait alors une URL du type
 * {@code "https://rct-api.sofinco.fr /loanSimulation/..."}, faisait planter {@code URI.create()}
 * dans {@code SecurityChecks}, et déclenchait à tort le fail-closed « Bearer en clair via HTTP ».
 *
 * <p>{@link ApimServiceImpl#cleanConfigString(String)} strippe désormais toute valeur de config
 * en amont, sans exception ; un WARN ops est émis en parallèle pour signaler la source.
 *
 * <p>Couvre les 2 URLs unifiées (apimApiUrl, apimOrigin) + partnerId + apimClientKey.
 * Note : apimTokenUrl a été supprimé en juin 2026 — /token vit sur apimApiUrl désormais.
 *
 * <p><b>Convention de ce fichier</b> : les caractères whitespace non-ASCII (NBSP famille,
 * thin space, em space) sont construits via {@code String.valueOf(Character.toChars(0xXXXX))}
 * — garantit que le code point exact est utilisé indépendamment de l'encodage du fichier
 * source {@code .java} et de tout transcodage intermédiaire (copier-coller, sed, tooling).
 */
class ApimServiceImplCleanConfigTest {

    private static final String EXPECTED = "https://api.sofinco.fr";

    // --- code points whitespace non-ASCII reproductibles ---
    private static final String NBSP            = codePoint(0x00A0); // NO-BREAK SPACE
    private static final String FIGURE_SPACE    = codePoint(0x2007); // FIGURE SPACE
    private static final String NARROW_NBSP     = codePoint(0x202F); // NARROW NO-BREAK SPACE
    private static final String THIN_SPACE      = codePoint(0x2009); // THIN SPACE
    private static final String EM_SPACE        = codePoint(0x2003); // EM SPACE

    private static String codePoint(int cp) {
        return new String(Character.toChars(cp));
    }

    // ====================================================================== ASCII whitespace

    @Test
    void cleanConfigString_stripsTrailingSpace_dockerEnvCase() {
        // Cas typique observé en prod : trailing space depuis SOFINCO_APIM_API_URL=... \n
        assertThat(ApimConfigs.cleanConfigString("https://rct-api.sofinco.fr "))
                .isEqualTo("https://rct-api.sofinco.fr");
    }

    @Test
    void cleanConfigString_stripsLeadingAndTrailingWhitespace() {
        assertThat(ApimConfigs.cleanConfigString("  " + EXPECTED + "  ")).isEqualTo(EXPECTED);
    }

    @Test
    void cleanConfigString_stripsCrLf_dotEnvCrlfCase() {
        // Cas typique : .env CRLF Windows ou heredoc shell
        assertThat(ApimConfigs.cleanConfigString(EXPECTED + "\r\n")).isEqualTo(EXPECTED);
    }

    @Test
    void cleanConfigString_stripsLfOnly_unixLineEnding() {
        assertThat(ApimConfigs.cleanConfigString(EXPECTED + "\n")).isEqualTo(EXPECTED);
    }

    @Test
    void cleanConfigString_stripsTabCharacter() {
        assertThat(ApimConfigs.cleanConfigString("\t" + EXPECTED + "\t")).isEqualTo(EXPECTED);
    }

    // ====================================================================== NBSP family (non-ASCII)

    @Test
    void cleanConfigString_stripsNonBreakingSpace() {
        // U+00A0 NO-BREAK SPACE — typique d'un copier-coller depuis Word/Office/HTML.
        // Character.isWhitespace() retourne false pour ce code point (gotcha JDK), donc
        // String.strip() ne le couvre PAS. cleanConfigString utilise isSpaceChar en complément.
        String raw = NBSP + EXPECTED + NBSP;
        assertThat(ApimConfigs.cleanConfigString(raw)).isEqualTo(EXPECTED);
    }

    @Test
    void cleanConfigString_stripsFigureSpace() {
        // U+2007 FIGURE SPACE — utilisé dans les tableaux numériques alignés (PDF/Office).
        String raw = FIGURE_SPACE + EXPECTED + FIGURE_SPACE;
        assertThat(ApimConfigs.cleanConfigString(raw)).isEqualTo(EXPECTED);
    }

    @Test
    void cleanConfigString_stripsNarrowNoBreakSpace() {
        // U+202F NARROW NO-BREAK SPACE — séparateur de milliers FR (« 1 000 € »), fréquent
        // en copier-coller depuis des devis ou docs financiers FR.
        String raw = NARROW_NBSP + EXPECTED + NARROW_NBSP;
        assertThat(ApimConfigs.cleanConfigString(raw)).isEqualTo(EXPECTED);
    }

    @Test
    void cleanConfigString_stripsThinSpaceUnicode() {
        // U+2009 THIN SPACE — typographie fine. Couvert nativement par Character.isWhitespace().
        String raw = THIN_SPACE + EXPECTED + THIN_SPACE;
        assertThat(ApimConfigs.cleanConfigString(raw)).isEqualTo(EXPECTED);
    }

    @Test
    void cleanConfigString_stripsEmSpace() {
        // U+2003 EM SPACE — espace cadratine, copier-coller typographique.
        String raw = EM_SPACE + EXPECTED + EM_SPACE;
        assertThat(ApimConfigs.cleanConfigString(raw)).isEqualTo(EXPECTED);
    }

    @Test
    void cleanConfigString_stripsCombinedWhitespaceCocktail() {
        // Pire cas réaliste : tab + LF + espaces ASCII + NBSP + thin space (le plus crade).
        String raw = "\t  " + NBSP + EXPECTED + THIN_SPACE + "  \r\n";
        assertThat(ApimConfigs.cleanConfigString(raw)).isEqualTo(EXPECTED);
    }

    // ====================================================================== edge cases

    @Test
    void cleanConfigString_nullBecomesEmpty() {
        assertThat(ApimConfigs.cleanConfigString(null)).isEmpty();
    }

    @Test
    void cleanConfigString_emptyStaysEmpty() {
        assertThat(ApimConfigs.cleanConfigString("")).isEmpty();
    }

    @Test
    void cleanConfigString_whitespaceOnlyBecomesEmpty() {
        // Mix ASCII whitespace + NBSP — tout doit disparaître.
        String raw = "   \t\r\n" + NBSP + NARROW_NBSP + "   ";
        assertThat(ApimConfigs.cleanConfigString(raw)).isEmpty();
    }

    @Test
    void cleanConfigString_preservesValidUrlUnchanged() {
        assertThat(ApimConfigs.cleanConfigString(EXPECTED)).isEqualTo(EXPECTED);
    }

    @Test
    void cleanConfigString_doesNotStripInternalSpaces() {
        // On strippe les bords, on ne sanitize PAS le milieu — une URL avec espace interne
        // reste invalide et fera échouer SecurityChecks en aval (comportement attendu, pas
        // de masquage de bug de saisie réel).
        String raw = " https://rct-api.sofinco.fr /path ";
        assertThat(ApimConfigs.cleanConfigString(raw))
                .isEqualTo("https://rct-api.sofinco.fr /path");
    }

    // ====================================================================== couverture par champ

    @Test
    void cleanConfigString_protectsApimOrigin() {
        // apimOrigin → injecté en header HTTP Origin ; un saut de ligne casserait le header.
        assertThat(ApimConfigs.cleanConfigString("https://www.sofinco.fr\r\n"))
                .isEqualTo("https://www.sofinco.fr");
    }

    @Test
    void cleanConfigString_protectsApimClientKey() {
        // apimClientKey base64 — pas d'espace dans l'alphabet base64 ; strip safe.
        assertThat(ApimConfigs.cleanConfigString("Y29uc3VtZXJrZXk6Y29uc3VtZXJzZWNyZXQ=\n"))
                .isEqualTo("Y29uc3VtZXJrZXk6Y29uc3VtZXJzZWNyZXQ=");
    }

    // ====================================================================== helper isStripChar

    @Test
    void isStripChar_coversAsciiWhitespaceAndNbspFamily() {
        // Whitespace ASCII classique — couvert par Character.isWhitespace
        assertThat(ApimConfigs.isStripChar(' ')).isTrue();
        assertThat(ApimConfigs.isStripChar('\t')).isTrue();
        assertThat(ApimConfigs.isStripChar('\n')).isTrue();
        assertThat(ApimConfigs.isStripChar('\r')).isTrue();
        // NBSP famille — couvert UNIQUEMENT par Character.isSpaceChar
        assertThat(ApimConfigs.isStripChar((char) 0x00A0)).isTrue();
        assertThat(ApimConfigs.isStripChar((char) 0x2007)).isTrue();
        assertThat(ApimConfigs.isStripChar((char) 0x202F)).isTrue();
        // Thin space et em space — couverts par isWhitespace
        assertThat(ApimConfigs.isStripChar((char) 0x2009)).isTrue();
        assertThat(ApimConfigs.isStripChar((char) 0x2003)).isTrue();
        // Caractères réels — refusés
        assertThat(ApimConfigs.isStripChar('a')).isFalse();
        assertThat(ApimConfigs.isStripChar('/')).isFalse();
        assertThat(ApimConfigs.isStripChar(':')).isFalse();
        assertThat(ApimConfigs.isStripChar('0')).isFalse();
    }
}
