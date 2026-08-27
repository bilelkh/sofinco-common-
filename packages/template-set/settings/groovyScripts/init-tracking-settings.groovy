import org.jahia.services.content.JCRSessionFactory
import javax.jcr.RepositoryException
import java.util.Locale

def siteKey = "sofinco"
def contentsPath = "/sites/${siteKey}/contents"

// Notice Didomi, fournie PAR ENVIRONNEMENT via la propriete systeme
// `sofinco.didomi.noticeId` (JVM Jahia : -Dsofinco.didomi.noticeId=<uuid>).
//
// AUCUNE valeur par defaut, et surtout pas celle de production : ce script s'execute au
// deploiement du module, donc sur toute recette ou dev fraichement provisionne. Y poser
// la notice de prod ferait remonter du consentement de recette dans le perimetre de la
// notice de production, cote console Didomi - un defaut par defaut VERS la prod, sur une
// donnee reglementee, que seul un `println` noye dans les logs de demarrage signalait.
//
// Vide = aucun `noticeId`, donc aucun loader emis (`readDidomiNoticeId` valide la valeur
// contre un UUID et rend "" sinon, cf. lib/tracking.ts) : pas de banniere, pas de tag
// conditionne au consentement. L'echec est visible et sans effet de bord, ce qui est le
// bon repli.
//
// Posee seulement a la creation du noeud : une valeur deja saisie n'est jamais ecrasee, et
// le champ reste modifiable dans jContent. La notice peut aussi etre restreinte a certains
// domaines - auquel cas la banniere ne s'affichera pas ailleurs, sans que ce soit un defaut
// du code.
def didomiNoticeId = System.getProperty("sofinco.didomi.noticeId", "")

def getOrCreateTranslationNode = { parent, lang ->
    def transName = "j:translation_${lang}"
    if (parent.hasNode(transName)) {
        return parent.getNode(transName)
    }
    def trans = parent.addNode(transName, "jnt:translation")
    trans.setProperty("jcr:language", lang)
    return trans
}

def session = JCRSessionFactory.getInstance().getCurrentSystemSession("default", Locale.FRENCH, null)
try {
    if (session.nodeExists(contentsPath)) {
        def contentsNode = session.getNode(contentsPath)
        def settingsFolder
        def needsSave = false

        if (!contentsNode.hasNode("site-settings")) {
            settingsFolder = contentsNode.addNode("site-settings", "jnt:contentFolder")
            settingsFolder.addMixin("mix:title")
            settingsFolder.addMixin("jmix:i18n")
            def trans = getOrCreateTranslationNode(settingsFolder, "fr")
            trans.setProperty("jcr:title", "Paramètres du site")
            println "[OK] Creation du dossier 'site-settings'."
            needsSave = true
        } else {
            settingsFolder = contentsNode.getNode("site-settings")
        }

        def trackingConfig
        if (!settingsFolder.hasNode("tracking-settings")) {
            trackingConfig = settingsFolder.addNode("tracking-settings", "sofnt:trackingSettings")
            def trans = getOrCreateTranslationNode(trackingConfig, "fr")
            trans.setProperty("jcr:title", "Tracking / Web analytics")
            println "[OK] Creation de 'tracking-settings'."
            needsSave = true
        } else {
            trackingConfig = settingsFolder.getNode("tracking-settings")
        }

        if (!trackingConfig.hasNode("ga")) {
            def gaNode = trackingConfig.addNode("ga", "sofnt:trackingGa")
            def trans = getOrCreateTranslationNode(gaNode, "fr")
            trans.setProperty("jcr:title", "Google Analytics (GTM)")
            println "[OK] Creation de 'tracking-settings/ga'."
            needsSave = true
        }

        if (!trackingConfig.hasNode("numberly")) {
            def nbNode = trackingConfig.addNode("numberly", "sofnt:trackingNumberly")
            def trans = getOrCreateTranslationNode(nbNode, "fr")
            trans.setProperty("jcr:title", "Numberly / Eulerian")
            println "[OK] Creation de 'tracking-settings/numberly'."
            needsSave = true
        }

        // CMP Didomi. `noticeId` n'est pas i18n : il vit sur le noeud, pas sur sa
        // traduction. Il n'est pose qu'ici, a la creation - relancer le script sur un
        // site existant ne touche a rien.
        if (!trackingConfig.hasNode("didomi")) {
            def didomiNode = trackingConfig.addNode("didomi", "sofnt:trackingDidomi")
            def trans = getOrCreateTranslationNode(didomiNode, "fr")
            trans.setProperty("jcr:title", "Consentement (Didomi)")
            if (didomiNoticeId) {
                didomiNode.setProperty("noticeId", didomiNoticeId)
                println "[OK] Creation de 'tracking-settings/didomi' avec la notice ${didomiNoticeId}."
            } else {
                println "[OK] Creation de 'tracking-settings/didomi' SANS notice."
                println "[ACTION] Aucune propriete systeme 'sofinco.didomi.noticeId' : le CMP reste"
                println "         inactif (aucun loader emis, aucun tag conditionne au consentement)."
                println "         Saisir la notice de CET environnement dans jContent"
                println "         (Parametres du site > Tracking > Consentement)."
            }
            needsSave = true
        }

        if (needsSave) {
            session.save()
            println "[SUCCES] Les configurations de tracking ont ete enregistrees."
        } else {
            println "[INFO] La configuration 'tracking-settings' (ga + numberly + didomi) existe deja."
        }

    } else {
        println "[ERREUR] Le chemin ${contentsPath} n'existe pas. Verifiez la cle du site."
    }
} catch (RepositoryException e) {
    println "[ERREUR JCR] " + e.getMessage()
}
