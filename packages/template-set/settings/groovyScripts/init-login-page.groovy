import org.jahia.services.content.JCRSessionFactory
import javax.jcr.RepositoryException
import java.util.Locale

// Provisions a /login page carrying the Sofinco OAuth login button (sofnt:loginButton) on each site.
// Idempotent: every node is guarded with has/exists checks, so re-running on deploy is a no-op.
// The button fires the jahia-oauth flow; its backend (SofincoApi) lives in packages/sofinco-core.
// French content rules : Locale.FRENCH + \uXXXX-escaped accents.

def siteKeys = ["sofinco"]

def session = JCRSessionFactory.getInstance().getCurrentSystemSession("default", Locale.FRENCH, null)

siteKeys.each { siteKey ->
    try {
        // Create the login page directly under the site root.
        def parentPath = "/sites/${siteKey}"

        if (!session.nodeExists(parentPath)) {
            println "[INFO] Site '${siteKey}' introuvable (${parentPath}) - page de connexion ignor\u00e9e."
            return
        }

        def parent = session.getNode(parentPath)
        if (parent.hasNode("login")) {
            println "[INFO] La page 'login' existe d\u00e9j\u00e0 sous ${parentPath}. Aucune action."
            return
        }

        // jnt:page + basic template (renders <Area name="main" />).
        def page = parent.addNode("login", "jnt:page")
        page.addMixin("mix:title")
        page.setProperty("j:templateName", "basic")
        page.setProperty("jcr:title", "Connexion") // session FRENCH -> routed to the fr translation

        // The "main" area list the basic template renders.
        def main = page.addNode("main", "jnt:contentList")
        main.addMixin("jmix:isAreaList")

        // The OAuth login button. buttonLabel left blank -> defaults to "Se connecter avec Sofinco".
        def button = main.addNode("loginButton", "sofnt:loginButton")
        button.setProperty("redirectUrl", "/jahia/dashboard")

        session.save()
        println "[OK] Page de connexion cr\u00e9\u00e9e : ${parentPath}/login (site '${siteKey}')."
    } catch (RepositoryException e) {
        println "[ERREUR JCR] Site '${siteKey}' : " + e.getMessage()
    }
}
