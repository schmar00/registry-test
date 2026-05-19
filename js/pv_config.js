
const ENDPOINT = 'https://fuseki.geoinformation.dev/inspire-at/sparql';
const DOMAIN = 'https://registry.inspire.gv.at';

const PAGE = {
    title: {
        de: 'Austrian INSPIRE Registry',
        en: 'Austrian INSPIRE Registry'
    },
    codelist: {
        heading: {
            de: 'Österreichisches Register für Codelisten',
            en: 'Austrian code list register'
        },
        subheading: {
            de: 'INSPIRE Daten- &amp; Dienste Provider und Codelisten',
            en: 'INSPIRE Data &amp; Service Providers and Code Lists'
        },
        desc: {
            de: 'Das österreichische Codelistenregister enthält Referenzcodes für Vokabulare und dessen Erweiterung für die INSPIRE Implementierung. Bestehende Codelisten und deren Werte können für weitere Anpassungen des kontrollierten Vokabulars ausserhalb INSPIRE verwendet werden.',
            en: 'The Austrian code list register provides reference codes for vocabulary extensions used for INSPIRE implementation. Existing code lists and their values can be used for further alignments of controlled vocabulary.'
        }
    },
    dataprovider: {
        heading: {
            de: 'Geodatenstellenregister INSPIRE Österreich',
            en: 'Austrian data provider register'
        },
        subheading: {
            de: 'INSPIRE Datenanbieter',
            en: 'INSPIRE data providers'
        },
        desc: {
            de: 'Das österreichische Geodatenstellenregister enthält die INSPIRE Datenanbieter.',
            en: 'The austrian data provider register contains the contributing data providers.'
        },
        tabheading: {
            de: 'weitere Geodatenstellen',
            en: 'more Data Providers'
        }
    }
}


/* 
Austrian INSPIRE Registry | Austrian INSPIRE Registry
Footer nur Englisch

codelists:
title: Registry
heading1: Österreichisches Register für Codelisten | Austrian code list register
text: Das österreichische Codelistenregister enthält Referenzcodes für Vokabulare und dessen Erweiterung für die INSPIRE Implementierung. Bestehende Codelisten und deren Werte können für weitere Anpassungen des kontrollierten Vokabulars ausserhalb INSPIRE verwendet werden.
textEN: The Austrian code list register provides reference codes for vocabulary extensions used for INSPIRE implementation. Existing code lists and their values can be used for further alignments of controlled vocabulary.

dataprovider:
title: Registry
heading1: Geodatenstellenregister INSPIRE Österreich | Austrian data provider register
text: Das österreichische Geodatenstellenregister enthält die INSPIRE Datenanbieter.
textEN: The austrian data provider register contains the contributing data providers.

About
Austrian INSPIRE Registry
Re3gistry features
Best practices
Re3gistry API
Access API
Documentation
Registry AT
User manual
Administrator manual
Contact
E-Mail

https://registry.inspire.gv.at/codelist/AustrianNatureProtectionSchema	Nature protection category
https://registry.inspire.gv.at/codelist/bglLandUseValue	BGL Land Use Value
https://registry.inspire.gv.at/codelist/BiotoptypenAT	National habitat types Austria
https://registry.inspire.gv.at/codelist/BiotopTypeWildlifeCorridor	Biotop Type Wildlife Corridor
https://registry.inspire.gv.at/codelist/DirectiveRelevance	Directive Relevance
https://registry.inspire.gv.at/codelist/feldstuecksnutzungsart	INVEKOS Feldstuecksnutzungsart
https://registry.inspire.gv.at/codelist/forestInventoryTypeValue	Forest Inventory Type
https://registry.inspire.gv.at/codelist/generalisierteHabitatkomplexe	Generalized Habitatcomplexes
https://registry.inspire.gv.at/codelist/ktnLandUseValue	KTN Land Use Value
https://registry.inspire.gv.at/codelist/LISALandCoverClassValue	LISA Land Cover Class
https://registry.inspire.gv.at/codelist/Naturraumregionen	Physiogeographic Ecoregions
https://registry.inspire.gv.at/codelist/NaturraumregionenSTMK	Physiogeographic Ecoregions Styria
https://registry.inspire.gv.at/codelist/noeLandUseValue	NOE Land Use Value
https://registry.inspire.gv.at/codelist/OgdCategoryAustria	OGD Category
https://registry.inspire.gv.at/codelist/ooeLandUseValue	OOE Land Use Value
https://registry.inspire.gv.at/codelist/PlanTypeNameValue	Plan Type Name
https://registry.inspire.gv.at/codelist/referenzart	INVEKOS Referenzart
https://registry.inspire.gv.at/codelist/sbgLandUseValue	SBG Land Use Value
https://registry.inspire.gv.at/codelist/schlagnutzungsart	INVEKOS Schlagnutzungsart
https://registry.inspire.gv.at/codelist/SoilType_BORIS_S172	BORIS Soil Type S172
https://registry.inspire.gv.at/codelist/SoilType_BORIS_S322	BORIS Soil Type S322
https://registry.inspire.gv.at/codelist/SoilType_BORIS_S330	BORIS Soil Type S330
https://registry.inspire.gv.at/codelist/specialisedZoneType	specialised Zone Type Code Austria
https://registry.inspire.gv.at/codelist/specialisedZoneTypeStmk	Zone Type Code Styria
https://registry.inspire.gv.at/codelist/SpecificExposedElementTypeGZP	specific exposed area regarding GZP
https://registry.inspire.gv.at/codelist/specificExposedElementTypeWLV	specific exposed element type of WLV
https://registry.inspire.gv.at/codelist/specificHazardTypeValue	specific exposed element type
https://registry.inspire.gv.at/codelist/stmLandUseValue	STM Land Use Value
https://registry.inspire.gv.at/codelist/vbgLandUseValue	VBG Land Use Value
https://registry.inspire.gv.at/codelist/ZoneTypeCodeAt	Zone Type Code Austria Extension



https://registry.inspire.gv.at/dataprovider/0001" 0001 Österreichische Agentur für Gesundheit und Ernährungssicherheit GmbH
https://registry.inspire.gv.at/dataprovider/0002" 0002 Bundesamt für Eich- und Vermessungswesen
https://registry.inspire.gv.at/dataprovider/0003" 0003 Bundesministerium für Finanzen
https://registry.inspire.gv.at/dataprovider/0006" 0006 Bundesforschungs- und Ausbildungszentrum für Wald, Naturgefahren und Landschaft
https://registry.inspire.gv.at/dataprovider/0008" 0008 Umweltbundesamt GmbH
https://registry.inspire.gv.at/dataprovider/0009" 0009 Forsttechnischer Dienst für Wildbach- und Lawinenverbauung
https://registry.inspire.gv.at/dataprovider/0010" 0010 Bundesministerium
https://registry.inspire.gv.at/dataprovider/0011" 0011 ASFINAG Autobahnen- und Schnellstraßen-Finanzierungs-Aktiengesellschaft
https://registry.inspire.gv.at/dataprovider/0012" 0012 Austro Control
https://registry.inspire.gv.at/dataprovider/0013" 0013 ÖBB-Infrastruktur AG
https://registry.inspire.gv.at/dataprovider/0014" 0014 via donau - Österreichische Wasserstraßen-Gesellschaft mbH
https://registry.inspire.gv.at/dataprovider/0015" 0015 Geologische Bundesanstalt
https://registry.inspire.gv.at/dataprovider/0018" 0018 Land Burgenland - Amt der Burgenländischen Landesregierung
https://registry.inspire.gv.at/dataprovider/0019" 0019 Land Kärnten - Amt der Kärntner Landesregierung
https://registry.inspire.gv.at/dataprovider/0021" 0021 Land Oberösterreich - Amt der OÖ Landesregierung
https://registry.inspire.gv.at/dataprovider/0022" 0022 Land Salzburg - Amt der Salzburger Landesregierung
https://registry.inspire.gv.at/dataprovider/0023" 0023 Land Steiermark - Amt der Steiermärkischen Landesregierung
https://registry.inspire.gv.at/dataprovider/0024" 0024 Land Tirol - Amt der Tiroler Landesregierung
https://registry.inspire.gv.at/dataprovider/0025" 0025 Land Vorarlberg - Amt der Vorarlberger Landesregierung
https://registry.inspire.gv.at/dataprovider/0027" 0027 Statistik Austria
https://registry.inspire.gv.at/dataprovider/0033" 0033 Salzburg AG für Energie, Verkehr &amp; Telekommunikation
https://registry.inspire.gv.at/dataprovider/0038" 0038 Zentralanstalt für Meteorologie und Geodynamik
https://registry.inspire.gv.at/dataprovider/0043" 0043 Bundeskanzleramt Österreich
https://registry.inspire.gv.at/dataprovider/0046" 0046 Land Niederösterreich - Amt der NÖ Landesregierung
https://registry.inspire.gv.at/dataprovider/0049" 0049 Bundesministerium für Landesverteidigung
https://registry.inspire.gv.at/dataprovider/0051" 0051 Bundesministerium für Digitalisierung und Wirtschaftsstandort
https://registry.inspire.gv.at/dataprovider/0052" 0052 Land Wien - Amt der Wiener Landesregierung
https://registry.inspire.gv.at/dataprovider/0056" 0056 Bundesministerium für Bildung, Wissenschaft und Forschung
https://registry.inspire.gv.at/dataprovider/0061" 0061 Land-, forst- und wasserwirtschaftliches Rechenzentrum GmbH
https://registry.inspire.gv.at/dataprovider/0064" 0064 Netz Burgenland GmbH
https://registry.inspire.gv.at/dataprovider/0065" 0065 Netz Oberösterreich GmbH
https://registry.inspire.gv.at/dataprovider/0067" 0067 Netz Niederösterreich GmbH
https://registry.inspire.gv.at/dataprovider/0068" 0068 KNG-Kärnten Netz GmbH
https://registry.inspire.gv.at/dataprovider/0078" 0078 TINETZ-Tiroler Netze GmbH
https://registry.inspire.gv.at/dataprovider/0080" 0080 VERBUND Hydro Power GmbH
https://registry.inspire.gv.at/dataprovider/0090" 0090 Federal Institute of Agricultural Economics
https://registry.inspire.gv.at/dataprovider/0095" 0095 Agrarmarkt Austria
https://registry.inspire.gv.at/dataprovider/0111" 0111 Vorarlberger Energienetze GmbH
https://registry.inspire.gv.at/dataprovider/0115" 0115 Austrian Power Grid AG
https://registry.inspire.gv.at/dataprovider/0130" 0130 Energienetze Steiermark GmbH
https://registry.inspire.gv.at/dataprovider/0131" 0131 Österreichisches Institut für Verkehrsdateninfrastruktur
 */

var config = {
    init: function (any) {
        config.projects = [];

        for (const [projectId, project] of Object.entries(config.projectConfiguration)) {
            config.projects.push(project);
        }
    },
    getProject: function (uri) {
        let p = uri.split('/')[3];
        p = p.split('-')[0];
        return p;
    }
};

function addVocProj(vocProjects) {

    config.projectConfiguration = vocProjects;
    config.init(false);
    
    vocProjects.set('BORIS', {
        acronym: 'UBA',
        title: 'Umweltbundesamt GmbH',
        description: 'Spittelauer Lände 5, 1090 Wien',
        image: '',
        project_page: 'https://www.umweltbundesamt.at',
        rdf_download: []
    });

    vocProjects.set('schlagnutzungsart', {
        acronym: 'AMA',
        title: 'Agrarmarkt Austria',
        description: 'Dresdner Straße 70, 1200 Wien',
        image: '',
        project_page: 'https://www.ama.at',
        rdf_download: []
    });

    vocProjects.set('dataprovider', {
        acronym: 'NKS',
        title: 'Assistenzstelle',
        description: 'Die Schaffung der Assistenzstelle für die Umsetzung von INSPIRE AT wurde bei der Besprechung der Nationalen Koordinierungsstelle INSPIRE AT vom 30.03.2016 im Zuge der Schaffung eines Aktionsplans beschlossen.',
        image: '',
        project_page: 'https://www.inspire.gv.at/assistenzstelle',
        rdf_download: []
    });

    /*    vocProjects.set('keywords', {
            acronym: 'GIP-P keywords',
            title: 'Compilation of a keyword thesaurus',
            description: 'GIP-P WP4 introduces Linked Data technology to GeoERA projects is to enable a Semantic Text Search. Search for data is the basic task for all data infrastructures. It needs to put all keywords used to tag datasets into a single hierarchy like a thesaurus. Data queries then can use this kind of a word net also to get search results for similar keywords within a semantic radius. For metadata descriptions, the clarification of the meaning of textual attributes applies mainly to keywords and the implementation of a semantic search within a metadata catalog. Here WP4 strives for a compilation (SKOS thesaurus) of keywords with URIs suitable for tagging metadata (-> use case: Multilingual Semantic Text Search).',
            image: 'falte.png',
            project_page: 'http://geoera.eu/gip-p/',
            rdf_download: 'http://resource.geolba.ac.at/structure/export/keywords.rdf'
        });  */
}
