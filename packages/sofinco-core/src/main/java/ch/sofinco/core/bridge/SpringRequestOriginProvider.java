package ch.sofinco.core.bridge;

import org.apache.commons.lang3.StringUtils;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.servlet.http.HttpServletRequest;

/**
 * Implémentation de {@link RequestOriginProvider} basée sur le thread-local Spring.
 *
 * <p>Le lookup thread-local (non testable) est isolé dans {@link #currentOrigin()} ; la conversion
 * {@code HttpServletRequest → Origin} est extraite dans {@link #originFrom} (package-private,
 * testable sans contexte HTTP).
 */
@Component(service = RequestOriginProvider.class, immediate = true)
public class SpringRequestOriginProvider implements RequestOriginProvider {

    private static final Logger LOG = LoggerFactory.getLogger(SpringRequestOriginProvider.class);

    private static final int HTTPS_DEFAULT_PORT = 443;
    private static final int HTTP_DEFAULT_PORT = 80;

    @Override
    public String currentOrigin() {
        try {
            var attrs = RequestContextHolder.getRequestAttributes();
            if (!(attrs instanceof ServletRequestAttributes)) {
                return null;
            }
            return originFrom(((ServletRequestAttributes) attrs).getRequest());
        } catch (IllegalStateException e) {
            LOG.debug("Pas de contexte requête HTTP courant : {}", e.getMessage());
            return null;
        }
    }

    /** Construit l'Origin à partir d'un request, en omettant le port par défaut. */
    static String originFrom(HttpServletRequest req) {
        if (req == null) {
            return null;
        }
        String scheme = req.getScheme();
        String host = req.getServerName();
        if (StringUtils.isBlank(scheme) || StringUtils.isBlank(host)) {
            return null;
        }
        int port = req.getServerPort();
        boolean defaultPort = ("https".equalsIgnoreCase(scheme) && port == HTTPS_DEFAULT_PORT)
                           || ("http".equalsIgnoreCase(scheme) && port == HTTP_DEFAULT_PORT);
        return defaultPort
                ? scheme + "://" + host
                : scheme + "://" + host + ":" + port;
    }
}
