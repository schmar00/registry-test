
let ENDPOINT = 'https://fuseki.geoinformation.dev/inspire-at/sparql';

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
