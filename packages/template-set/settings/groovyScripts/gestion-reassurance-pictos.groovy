import org.jahia.api.Constants
import org.jahia.services.content.JCRTemplate
import java.util.Locale

// --- CONFIGURATION ---
def siteKey = "sofinco"
def pageName = "reassurance-pictos"
def templateName = "reassurance-pictos"
// ---------------------

JCRTemplate.getInstance().doExecuteWithSystemSession(null, Constants.EDIT_WORKSPACE, { session ->

    def sitePath = "/sites/" + siteKey
    if (!session.nodeExists(sitePath)) {
        println "❌ Le site ${siteKey} n'existe pas."
        return null
    }

    def siteNode = session.getNode(sitePath)

    // 1. Création de la page "reassurance-pictos"
    if (!siteNode.hasNode(pageName)) {
        println "⏳ Création de la page ReassurancePictos et de ses composants..."

        def pageNode = siteNode.addNode(pageName, "jnt:page")

        // Propriétés de base
        pageNode.setProperty("j:templateName", templateName)

        // --- Traduction (UTF-8 et i18n) ---
        def frLocale = new Locale("fr")
        def translationNode = pageNode.getOrCreateI18N(frLocale)
        translationNode.setProperty("jcr:title", "Configuration Réassurance Pictos")

        // --- Nœud Zone (reassurancePictosArea) ---
        def areaNode = pageNode.addNode("reassurancePictosArea", "jnt:contentList")
        areaNode.addMixin("jmix:isAreaList")

        // --- Nœud Composant (mon-reassurance-pictos) ---
        // Le composant est créé vide — le PO/marketing contribue ses 4 pictos
        // via jContent en éditant la page "Configuration Réassurance Pictos".
        areaNode.addNode("mon-reassurance-pictos", "sofnt:reassurancePictos")

        session.save()
        println "✅ Structure générée avec succès : ${pageNode.getPath()}"

    } else {
        println "⏩ La page '${pageName}' existe déjà. Aucune action."
    }

    return null
})
