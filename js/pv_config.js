
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
    
}

var ws = {
    endpoint: ENDPOINT,
    getProject: function (uri) {
        return config.getProject(uri);
    },
    doc: function (query, thenFunc) {
        return fetch(this.endpoint + '?query=' + encodeURIComponent(query) + '&format=json').then(thenFunc);
    },
    json: function (uriPart, query, filteredItem, thenFunc) {
        query = ws.processSparql(uriPart, query, filteredItem);
        return fetch(this.endpoint + '?query=' + encodeURIComponent(query) + '&format=json')
            .then(res => res.json())
            .then(thenFunc)
            .catch(error => $('#pageContent').append(`<br>no results for <br>URI: <span style="color: red;"><strong>${uriPart}</strong></span> <br>`));
    },
    docJson: function (query, thenFunc) {
        return fetch(this.endpoint + '?query=' + encodeURIComponent(query) + '&format=json')
            .then(res => res.json())
            .then(thenFunc);
    },
    projectJson: function (projectId, query, filteredItem, thenFunc) { 
        console.log(query)
        query = ws.processSparql(projectId, query, filteredItem);
        console.log(query)
        return fetch(this.endpoint + '?query=' + encodeURIComponent(query) + '&format=json')
            .then(res => res.json())
            .then(thenFunc)
            .catch(error => {
                if (!$('#outOfService').length) {
                    $('#rightSidebar').append(`<div id="outOfService" class="alert alert-dismissible alert-primary">
                                                <button type="button" class="close" data-dismiss="alert">&times;</button>
                                                <h4 class="alert-heading">Service downtime:</h4>
                                                    <p class="mb-0">
                                                        PV is currently not available!
                                                    </p>
                                                </div>`);
                }
            });
    },
    processSparql: function (projectId, query, filteredItem) {
        let project = projectId ? config.projectConfiguration[projectId] : null;
        let filter = project ? config.projectConfiguration[projectId].filter : null;
        if (!filter) {
            filter = "";
        }
        if (!filteredItem) {
            filteredItem = "c";
        }
        query = query.replaceAll('@@filter', filter).replaceAll('@@item', filteredItem);

        let from = project ? project.from : null;
        if (!from) {
            from = "";
        }
        query = query.replaceAll('@@from', from);

        return query;
    },
    getProjUrl: function (projectId, query) {}
};