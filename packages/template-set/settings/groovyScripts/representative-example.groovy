import org.jahia.services.content.JCRSessionFactory
import javax.jcr.RepositoryException
import java.util.Locale

/*
 * ============================================================================
 * Bootstrap JCR de la configuration Representative Example
 * ============================================================================
 *
 * Script idempotent : peut être ré-exécuté plusieurs fois sans casser le node
 * ni écraser les textes éditoriaux modifiés par les contributeurs.
 *
 * Crée (ou met à jour) la structure suivante :
 *   /sites/sofinco/contents/site-settings (jnt:contentFolder)
 *     └─ representative-example-config (sofnt:representativeExampleConfig)
 *          - jcr:title          = "Configuration Exemple Représentatif"
 *          - defaultAmount      = 3000
 *          - defaultDuration    = 36
 *          - simulatorLoanUrl   = "/parcours-simulateur"
 *          - simulatorRacUrl    = "/parcours-simulateur-rac"
 *          - insurancePB        (i18n, texte richtext Sofinco par défaut)
 *          - insuranceCR        (i18n, texte richtext Sofinco par défaut)
 *          - insuranceRAC       (i18n, texte richtext Sofinco par défaut)
 *
 * STRATEGIE "SET IF ABSENT" :
 *   Les valeurs par défaut sont injectées UNIQUEMENT si la propriété est absente.
 *   Si un contributeur a déjà édité dans le backoffice, ses modifications sont
 *   préservées au prochain run du script.
 *
 * Le mixin sofmix:ctaSimulator (sur le composant sofnt:representativeExample)
 * lit ces URLs pour construire :
 *   - PB / CR → {simulatorLoanUrl}?predefinedCreditType=...&sourceId=...
 *   - RAC     → {simulatorRacUrl}?creditType=PB&project=RAC&sourceId=...
 * ============================================================================
 */

def siteKey = "sofinco"
def contentsPath = "/sites/${siteKey}/contents"

// Propriétés obsolètes à retirer si présentes
def obsoleteProperties = [
    "simulationUrl",
    "creditParamsUrl",
    "calculateUrl",
    "simulateurI18nPath",
    "originUrl",
    "mockMode"
]

// ----------------------------------------------------------------------------
// Textes par défaut Sofinco — alignés sur fr.json du template-set
// ----------------------------------------------------------------------------

def insurancePbDefault = '''Nous vous proposons de souscrire <a href="#">l'assurance emprunteur facultative</a><sup>(5)</sup> pour {{monthlyAmount}} supplémentaires par mois. Le Taux Annuel Effectif de l'Assurance (TAEA) est de {{taea}}. Le montant total dû au titre de l'assurance est de {{totalInsuranceCost}}. Le coût de l'assurance peut varier en fonction de votre situation personnelle.'''

def insuranceCrDefault = '''Pour un découvert utilisé de {{exampleAmount}}, remboursé en {{dueNumber}} mensualités. Avec l'assurance facultative, vos mensualités seront de {{dueNumberMinusOne}} x {{monthlyWithInsurance}} et la {{dueNumber}}e ajustée de {{lastWithInsurance}}. Le Taux Annuel Effectif de l'Assurance (TAEA) est de {{taea}}. Le coût mensuel additionnel est de {{monthlyAmount}}, soit un coût total assurance de {{totalInsuranceCost}}. Le coût de l'assurance peut varier en fonction de votre situation personnelle.'''

def insuranceRacDefault = '''Nous vous proposons de souscrire <a href="#">l'assurance emprunteur facultative</a><sup>(5)</sup> pour {{monthlyAmount}} supplémentaires par mois. Le Taux Annuel Effectif de l'Assurance (TAEA) est de {{taea}}. Le montant total dû au titre de l'assurance est de {{totalInsuranceCost}}. Le coût de l'assurance peut varier en fonction de votre situation personnelle.'''

// URLs simulateur Vue.js v2 par défaut
def simulatorLoanUrlDefault = '/parcours-simulateur'
def simulatorRacUrlDefault = '/parcours-simulateur-rac'

def session = JCRSessionFactory.getInstance().getCurrentSystemSession("default", Locale.FRENCH, null)

try {
    if (!session.nodeExists(contentsPath)) {
        println "[ERREUR] Le chemin ${contentsPath} n'existe pas. Vérifiez la clé du site."
        return
    }

    def contentsNode = session.getNode(contentsPath)
    def needsSave = false

    // -------------------------------------------------------------------------
    // 1. Dossier 'site-settings'
    // -------------------------------------------------------------------------
    def settingsFolder
    if (!contentsNode.hasNode("site-settings")) {
        settingsFolder = contentsNode.addNode("site-settings", "jnt:contentFolder")
        settingsFolder.addMixin("mix:title")
        settingsFolder.addMixin("jmix:i18n")
        settingsFolder.setProperty("jcr:title", "Paramètres du site")
        println "[OK] Création du dossier 'site-settings'."
        needsSave = true
    } else {
        settingsFolder = contentsNode.getNode("site-settings")
    }

    // -------------------------------------------------------------------------
    // 2. Node 'representative-example-config'
    // -------------------------------------------------------------------------
    def repexConfig
    def wasJustCreated = false

    if (!settingsFolder.hasNode("representative-example-config")) {
        repexConfig = settingsFolder.addNode(
            "representative-example-config",
            "sofnt:representativeExampleConfig"
        )
        repexConfig.setProperty("jcr:title", "Configuration Exemple Représentatif")
        repexConfig.setProperty("defaultAmount", 3000L)
        repexConfig.setProperty("defaultDuration", 36L)
        repexConfig.setProperty("simulatorLoanUrl", simulatorLoanUrlDefault)
        repexConfig.setProperty("simulatorRacUrl", simulatorRacUrlDefault)

        repexConfig.setProperty("insurancePB", insurancePbDefault)
        repexConfig.setProperty("insuranceCR", insuranceCrDefault)
        repexConfig.setProperty("insuranceRAC", insuranceRacDefault)

        println "[OK] Création du noeud 'representative-example-config' avec defaults Sofinco."
        wasJustCreated = true
        needsSave = true
    } else {
        repexConfig = settingsFolder.getNode("representative-example-config")
        println "[INFO] Noeud 'representative-example-config' déjà présent."
    }

    // -------------------------------------------------------------------------
    // 3. Sur node existant : compléter les propriétés manquantes (SET IF ABSENT)
    // -------------------------------------------------------------------------
    if (!wasJustCreated) {
        if (!repexConfig.hasProperty("jcr:title")) {
            repexConfig.setProperty("jcr:title", "Configuration Exemple Représentatif")
            println "[OK] Propriété 'jcr:title' ajoutée."
            needsSave = true
        }
        if (!repexConfig.hasProperty("defaultAmount")) {
            repexConfig.setProperty("defaultAmount", 3000L)
            println "[OK] Propriété 'defaultAmount' ajoutée (3000)."
            needsSave = true
        }
        if (!repexConfig.hasProperty("defaultDuration")) {
            repexConfig.setProperty("defaultDuration", 36L)
            println "[OK] Propriété 'defaultDuration' ajoutée (36)."
            needsSave = true
        }
        if (!repexConfig.hasProperty("simulatorLoanUrl")) {
            repexConfig.setProperty("simulatorLoanUrl", simulatorLoanUrlDefault)
            println "[OK] Propriété 'simulatorLoanUrl' initialisée (${simulatorLoanUrlDefault})."
            needsSave = true
        }
        if (!repexConfig.hasProperty("simulatorRacUrl")) {
            repexConfig.setProperty("simulatorRacUrl", simulatorRacUrlDefault)
            println "[OK] Propriété 'simulatorRacUrl' initialisée (${simulatorRacUrlDefault})."
            needsSave = true
        }
        if (!repexConfig.hasProperty("insurancePB")) {
            repexConfig.setProperty("insurancePB", insurancePbDefault)
            println "[OK] Propriété 'insurancePB' initialisée avec le texte Sofinco par défaut."
            needsSave = true
        }
        if (!repexConfig.hasProperty("insuranceCR")) {
            repexConfig.setProperty("insuranceCR", insuranceCrDefault)
            println "[OK] Propriété 'insuranceCR' initialisée avec le texte Sofinco par défaut."
            needsSave = true
        }
        if (!repexConfig.hasProperty("insuranceRAC")) {
            repexConfig.setProperty("insuranceRAC", insuranceRacDefault)
            println "[OK] Propriété 'insuranceRAC' initialisée avec le texte Sofinco par défaut."
            needsSave = true
        }
    }

    // -------------------------------------------------------------------------
    // 4. Cleanup des propriétés obsolètes
    // -------------------------------------------------------------------------
    obsoleteProperties.each { propName ->
        if (repexConfig.hasProperty(propName)) {
            repexConfig.getProperty(propName).remove()
            println "[CLEANUP] Propriété obsolète '${propName}' retirée."
            needsSave = true
        }
    }

    // -------------------------------------------------------------------------
    // 5. Save
    // -------------------------------------------------------------------------
    if (needsSave) {
        session.save()
        println ""
        println "[SUCCÈS] Configuration JCR mise à jour."
        println ""
        println "Etat final du node :"
        println "  Path             : ${repexConfig.path}"
        println "  defaultAmount    : ${repexConfig.getProperty('defaultAmount').long}"
        println "  defaultDuration  : ${repexConfig.getProperty('defaultDuration').long}"
        println "  simulatorLoanUrl : ${repexConfig.getProperty('simulatorLoanUrl').string}"
        println "  simulatorRacUrl  : ${repexConfig.getProperty('simulatorRacUrl').string}"
        println "  insurancePB      : ${repexConfig.hasProperty('insurancePB')  ? '(défini)' : '(absent)'}"
        println "  insuranceCR      : ${repexConfig.hasProperty('insuranceCR')  ? '(défini)' : '(absent)'}"
        println "  insuranceRAC     : ${repexConfig.hasProperty('insuranceRAC') ? '(défini)' : '(absent)'}"
    } else {
        println "[INFO] Toutes les configurations existent déjà et sont à jour. Aucune action requise."
    }

} catch (RepositoryException e) {
    println "[ERREUR JCR] Une erreur est survenue : " + e.getMessage()
    e.printStackTrace()
}
