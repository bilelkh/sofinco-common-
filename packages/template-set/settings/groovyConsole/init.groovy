import org.jahia.osgi.BundleUtils
import org.jahia.osgi.FrameworkService
import org.apache.commons.io.IOUtils
import org.osgi.framework.Bundle

// --- CONFIGURATION ---
def moduleName = "sofinco-template"
def scriptsToRun = [
    "/META-INF/groovyScripts/init-mention-settings.groovy",
    "/META-INF/groovyScripts/avis-clients-settings.groovy",
    "/META-INF/groovyScripts/avis-verifie.groovy",
    "/META-INF/groovyScripts/init-site-settings.groovy",
    "/META-INF/groovyScripts/gestion-footer.groovy",
    "/META-INF/groovyScripts/init-tracking-settings.groovy",
    "/META-INF/groovyScripts/representative-example.groovy",
    "/META-INF/groovyScripts/init-simulator-settings.groovy",
    "/META-INF/groovyScripts/init-login-page.groovy",
    // Le cablage du champ de recherche a besoin du noeud `search` du menu : autocreated
    // sous sofnt:tabMenu (Menu/TabMenu/definition.cnd), lui-meme sous le sofnt:navMenu
    // pose par settings/import.xml. Si le menu n'existe pas encore, le script provisionne
    // quand meme page + bloc et signale le cablage restant a faire.
    "/META-INF/groovyScripts/init-search-page.groovy",
    "/META-INF/groovyScripts/gestion-reassurance-pictos.groovy",
    "/META-INF/groovyScripts/init-image-weight-policy.groovy",
    "/META-INF/groovyScripts/init-simulator-vars.groovy",
    "/META-INF/groovyScripts/init-structured-data-settings.groovy",
]

println "🚀 Démarrage de l'initialisation du site Sofinco..."
println "==================================================="

// 1. Recherche du bundle
Bundle bundle = BundleUtils.getBundle(moduleName)
if (bundle == null) {
    bundle = FrameworkService.getBundleContext().getBundles().find { b ->
        b.getSymbolicName() == moduleName
    }
}

if (bundle == null) {
    println "❌ ERREUR FATALE : Le module '${moduleName}' est introuvable."
    return
}

println "✅ Module trouvé : '${bundle.getSymbolicName()}' (version ${bundle.getVersion()}, state ${bundle.getState()})"
println "==================================================="

// 2. Boucle d'exécution
scriptsToRun.each { scriptPath ->
    println "▶️ Lecture de : ${scriptPath}"
    
    def resourceUrl = bundle.getResource(scriptPath)
    
    if (resourceUrl != null) {
        try {
            def scriptContent = IOUtils.toString(resourceUrl.openStream(), "UTF-8")
            evaluate(scriptContent)
            println "✅ Succès."
        } catch (Exception e) {
            println "❌ ERREUR lors de l'exécution :"
            println e.getMessage()
            e.printStackTrace()
        }
    } else {
        println "⚠️ INTROUVABLE : ${scriptPath} n'est pas dans le bundle."
    }
    println "---------------------------------------------------"
}

println "🏁 Initialisation terminée."
