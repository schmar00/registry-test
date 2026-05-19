//******************************************************************************************************
//*****START********************************************************************************************

let USER_LANG = (navigator.language || navigator.userLanguage).substring(0, 2);

if (USER_LANG !== 'de') {
    USER_LANG = 'en';
};

let BASE = location.protocol + '//' + location.host + location.pathname;

$(document).ready(function () {
    let vocProjects = new Map(); //key of vocProjects is identical with URI path! ??????????????
    //addVocProj(vocProjects); //-> var assigned in projects.js
    let urlParams = new URLSearchParams(window.location.search);
    
    insertSearchCard('search_widget'); //inserts search widget only


    if (urlParams.has('search')) {
        $('header').empty();
        $('header').removeClass('py-5');
        search(decodeURI(urlParams.get('search').replace(/[^a-z\p{L} -]/uig, "").slice(0, 20)), vocProjects);

    } else if (urlParams.has('uri')) {
        $('header').empty();
        $('header').removeClass('py-5');
        let baseURIs = ['https://registry.inspire.gv.at'];
        let raw = urlParams.get('uri');
        let uri = decodeURI((raw.slice(0, 30) == baseURIs[0]) ? raw : '');

        let voc_uri = uri.includes(baseURIs[0]) != uri.includes(baseURIs[1]); //true for geoscience.earth or europe-geology
        $('#pageContent').empty();

        let uriArr = uri.split('\/');

        if ((uriArr[3] == 'dataprovider' && uriArr.length == 4) || (uriArr[3] == 'codelist' && uriArr.length == 5)){
            showCodelist(uri);
        } else {

            details('pageContent', uri, voc_uri);
            if (voc_uri) {
                insertProjCards('proj_links', vocProjects, uri.includes(baseURIs[0]) ? uri.split('\/')[5] : uri.split('\/')[3]);
                //console.log('uri', uri, );


            }
        }

    } else {
        insertPageDesc(); //general intro
        insertCodelists(vocProjects, 'proj_desc');
        //$('#proj_links').append(`<hr><div style="text-align:center;"><strong>Data Provider</strong></div><hr>`);
        insertDataProviderList();
        insertProjCards('proj_links', vocProjects);   
    }
    initSearch(); //provides js for fuse search
});


function insertDataProviderList() {
    
    let query = encodeURIComponent(`PREFIX dcterms: <http://purl.org/dc/terms/>
                PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                PREFIX adms: <http://www.w3.org/ns/adms#>

                SELECT DISTINCT ?s (COALESCE(?l1,?l) AS ?label) (COUNT(?cl) AS ?count)
                WHERE {
                GRAPH ?graph {
                    ?s a skos:Concept; skos:prefLabel ?l; adms:status <http://inspire.ec.europa.eu/registry/status/valid> .
                    OPTIONAL {?s skos:prefLabel ?l1 . FILTER(LANG(?l1)='${USER_LANG}')}
                    FILTER(STRSTARTS(STR(?s), 'https://registry.inspire.gv.at/dataprovider'))
                }
                OPTIONAL {GRAPH ?graph {?s dcterms:relation ?cl .}
                    GRAPH ?otherGraph {?cl adms:status <http://inspire.ec.europa.eu/registry/status/valid> .}
                }
                }
                GROUP BY ?s ?label ?l1 ?l
                ORDER BY ?label`);

    fetch(ENDPOINT + '?query=' + query + '&format=json')
        .then(res => res.json()) 
        .then(jsonData => {
            $('#data_provider_list').empty();
            $('#data_provider_list_all').empty();

            jsonData.results.bindings.filter(x=>x.count.value > 0).forEach(a => { 
                let dp = `<div style="margin-bottom: 7px;"><a href="${BASE}?uri=${a.s.value}">${a.label.value}</a> <small>(${a.count.value})</small></div>`;
                $('#data_provider_list').append(dp);
            });
            jsonData.results.bindings.filter(x=>x.count.value == 0).forEach(b => { 
                let dp = `<div style="margin-bottom: 7px;"><a href="${BASE}?uri=${b.s.value}">${b.label.value}</a></div>`;
                $('#data_provider_list_all').append(dp);
            });            
        });
}

//************************     show CODELIST page     ****************************************************

function showCodelist(uri) {

    let query = encodeURIComponent(`PREFIX dcterms: <http://purl.org/dc/terms/>
            PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
            PREFIX adms:<http://www.w3.org/ns/adms#>
            select distinct ?g
            (CONCAT('<a href="${BASE}?uri=',STR(?URI),'">',?L,'</a>') as ?Label)
            (GROUP_CONCAT(distinct ?n; separator = '; ') as ?Notation)
            (GROUP_CONCAT(distinct ?D; separator = '; ') as ?Definition)
            (GROUP_CONCAT(distinct CONCAT('<a href="${BASE}?uri=',STR(?o),'">',?P,'</a>')) as ?Parent)
            (GROUP_CONCAT(distinct ?N; separator = '; ') as ?scopeNote)
            (COALESCE(?Lskos, ?Ldcterms) as ?title)
            (COALESCE(MIN(?desc), "Beschreibung nicht verfügbar") as ?Description)
            (MIN(CONCAT('<a href="', STR(?status), '">', REPLACE(STR(?status), "http://inspire.ec.europa.eu/registry/status/", ""), '</a>')) AS ?Status)
            where { GRAPH ?g {
            <${uri}> skos:hasTopConcept ?tc . ?tc skos:narrower* ?URI .
            ?URI skos:prefLabel ?L; adms:status ?status . #filter(lang(?L)="de")
            optional {?URI skos:notation ?n}
            optional {?URI skos:definition ?D . filter(lang(?D)="de")}
            optional {?URI skos:scopeNote ?N . filter(lang(?N)="de")}
            optional {?URI skos:broader ?o . ?o skos:prefLabel ?P . filter(lang(?P)="de")}
            optional {<${uri}> skos:prefLabel ?Lskos . filter(lang(?Lskos)="de")}
            optional {<${uri}> dcterms:title ?Ldcterms . filter(lang(?Ldcterms)="de")}
            optional {<${uri}> dcterms:description ?desc . filter(lang(?desc)="de")}
            }}
            group by ?URI ?L ?Lskos ?Ldcterms ?g
            order by ?L`);
    
    fetch(ENDPOINT + '?query=' + query + '&format=json')
        .then(res => res.json()) 
        .then(jsonData => {
            console.log(jsonData);
            console.log('query', decodeURIComponent(query));

            let tblFields = ['Label', 'Definition', 'Status', 'Parent']; 

            let data = jsonData.results.bindings.map(obj =>
                Object.fromEntries(
                    Object.entries(obj)
                        .filter(([key]) => tblFields.includes(key))
                        .map(([key, val]) => [key, val.value])
                ));
                console.log(data);

               $('#pageContent').append(`<h1 class="mt-4">${jsonData.results.bindings[0].title ? jsonData.results.bindings[0].title.value : 'Titel auf nicht verfügbar'}</h1>`);

                $('#pageContent').append(`
                        <a id="uriBtn"
                            href="javascript:
                            var dummy = $('<input>').val('${uri}').appendTo('body').select();
                            document.execCommand('copy');
                            dummy.remove();"><strong>URI:</strong>
                        </a>
                        <span id="uri" style="word-wrap: break-word;">
                            &nbsp;${uri}
                        </span>
                        <br><br><p>${jsonData.results.bindings[0].Description ? jsonData.results.bindings[0].Description.value : 'Beschreibung nicht verfügbar'}</p>
                        <hr>`);

// without pagination and sorting##############################################################
/*                 $('#CodeList').append(`<hr><div class="p-1 col-sm-12 sortable-table">
                    <table class="table table-hover" id="codelist"></table>
                </div>`);
        
            document.getElementById('codelist').innerHTML = '<thead><tr>' +
                Object.keys(data[0]).map(a => `<th scope="col" data-id="${a}" sortable>${a}</th>`).join('') +
                '</tr></thead>';

            const sortableTable = new SortableTable();
            // set table element
            sortableTable.setTable(document.querySelector('#codelist'));
            // set data to be sorted
            sortableTable.setData(data);
            // handling events
            sortableTable.events()
                .on('sort', (event) => {
                    console.log(`[SortableTable#onSort]
                            event.colId=${event.colId}
                            event.sortDir=${event.sortDir}
                            event.data=\n${JSON.stringify(event.data)}`);
                });

            $('.progress-bar').css('width', '100%').attr('aria-valuenow', 100);
            setTimeout(() => {
                $('.progress').hide();
            }, 300);
        }); */                        
//#############################################################################################
// with pagination and sorting (client-side)###################################################

                //dummy text for codelist info - to be replaced by actual metadata from SPARQL query
                $('#pageContent').append(`<div class="mb-3">This version: &nbsp;${jsonData.results.bindings[0].g.value}<br>
                Version history: &nbsp;&nbsp;<a href="#">${uri + ':' + (parseInt(jsonData.results.bindings[0].g.value.split(':')[2]) - 1)}</a><br>
                Status: &nbsp;&nbsp;<a href="#">Valid</a><br>
                Insert date: &nbsp;&nbsp;2022-11-28 14:31 UTC<br>
                Edit date: &nbsp;&nbsp;2022-04-20 15:54 UTC<br>
                Available formats: &nbsp;&nbsp;<a href="#">RDF/XML</a> &nbsp;&nbsp;<a href="#">TriG/Turtle</a> &nbsp;&nbsp;<a href="#">JSON-LD</a> &nbsp;&nbsp;<a href="#">CSV</a> &nbsp;&nbsp;<a href="#">Text</a></div><br>
                <div class="mb-3"><strong>Available items:</strong></div>`);


                $('#CodeList').append(`<hr>
                <div class="d-flex justify-content-between align-items-center mt-2">
                    <div class="small text-muted" id="codelist-info"></div>
                    <nav aria-label="Codelist pagination">
                        <ul class="pagination pagination-sm mb-0" id="codelist_pagination"></ul>
                    </nav>
                </div>
                <div class="p-1 col-sm-12 sortable-table">
                    <table class="table table-hover" id="codelist"></table>
                </div>`);
        
            // build table header
            document.getElementById('codelist').innerHTML = '<thead><tr>' +
                Object.keys(data[0]).map(a => `<th scope="col" data-id="${a}" sortable>${a}</th>`).join('') +
                '</tr></thead>';

            const sortableTable = new SortableTable();
            // set table element
            sortableTable.setTable(document.querySelector('#codelist'));

            // Pagination configuration
            const masterData = Array.isArray(data) ? data.slice() : [];
            const pageSize = 12; // change page size here
            let currentPage = 1;
            const totalPages = Math.max(1, Math.ceil(masterData.length / pageSize));

            function getPageSlice(page) {
                const start = (page - 1) * pageSize;
                return masterData.slice(start, start + pageSize);
            }

            function updateCodelistInfo() {
                const start = (masterData.length === 0) ? 0 : (currentPage - 1) * pageSize + 1;
                const end = Math.min(masterData.length, currentPage * pageSize);
                $('#codelist-info').text(`${start}–${end} of ${masterData.length}`);
            }

            function renderPagination() {
                const $ul = $('#codelist_pagination');
                $ul.empty();

                if (totalPages <= 1) {
                    $ul.hide();
                    return;
                }

                $ul.show();

                const makePageItem = (page, label = null, disabled = false, active = false) => {
                    const text = label || page;
                    const liClass = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
                    return `<li class="${liClass}"><a class="page-link codelist-page " href="#" data-page="${page}">${text}</a></li>`;
                };

                // Prev
                $ul.append(makePageItem(Math.max(1, currentPage - 1), 'Prev', currentPage === 1));

                // smart window for pages
                const maxVisible = 7;
                const half = Math.floor(maxVisible / 2);
                let start = 1;
                let end = totalPages;
                if (totalPages > maxVisible) {
                    start = Math.max(1, currentPage - half);
                    end = Math.min(totalPages, currentPage + half);
                    if (start === 1) end = maxVisible;
                    if (end === totalPages) start = totalPages - maxVisible + 1;
                }

                if (start > 1) {
                    $ul.append(makePageItem(1));
                    if (start > 2) $ul.append(`<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`);
                }

                for (let p = start; p <= end; p++) {
                    $ul.append(makePageItem(p, null, false, p === currentPage));
                }

                if (end < totalPages) {
                    if (end < totalPages - 1) $ul.append(`<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`);
                    $ul.append(makePageItem(totalPages));
                }

                // Next
                $ul.append(makePageItem(Math.min(totalPages, currentPage + 1), 'Next', currentPage === totalPages));

                // attach handler
                $ul.find('.codelist-page').off('click').on('click', function (e) {
                    e.preventDefault();
                    const p = Number($(this).data('page')) || 1;
                    if (p === currentPage) return;
                    currentPage = Math.max(1, Math.min(totalPages, p));
                    renderPage(currentPage);
                });
            }

            function sortMasterData(colId, sortDir) {
                const dir = sortDir === 'asc' ? 1 : -1;
                const stripHtml = s => (typeof s === 'string') ? s.replace(/<[^>]*>/g, '').trim() : s;
                masterData.sort((A, B) => {
                    const a = stripHtml(A[colId] === undefined ? '' : A[colId]);
                    const b = stripHtml(B[colId] === undefined ? '' : B[colId]);
                    const na = parseFloat(a);
                    const nb = parseFloat(b);
                    if (!isNaN(na) && !isNaN(nb)) return na < nb ? -1 * dir : na > nb ? 1 * dir : 0;
                    const ka = (a + '').toLowerCase();
                    const kb = (b + '').toLowerCase();
                    return ka < kb ? -1 * dir : ka > kb ? 1 * dir : 0;
                });
            }

            function renderPage(page) {
                const slice = getPageSlice(page);
                sortableTable.setData(slice);
                updateCodelistInfo();
                renderPagination();
            }

            // initialize table with first page
            renderPage(1);

            // when user clicks a column to sort, SortableTable will emit the event;
            // sort the masterData (so sort applies to whole dataset) and re-render current page
            sortableTable.events()
                .on('sort', (event) => {
                    // event.colId & event.sortDir are provided by SortableTable
                    sortMasterData(event.colId, event.sortDir);
                    renderPage(currentPage);
                    console.log(`[SortableTable#onSort] column=${event.colId} dir=${event.sortDir} totalRows=${masterData.length}`);
                });

            $('.progress-bar').css('width', '100%').attr('aria-valuenow', 100);
            setTimeout(() => {
                $('.progress').hide();
            }, 300);
        });

}


//********set start page texts for browser language********************************************************************
// menu text in English only

function insertPageDesc() {
    $('#page_desc').append(`
        <h1>${PAGE.codelist.heading[USER_LANG]}</h1>
        <p class="lead mb-0">${PAGE.codelist.subheading[USER_LANG]}</p>
        <p>${PAGE.codelist.desc[USER_LANG]}</p>`);
    $('#tabheading-en').text(PAGE.dataprovider.tabheading[USER_LANG]);
}

//*********************list of codelists on start page******************************

function insertCodelists(vocProjects, divID) { 
    console.log(vocProjects, divID)
    
    let query = encodeURIComponent(`PREFIX dcterms:<http://purl.org/dc/terms/>
                                    PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
                                    PREFIX adms:<http://www.w3.org/ns/adms#>
                                    SELECT (CONCAT('<a href="${BASE}?uri=',STR(?cs),'">',?l,'</a>') AS ?Label) 
                                        (COALESCE(?desc, "Beschreibung nicht verfügbar") AS ?Definition)
                                        (STRBEFORE(STR(?d),'T') AS ?Date) 
                                        (CONCAT('<a href="', STR(?status), '">', REPLACE(STR(?status), "http://inspire.ec.europa.eu/registry/status/", ""), '</a>') AS ?Status)
                                    WHERE { GRAPH ?g {
                                    ?cs a skos:ConceptScheme; dcterms:title ?l; dcterms:created ?d; adms:status ?status; adms:status <http://inspire.ec.europa.eu/registry/status/valid> . #only valid codelists 
                                    OPTIONAL{?cs dcterms:description ?desc . FILTER(LANG(?desc)='${USER_LANG}')}
                                    FILTER(LANG(?l)='${USER_LANG}') 
                                    }} ORDER BY ?l
                                    `);
    let tblFields = ['Label', 'Definition', 'Status'];
    fetch(ENDPOINT + '?query=' + query + '&format=json')
        .then(res => res.json())
        .then(jsonData => {
            let data = jsonData.results.bindings.map(obj =>
                Object.fromEntries(
                    Object.entries(obj)
                        .filter(([key]) => tblFields.includes(key))
                        .map(([key, val]) => [key, val.value])
                ));
            $('#reg-table').before(`<div class="mb-3"><strong>Code Lists:</strong></div><hr></hr>`);
            if (!data.length) {
                $('#reg-table').html('');
                return;
            }

            if ($('#reg-table_pagination_wrap').length === 0) {
                $('#reg-table').before(`<div id="reg-table_pagination_wrap" class="d-flex justify-content-between align-items-center mt-2">
                    <div class="small text-muted" id="reg-table-info"></div>
                    <nav aria-label="Registry table pagination">
                        <ul class="pagination pagination-sm mb-0" id="reg-table_pagination"></ul>
                    </nav>
                </div>`);
            } else {
                // Keep controls positioned above the table even after re-renders.
                $('#reg-table').before($('#reg-table_pagination_wrap'));
            }

            document.getElementById('reg-table').innerHTML = '<thead><tr>' +
                Object.keys(data[0]).map(a => `<th scope="col" data-id="${a}" sortable>${a}</th>`).join('') +
                '</tr></thead>';

            const sortableTable = new SortableTable();
            // set table element
            sortableTable.setTable(document.querySelector('#reg-table'));

            // Pagination configuration
            const masterData = Array.isArray(data) ? data.slice() : [];
            const pageSize = 12;
            let currentPage = 1;
            const totalPages = Math.max(1, Math.ceil(masterData.length / pageSize));

            function getPageSlice(page) {
                const start = (page - 1) * pageSize;
                return masterData.slice(start, start + pageSize);
            }

            function updateTableInfo() {
                const start = (masterData.length === 0) ? 0 : (currentPage - 1) * pageSize + 1;
                const end = Math.min(masterData.length, currentPage * pageSize);
                $('#reg-table-info').text(`${start}–${end} of ${masterData.length}`);
            }

            function renderPagination() {
                const $ul = $('#reg-table_pagination');
                $ul.empty();

                if (totalPages <= 1) {
                    $ul.hide();
                    return;
                }

                $ul.show();

                const makePageItem = (page, label = null, disabled = false, active = false) => {
                    const text = label || page;
                    const liClass = `page-item ${disabled ? 'disabled' : ''} ${active ? 'active' : ''}`;
                    return `<li class="${liClass}"><a class="page-link reg-page" href="#" data-page="${page}">${text}</a></li>`;
                };

                // Prev
                $ul.append(makePageItem(Math.max(1, currentPage - 1), 'Prev', currentPage === 1));

                // smart window for pages
                const maxVisible = 7;
                const half = Math.floor(maxVisible / 2);
                let start = 1;
                let end = totalPages;
                if (totalPages > maxVisible) {
                    start = Math.max(1, currentPage - half);
                    end = Math.min(totalPages, currentPage + half);
                    if (start === 1) end = maxVisible;
                    if (end === totalPages) start = totalPages - maxVisible + 1;
                }

                if (start > 1) {
                    $ul.append(makePageItem(1));
                    if (start > 2) $ul.append(`<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`);
                }

                for (let p = start; p <= end; p++) {
                    $ul.append(makePageItem(p, null, false, p === currentPage));
                }

                if (end < totalPages) {
                    if (end < totalPages - 1) $ul.append(`<li class="page-item disabled"><span class="page-link">&hellip;</span></li>`);
                    $ul.append(makePageItem(totalPages));
                }

                // Next
                $ul.append(makePageItem(Math.min(totalPages, currentPage + 1), 'Next', currentPage === totalPages));

                // attach handler
                $ul.find('.reg-page').off('click').on('click', function (e) {
                    e.preventDefault();
                    const p = Number($(this).data('page')) || 1;
                    if (p === currentPage) return;
                    currentPage = Math.max(1, Math.min(totalPages, p));
                    renderPage(currentPage);
                });
            }

            function sortMasterData(colId, sortDir) {
                const dir = sortDir === 'asc' ? 1 : -1;
                const stripHtml = s => (typeof s === 'string') ? s.replace(/<[^>]*>/g, '').trim() : s;
                masterData.sort((A, B) => {
                    const a = stripHtml(A[colId] === undefined ? '' : A[colId]);
                    const b = stripHtml(B[colId] === undefined ? '' : B[colId]);
                    const na = parseFloat(a);
                    const nb = parseFloat(b);
                    if (!isNaN(na) && !isNaN(nb)) return na < nb ? -1 * dir : na > nb ? 1 * dir : 0;
                    const ka = (a + '').toLowerCase();
                    const kb = (b + '').toLowerCase();
                    return ka < kb ? -1 * dir : ka > kb ? 1 * dir : 0;
                });
            }

            function renderPage(page) {
                const slice = getPageSlice(page);
                sortableTable.setData(slice);
                updateTableInfo();
                renderPagination();
            }

            // initialize table with first page
            renderPage(1);

            // sort full dataset and re-render current page
            sortableTable.events()
                .on('sort', (event) => {
                    sortMasterData(event.colId, event.sortDir);
                    renderPage(currentPage);
                    console.log(`[SortableTable#onSort] column=${event.colId} dir=${event.sortDir} totalRows=${masterData.length}`);
                });

            $('.progress-bar').css('width', '100%').attr('aria-valuenow', 100);
            setTimeout(() => {
                $('.progress').hide();
            }, 300);
        });
    }


function rdfCS(v) { //create concept scheme RDF for download IN PROGRESS
    $('#other_desc').append(`<form id="irdfForm" target="_blank" style="display:none;" method="post" action="${ENDPOINT}">
                            <input type="hidden" name="query" id="irdfQuery"/>
                            </form>`);
    document.getElementById('irdfQuery').value = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                CONSTRUCT {?s ?p ?o} 
                WHERE {
                select distinct ?s ?p ?o
                where { 
                VALUES ?v {<${v}>} #a skos:ConceptScheme
                ?v skos:hasTopConcept ?tc . ?tc skos:narrower* ?n
                    {?v ?p ?o BIND(?v as ?s)}
                    UNION
                    {?tc ?p ?o BIND(?tc as ?s)}
                    UNION
                    {?n ?p ?o BIND(?n as ?s)}
                } 
                }`;
//"CONSTRUCT {?s ?p ?o} WHERE {VALUES ?s {" + v + "} ?s ?p ?o}";
    document.getElementById('irdfForm').submit();
}



//*********************descriptions insert of vocabularies for the start page******************************

/* function insertCodelists(vocProjects, divID) { 
    
    let query = encodeURIComponent(`PREFIX dcterms:<http://purl.org/dc/terms/>
PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
PREFIX prov:<https://www.w3.org/TR/prov-o/#>
PREFIX foaf:<http://xmlns.com/foaf/0.1/>
PREFIX adms:<http://www.w3.org/ns/adms#>
SELECT ?cs ?csl ?D ?date 
(COUNT(DISTINCT ?c) AS ?count) (COUNT(DISTINCT ?x) AS ?new) 
(CONCAT("https://author","§","author") AS ?authors)
#(GROUP_CONCAT(DISTINCT ?N; separator = "|") as ?authors)
(CONCAT("https://author","§","ref") AS ?isRefBy)
#(GROUP_CONCAT(DISTINCT ?ref; separator = "|") as ?isRefBy)
(GROUP_CONCAT(DISTINCT ?L; separator = "|") as ?topConcepts)
(COALESCE(?st, '') AS ?stat)
WHERE {
    ?cs skos:hasTopConcept ?tc; dcterms:title ?csl; 
    dcterms:created ?date; dcterms:description ?D .#; adms:status ?stat . 
    FILTER(lang(?D)="de")
    ?tc skos:narrower* ?c; skos:prefLabel ?tcl . FILTER(lang(?csl)="de")
    FILTER(lang(?tcl)="de")
    BIND(CONCAT(STR(?tcl),"$",STR(?tc)) AS ?L)
    OPTIONAL{?cs prov:qualifiedAttribution ?ctr . ?ctr foaf:lastName ?n 
    BIND(CONCAT(STR(?ctr),"§",?n) AS ?N)}
    OPTIONAL{?cs adms:status ?st}
    OPTIONAL {?cs dcterms:isReferencedBy ?ref}
    OPTIONAL{BIND(?c AS ?x) FILTER(STRSTARTS(STR(?c), STR(?cs)))}
} GROUP BY ?cs ?csl ?date ?D ?st
ORDER BY ?cs`);
    
    fetch(ENDPOINT + '?query=' + query + '&format=json')
                                    
        .then(res => res.json())
        .then(jsonData => { //console.log(jsonData);
            for (let [key, value] of vocProjects.entries()) {
                let uri_path = new RegExp(key); //console.log(uri_path)
                jsonData.results.bindings.filter(item => uri_path.test(item.cs.value)).forEach(function (item) {
                    let tc = item.topConcepts.value.split('|'); 
                    tc.sort(); //console.log(item);
                    let topConcepts = tc.map(a => `<a href="${BASE}?uri=${a.split('$')[1]}&lang=${USER_LANG}">${a.split('$')[0]}</a>`).join(', ');
                    $('#' + divID).append(`
                    <div class="card bg-light mb-4" style="">
                        <div class="card-body scroll-box" style="font-size: 1rem; background: #f8f8f8;">
                            <h4><strong><a href="tbl.html?uri=${item.cs.value}">${item.csl.value}</a></strong> (${value.acronym})</h4>
                        
                            <div style="">
                                ${item.D.value}<br>
                                <strong>Top concepts:</strong> ${topConcepts}
                            </div>
                        </div>
                        <div class="card-footer text-muted" style="font-size: smaller; background: white;">
                            <strong>Concepts:</strong> ${item.count.value}
                            ${(item.new.value!=item.count.value)?('('+ (parseInt(item.count.value) - parseInt(item.new.value)) + ' reused)'):''}
                            &nbsp;&nbsp;&nbsp;
                            <strong><a href="http://purl.org/dc/terms/issued">Issued:</a></strong> ${item.date.value.split('T')[0]}
                            &nbsp;&nbsp;&nbsp;
                            <strong><a href="https://www.w3.org/TR/prov-o/#qualifiedAttribution">Edited by:</a></strong> ${doiLinks(item.authors.value)}
                            <br>
                            <strong><a href="http://www.w3.org/ns/adms#status">Status:</a></strong> <a href="${item.stat.value}">${doiLinks(item.stat.value.replace('http://purl.org/spar/pso/',''))}</a>
                            &nbsp;&nbsp;&nbsp;
                            <strong><a href="http://purl.org/dc/terms/isReferencedBy">Referenced by:</a></strong> ${doiLinks(item.isRefBy.value)}
                            &nbsp;&nbsp;&nbsp;
                            <strong>Download:</strong> 
                            <a href="javascript:rdfCS('${item.cs.value}')" title="RDF download">RDF</a>, 
                            <a href="tbl.html?uri=${item.cs.value}" title="table view" target="_blank">HTML</a>
                            <a href="">, CSV, TSV, JSON-LD</a>
                        </div>
                    </div>`);
                });
            }
            $('.progress-bar').css('width', '100%').attr('aria-valuenow', 100);
            setTimeout(() => {$('.progress').hide();}, 300);
        });
}

function doiLinks(a) {
    //https://doi.org/10.5281/zenodo.10057197|https://doi.org/10.13140/RG.2.2.35909.52968
    a = a == undefined ? '' : a;
    if (a.includes('§')) { //create <a>
        return a.split('|').map(a => `<a href="${a.split('§')[0]}" target="_blank">${a.split('§')[1]}</a>`).join(', ')
    } else {
         return a.split('|').map(a => a.includes('zenodo') ? `<a href="${a}" target="_blank">zenodo</a>` : a)
        .map(a => a.includes('egu') ? `<a href="${a}" target="_blank">EGU</a>` : a)
        .map(a => a.includes('RG') ? `<a href="${a}" target="_blank">ResearchGate</a>` : a)
        .map(a => a.includes('researchgate') ? `<a href="${a}" target="_blank">ResearchGate</a>` : a)
        .map(a => a.includes('orcid') ? `<a href="${a}" target="_blank">ORCID</a>` : a)
        .join(', ')
    }
}

function rdfCS(v) { //create concept scheme RDF for download IN PROGRESS
    $('#other_desc').append(`<form id="irdfForm" target="_blank" style="display:none;" method="post" action="${ENDPOINT}">
                            <input type="hidden" name="query" id="irdfQuery"/>
                            </form>`);
    document.getElementById('irdfQuery').value = `PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
                CONSTRUCT {?s ?p ?o} 
                WHERE {
                select distinct ?s ?p ?o
                where { 
                VALUES ?v {<${v}>} #a skos:ConceptScheme
                ?v skos:hasTopConcept ?tc . ?tc skos:narrower* ?n
                    {?v ?p ?o BIND(?v as ?s)}
                    UNION
                    {?tc ?p ?o BIND(?tc as ?s)}
                    UNION
                    {?n ?p ?o BIND(?n as ?s)}
                } 
                }`;
//"CONSTRUCT {?s ?p ?o} WHERE {VALUES ?s {" + v + "} ?s ?p ?o}";
    document.getElementById('irdfForm').submit();
} */

//***********************set the input box for concept search****************************************

function insertSearchCard(widgetID) {

    $('#searchInput').keydown(function (e) {
        if (e.which == 13 && $('#searchInput').val().length > 0) {
            openSearchList('search=' + encodeURI($('#searchInput').val()));
            $('#dropdown').empty();
            $('#searchInput').val('');
        }
    });

    $('#searchBtn').click(function (e) { //provide search results
        if ($('#searchInput').val().length > 0) {
            openSearchList('search=' + encodeURI($('#searchInput').val()));
            $('#dropdown').empty();
            $('#searchInput').val('');
        }
    });

    $('#searchInput').focusout(function () {
        $('#dropdown').delay(300).hide(0, function () {
            $('#dropdown').empty();
            $('#searchInput').val('');
        });
    });

    let timer;
    $('#searchInput').on('input', function () {
        clearTimeout(timer);
        $('#dropdown').empty();
        timer = setTimeout(function () {
            if ($('#searchInput').val().length > 0) {
                $('#dropdown').show();
                let autoSuggest = window.fuse.search($('#searchInput').val());
                let c = [];
                $.each(autoSuggest.slice(0, 10), function (index, value) {
                    c.push(value.L.value)
                });
                $.each(autoSuggest.slice(0, 10), function (index, value) {
                    let entry = value.L.value;
                    if (c.indexOf(entry) !== c.lastIndexOf(entry)) {
                        entry = entry + ' (' + value.s.value.split('\/')[5] + ')';
                    }
                    $('#dropdown').append('<tr><td class="searchLink dropdown-item" onclick="document.location.href = \'' + BASE + '?uri=' + value.s.value + '&lang=' + USER_LANG + '\';">' + entry + '</td></tr>');
                });
            }
        }, 200);
    });
}

//**********************the initial sparql query to build the fuse (trie) object - stored in window*****************************

function initSearch() {

    let query = encodeURIComponent(`PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
                                    SELECT ?s ?L
                                    WHERE {GRAPH ?g {
                                    VALUES ?p {skos:prefLabel skos:altLabel}
                                    ?s ?p ?lDE . FILTER(lang(?lDE)="de")
                                    OPTIONAL{?s ?p ?lEN . FILTER(lang(?lEN)="en")}
                                    BIND(COALESCE(?lDE, ?lEN) AS ?L)
                                    }}
                                    ORDER BY STRLEN(STR(?L)) ?L`);

    fetch(ENDPOINT + '?query=' + query + '&format=json')
        .then(res => res.json())
        .then(jsonData => {console.log(jsonData);
            const options = { 
                shouldSort: true,
                tokenize: true,
                keys: ['L.value']
            };
            window.fuse = new Fuse(jsonData.results.bindings, options);
        });
}

//********************set the page for search results************************************************

function openSearchList(queryString) { //zB 'info=disclaimer'
    window.open(BASE + '?' + queryString + '&lang=' + USER_LANG, '_self', '', 'false');
}


function sparqlEncode(str) {
    var hex, i;
    str = str.toLowerCase();
    var result = "";
    for (i = 0; i < str.length; i++) {
        hex = str.charCodeAt(i);
        if (hex < 32 || hex > 128)
            result += "\\u" + ("000" + hex.toString(16)).slice(-4);
        else
            result += str.charAt(i);
    }

    return result
}



//************************perform the search for a term typed in the inputbox************************

function search(searchText, vocProjects) {
    let HITS_SEARCHRESULTS = '0 results for ';
    $('#pageContent').empty();
    $('#pageContent').append('<br><h1>Search results</h1><p id="hits" class="lead">' + HITS_SEARCHRESULTS +
        '\"' + searchText + '\"</p><hr><ul id="searchresults" class="searchresults"></ul>');
    $('#searchresults').bind("DOMSubtreeModified", function () {
        $('#hits').html(HITS_SEARCHRESULTS.replace('0', $('#searchresults li').length) + '\"' + searchText + '\"');
    });

    //NEU*******************************
    let query = encodeURIComponent(`PREFIX dcterms:<http://purl.org/dc/terms/>
                                    PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
                                    SELECT DISTINCT ?s ?title ?text
                                    WHERE {GRAPH ?g {
                                    VALUES ?n {"${sparqlEncode(searchText.toLowerCase())}"}
                                    VALUES ?p {skos:prefLabel skos:altLabel skos:definition skos:scopeNote dcterms:description}
                                    ?s a skos:Concept; ?p ?lEN . FILTER((lang(?lEN)="de"))
                                    OPTIONAL{?s ?p ?l . FILTER(lang(?l)="${USER_LANG}")}
                                    BIND(COALESCE(?l, ?lEN) AS ?L) . FILTER(regex(?L,?n,"i"))
                                    ?s skos:prefLabel ?plEN . FILTER((lang(?plEN)="de"))
                                    OPTIONAL{?s skos:prefLabel ?pl . FILTER(lang(?pl)="${USER_LANG}")}
                                    BIND(COALESCE(?pl, ?plEN) AS ?title)
                                    BIND(CONCAT(STR(?p),"|",STR(?L)) AS ?text)
                                    BIND(IF(?p=skos:prefLabel,1,2) AS ?sort)
                                    }}
                                    ORDER BY ?sort
                                    LIMIT 100`);

    fetch(ENDPOINT + '?query=' + query + '&format=json')
        .then(res => res.json())
        .then(jsonData => { //console.log(jsonData);
            jsonData.results.bindings.forEach(function (a) { // insert project name ${vocProjects.get(a.s.value.split('\/')[3]).acronym}
                let projName = '';
                try {
                    projName = '(' + vocProjects.get(a.s.value.split('\/')[4]).acronym + ')';
                } catch (e) {
                    //Catch Statement
                }

                $('#searchresults').append(`<li>
                                        <a href="${BASE}?uri=${a.s.value}&lang=${USER_LANG}">
                                            <strong>${a.title.value}</strong> ${projName}
                                        </a>
                                        <br>
                                        <span class="searchPropTyp">URI: </span>
                                        <span class="searchResultURI">
                                            ${a.s.value}
                                        </span>
                                        <br>
                                        <p class="searchResultText">
                                            ${createSearchResultsText(a.text.value, searchText)}
                                        </p>
                                        </li>`);
                $('#hits').html(HITS_SEARCHRESULTS.replace('0', $('#searchresults li').length) + '\"' + searchText + '\"');
                if ($('#searchresults li').length > 99) {
                    $('#hits').prepend('>');
                }
            });

        }).catch(function (error) {
            //console.log(error);
        });
}

//***************************prepare the character string what is actually used to search***************************

function createSearchResultsText(sparqlText, searchText) {

    let searchText1 = searchText.toLowerCase();
    var regex1 = new RegExp(searchText1, "g");
    let searchText2 = searchText.charAt(0).toUpperCase() + searchText.slice(1);
    var regex2 = new RegExp(searchText2, "g");
    let resultText = '';

    for (let propPart of sparqlText.split('\$')) {
        resultText += propPart.split('|')[0].replace('http:\/\/www.w3.org\/2004\/02\/skos\/core#', '<span class="searchPropTyp">skos:').replace('http://purl.org/dc/terms/', '<span class="searchPropTyp">dcterms:') + '</span> - ';
        let textArr = propPart.split('|')[1].split('\. ');
        for (let i of textArr) {
            if (i.search(new RegExp(searchText, "i")) > -1) {
                resultText += i.replace(regex1, '<strong>' + searchText1 + '</strong>').replace(regex2, '<strong>' + searchText2 + '</strong>') + ' .. ';
            }
        }
        resultText += '<br>';
    }
    return resultText;
}

//**************************************************************************************
//*******definition of selected RDF properties******************************************

const n = {
    skos: 'http://www.w3.org/2004/02/skos/core#',
    dcterms: 'http://purl.org/dc/terms/',
    foaf: 'http://xmlns.com/foaf/0.1/',
    geo: 'http://www.w3.org/2003/01/geo/wgs84_pos#',
    owl: 'http://www.w3.org/2002/07/owl#',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    dbpo: 'http://dbpedia.org/ontology/',
    rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    gc3d: 'https://data.geoscience.earth/def/geoconnect3d#',
    schema: 'https://schema.org/',
    geosparql: 'http://www.opengis.net/ont/geosparql#',
    prov: 'http://www.w3.org/ns/prov#',
    adms: 'http://www.w3.org/ns/adms#'
};

const PREF_LABEL = [n.skos + 'prefLabel'];
const REPLACES = [n.dcterms + 'replaces'];
const PICTURE = [n.foaf + 'depiction'];
const SYNONYMS = [n.skos + 'altLabel'];
const STATUS = [n.adms + 'status'];
const NOTATION = [n.skos + 'notation'];
const DESCRIPTION_1 = [n.skos + 'definition'];
const DESCRIPTION_2 = [n.rdf + 'type', n.dcterms + 'type', n.skos + 'inScheme', n.skos + 'scopeNote', n.dcterms + 'description', n.dcterms + 'abstract'];
const DESCRIPTION_3 = [n.skos + 'scopeNote'];
const CITATION = [n.dcterms + 'bibliographicCitation'];
const REF_LINKS = [n.dcterms + 'references'];
const RELATIONS_1 = [n.skos + 'broader', n.skos + 'narrower', n.skos + 'related'];
const RELATIONS_2 = [n.skos + 'exactMatch', n.skos + 'closeMatch', n.skos + 'relatedMatch', n.skos + 'broadMatch', n.skos + 'narrowMatch'];
const RELATIONS_3 = [n.dbpo + 'category', n.rdfs + 'seeAlso', n.owl + 'sameAs', n.dcterms + 'relation', n.dcterms + 'hasPart', n.dcterms + 'isPartOf', n.dcterms + 'conformsTo'];
const WEB_LINK = [n.dcterms + 'source', n.dcterms + 'isReferencedBy', n.dcterms + 'subject', n.dcterms + 'isRequiredBy', n.dcterms + 'identifier', n.foaf + 'isPrimaryTopicOf', n.schema + 'subjectOf', n.foaf + 'page', n.schema + 'hasMap'];
const ICONS = [n.foaf + 'isPrimaryTopicOf', n.schema + 'subjectOf', n.foaf + 'page', n.dcterms + 'isPartOf', n.dcterms + 'hasPart'];
const MAPS = [n.schema + 'hasMap'];
const appIcons = ['<i class="fab fa-twitter"></i>', '<i class="fas fa-blog"></i>', '<i class="fab fa-youtube"></i>', '<i class="fab fa-wikipedia-w"></i>'];
const VISUALIZATION = [n.dbpo + 'colourHexCode'];
const LOCATION = [n.geo + 'lat', n.geo + 'long', n.geo + 'location', n.dcterms + 'spatial'];
const CREATOR = [n.dcterms + 'creator', n.dcterms + 'contributor', n.dcterms + 'created', n.dcterms + 'modified'];

const FRONT_LIST = {
    prefLabel: PREF_LABEL,
    picture: PICTURE,
    altLabel: [...PREF_LABEL, ...SYNONYMS],
    notation: NOTATION,
    apps: ICONS,
    //maps: MAPS,
    abstract: DESCRIPTION_1,
    scope: DESCRIPTION_3,
    citation: CITATION,
    relatedConcepts: [...RELATIONS_1, ...RELATIONS_2, ...RELATIONS_3],
};
const TECHNICAL_LIST = {
    descriptions: [...REPLACES, ...STATUS, ...NOTATION, ...PREF_LABEL, ...SYNONYMS, ...DESCRIPTION_1, ...DESCRIPTION_2],
    scientificReferences: [...CITATION, ...REF_LINKS],
    semanticRelations: [...RELATIONS_1, ...RELATIONS_2, ...RELATIONS_3],
    seeAlso: [...WEB_LINK],
    images: [...PICTURE, ...VISUALIZATION],
    location: LOCATION,
    creator: CREATOR
};

function rdfTS(v) { //create RDF narrowers for download
    document.getElementById('irdfQuery').value = "CONSTRUCT {?s ?p ?o} WHERE {VALUES ?s {" + v + "} ?s ?p ?o}";
    document.getElementById('irdfForm').submit();
}



//************set the "details page" to view a single concept ***********************************************************************

function details(divID, uri, voc_uri) { //build the web page content
    $('#' + divID).append(`<form id="irdfForm" target="_blank" style="display:none;" method="post" action="${ENDPOINT}"><input type="hidden" name="query" id="irdfQuery"/></form>`);
    
    let query = encodeURIComponent(`PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
        PREFIX dcterms: <http://purl.org/dc/terms/>
        PREFIX adms: <http://www.w3.org/ns/adms#>
        SELECT DISTINCT ?s ?p ?o (GROUP_CONCAT(DISTINCT CONCAT(STR(?L), "@", lang(?L)) ; separator="|") AS ?Label)
        (COUNT(distinct(?sr)) AS ?count) (GROUP_CONCAT(?source ; separator="|") AS ?pdf)
        #(IRI(STRBEFORE(STR(?s),(CONCAT("/",REPLACE(STR(?s), "^.*/([^/]*)$", "$1"))))) as ?x) only test
        (COALESCE(?stat,"") AS ?status)
        WHERE {GRAPH ?g {
        VALUES ?uri {<${uri}>}
        OPTIONAL{?new dcterms:replaces ?uri} BIND(COALESCE(?new,?uri) AS ?s)
        {?s ?p ?o .
        OPTIONAL {?o skos:prefLabel ?L}
        OPTIONAL {?o skos:narrower|skos:related ?sr}
        OPTIONAL {?o adms:status ?stat}
        }UNION{
        VALUES ?p {<http://purl.org/dc/terms/bibliographicCitation>}
        ?s ?x ?r . ?r ?p ?o
        OPTIONAL{?r <http://purl.org/dc/terms/source> ?source}
        }
        }}
        GROUP BY ?s ?p ?o ?stat
        ORDER BY ?Label`);

    fetch(ENDPOINT + '?query=' + query + '&format=json')
        .then(res => res.json())
        .then(jsonData => {
            console.log(jsonData);

            if (jsonData.results.bindings.length > 1) {
                uri = jsonData.results.bindings[0].s.value;
                
                for (key in FRONT_LIST) createFrontPart(divID, uri, jsonData, Array.from(FRONT_LIST[key].values()), voc_uri);

                // RDF download icon added to apps (notation div or altLabel div)
                let r_links = jsonData.results.bindings.map(a => [a.p.value, '<' + a.o.value + '>']).filter(b => b[0] == REF_LINKS[0]).map(c => c[1]).join(' ');
                //console.log('narrower:', jsonData.results.bindings.filter(a => a.p.value == 'http://www.w3.org/2004/02/skos/core#narrower'));
                let r = `<span>
                            <a href="javascript:rdfTS('<${uri}> ${r_links}')" title="RDF download" style="text-decoration: none;">
                                <img src="assets/rdf-svgrepo-com.svg" class="downscaled-svg blue-svg" alt="RDF icon">
                            </a>
                        </span>&nbsp;`;

                if (jsonData.results.bindings.filter(a => a.p.value == 'http://www.w3.org/2004/02/skos/core#narrower').length > 0) {
                    r += `<span>
                            <a href="tbl.html?uri=${uri}" title="table view" target="_blank" style="text-decoration: none;">
                                <img src="assets/table-list.svg" class="downscaled-svg blue-svg" alt="table icon">
                            </a>
                        </span>&nbsp;
                        <span>
                            <a href="diagram.html?uri=${uri}" title="tree view" target="_blank" style="text-decoration: none;">
                                <img src="assets/sitemap-solid-full.svg" class="downscaled-svg blue-svg" alt="tree icon">
                            </a>
                        </span>`;
                }
                

                if ($('#appsInsert').length > 0) {
                    $('#appsInsert').append('<div>' + r +'</div>');
                } else if ($('#notation').length > 0) {
                    $('#notation').after('<div id="appsInsert" style="float:right;">' + r + '</div>');
                } else {
                    $('#altLabel').after('<div id="appsInsert" style="float:right;">' + r + '</div>');
                }

                
                $('#' + divID).append(`<hr>
                        <div style="cursor: pointer; color: #777;" id="detailsBtn"
                        onclick="javascript: toggleRead(\'detailsBtn\', \'detailsToggle\', \'RDF statements\');"><img src="assets/caret-right-solid.svg" class="downscaled-svg grey-svg" alt="caretRight icon"><em>&nbsp;&nbsp;RDF statements</em>
                        </div>
                        <div style="display:none;position: relative;" id="detailsToggle">
                        <br>
                        <table id="details"></table>
                        
                        </div>`); 

                //console.log('jsonData: ', jsonData.results.bindings);


                for (key in TECHNICAL_LIST) createTechnicalPart('details', jsonData, Array.from(TECHNICAL_LIST[key].values()));
                $('#' + divID).append('');

                insertConceptBrowser(divID, uri, 50);

            } else {
                console.log(uri);
                $('#' + divID).append(`<hr><div class="alert alert-dismissible alert-warning">
                          <button type="button" class="close" data-dismiss="alert">&times;</button>
                          <h4 class="alert-heading">Can´t open the page!</h4>
                          <p class="mb-0">404 Resource Not Found<br>${uri}</p>
                        </div>`);
            }
        });
}

//************************toggle the hidden details / because HTML5 is not fully supported by MS Edge**************

function toggleRead(divBtn, divTxt, text) {
    let txt = $('#' + divTxt).is(':visible') ? '<img src="assets/caret-right-solid.svg" class="downscaled-svg grey-svg" alt="caretRight icon"><em>&nbsp;&nbsp;' + text + '</em>' : '<img src="assets/caret-down-solid.svg" class="downscaled-svg grey-svg" alt="caretDown icon"><em>&nbsp;&nbsp;' + text + '</em>';
    $('#' + divBtn).html(txt);
    $('#' + divTxt).slideToggle();
}

//*************create the upper part of details page - always visible *********************************************************************

function createFrontPart(divID, uri, data, props, voc_uri) {
    //console.log(data.results.bindings)
    //let sourceLinks = data.results.bindings.map(a => [a.pdf.value, a.o.value]).filter(b => b[0].length > 0);
    //console.log(sourceLinks);

    let html = '';
    let pL = '';
    let uris4rdf = '<' + uri + '>';
    //console.log(data);
    //let hyperlinksAbstract = []; //HotLime hyperlinked description texts

    props.forEach((i) => {
        let ul = getObj(data, i); console.log(i, ul);
        if (ul.size > 0) {
            switch (key) {
                case 'prefLabel':
                    //console.log(ul);
                    pL = setUserLang(Array.from(ul).join('|').replace(/  <span class="lang">/g, '@').replace(/<\/span>/g, ''));
                    //BREADCRUMBS
                    //$('.navbar-brand').append(` / ${uri.split('/')[4]} / ${pL}`);
                    const codelist = uri.split('/').slice(0, -1).join('/');
                    
                    html += `<ol class="breadcrumb mt-3" style="margin-left: -12px;">
                        <li class="breadcrumb-item"><a href="${BASE}">Registry</a></li>
                        <li class="breadcrumb-item"><a href="${BASE}?uri=${codelist}">${codelist.split('/').pop()}</a></li>
                        <li class="breadcrumb-item active">${pL}</li>
                    </ol>`;
                        
                    html += `<h1 id="prefLabel" class="mt-4${(!voc_uri?` text-muted`:'')}">${pL}</h1>`;

                    html += `<p class="${(!voc_uri?' text-muted">':'">')}
                        <a id="uriBtn"
                            href="javascript:
                            var dummy = $('<input>').val('${uri}').appendTo('body').select();
                            document.execCommand('copy');
                            dummy.remove();"><strong>URI:</strong>
                        </a>
                        <span id="uri" style="word-wrap: break-word;">
                            &nbsp;${uri}
                        </span>
                        ${(!voc_uri?'&nbsp;&nbsp;&nbsp;<a title="external URI" href="' + uri + '"><i class="fa fa-external-link uriImp"></i></a>':'')}
                    </p>
                    <hr>`; //console.log(pL);
                    break;
                case 'altLabel':
                    html += '<ul id="altLabel" class="' + key + '"><li>' + Array.from(ul).join('</li><li>') + '</li></ul>';
                    break;
                case 'notation':
                    $('#' + divID).append('<hr><span></span>');
                    html += `<ul id="notation" class="${key}">
                            <li>Notation: ${Array.from(ul)[0]}</li>`;
                    /* if (uri.indexOf('codelist')>0){
                        let uri_arr = uri.split('/');
                        uri_arr.pop();
                        html += `<li>-</li>
                            <li>Collection: <a href="${uri_arr.join('/')}">${uri_arr[4]}</a></li>
                            <li>-</li>
                            <li>Status: <a href="https://inspire.ec.europa.eu/registry/status/valid">valid</a></li>
                            </ul>`;
                    }      */   
                            
                    break;
                case 'apps':
                    html += '<div style="float:right;" id="appsInsert">';

                    for (let i of ul) { //inserted by string occurrence in url
                        let iconExists = false;
                        for (let j of appIcons) {
                            let tag = j.split('-')[1].split('\"')[0];
                            if (i.search(tag) > -1) {
                                html += `<span style="margin-right: 5px;">
                                            <a title="${tag}" href="${i.split('\"')[1]}">${j}</a>
                                        </span>`;
                                iconExists = true;
                            }
                        }
                        if (!iconExists) {
                            html += `<span style="margin-right: 5px;">
                                    <a>${i.split('>')[0]+'><i class="fa fa-paperclip"></i></a>'}
                                </span>`;
                        }
                    }
                    html += `</div>`;
                    break;
                case 'maps':
                    html += '<div style="float:right;" id="mapsInsert">';
                    for (let i of ul) {
                        html += `<span style="margin: 5px;">
                                    ${i.split('>')[0]+'><i style="" class="fas fa-map"></i></a>'}
                                </span>`;
                    }
                    html += `</div>`;
                    break;
                case 'abstract':
                    html += '<hr><div class="' + key + '">' + setUserLang(Array.from(ul).join('|').replace(/  <span class="lang">/g, '@').replace(/<\/span>/g, '')) + '</div>';
                    break;
                case 'scope':
                    //console.log(ul);
                    //html += '<br><p class="text-secondary">Interpretation: ' + setUserLang(Array.from(ul).join('|').replace(/  <span class="lang">/g, '@').replace(/<\/span>/g, '')) + '</p>';
                    html += '<br><p class="text-secondary">Anmerkung:<br>' + Array.from(ul).map(a => a.split('<')[0]).join('<br><br>') + '</p>';
                    break;
                case 'citation':
                    let a = []; 
                    if (uri.indexOf('ref')>1){ html += '<br>' }
                    /* for (let i of ul) {
                        let pdf = '';
                        for (let k of sourceLinks) {
                            if (k[1] + '  ' === i) {
                                pdf = `<a href="${k[0]}">&nbsp;<i class="fas fa-sm fa-external-link-alt"></i></a>`;
                            }
                        }
                        a.push(i.replace('\:', ':<cite title="Source Title">') + '</cite>' + pdf);
                    } */
                    html += '<br><footer class="blockquote-footer">' + Array.from(a).join('</footer><footer class="blockquote-footer">') + '</footer>';
                    break;
                case 'relatedConcepts':

                    if (html.search('<h4') == -1) {
                        html += '<hr><h4 style="margin-bottom: 1rem;">Concept relations</h4>';
                    }
                    //hyperlinksAbstract = hyperlinksAbstract.concat(Array.from(ul).map(a => a.split('</a>')[0].split('href="')[1].split('&lang=en">')));
                    html += '<table><tr><td class="skosRel' + i.search('Match') + ' skosRel">' + i.replace(n.skos, '').replace(n.gc3d, '').replace(n.geosparql, '').replace(n.prov, '').replace('http://purl.org/dc/terms/relation', 'codelists') + '</td><td class="skosRelUl"><ul><li>' + shortenText(Array.from(ul).join('</li><li>')) + '</li></ul></td></tr></table>';

                    //hyperlinksAbstract = hyperlinksAbstract.sort((a, b) => b[1].length - a[1].length);
                    //console.log(hyperlinksAbstract);
                    break;
                case 'picture':
                    insertImage(Array.from(ul).map(a => a.split('\"')[1]), 'image_links');
                    break;
            }
        }
    });
    $('#' + divID).append(html);


}


function insertImage(links, divID) {
    links.forEach((i) => {
        let capt = decodeURIComponent(i.split('\/').pop().split('.')[0]).replace(/_/g, ' ');
        $('#' + divID).append(`
                <div class="card my-4">
                    <div class="card-body">
                        <figure>
                            <a href="${i}">
                              <img class="img-fluid" src="${i}" alt="Chania" title="">
                              <figcaption>${i.indexOf('wikimedia')>0?'<img src="../img/wikimedia.png" alt="Wikimedia" height="12">':''} ${capt}</figcaption>
                            </a>
                        </figure>
                    </div>
                </div>`);
    });
}

//*******************replace long URIs by acronyms************************************************************************

function shortenText(htmlText) {

    let abbrev = {
        INSPIRE: 'http://inspire.ec.europa.eu/codelist/',
        INSPIRE: 'http://inspire.ec.europa.eu/featureconcept/',
        INSPIRE: 'https://inspire.ec.europa.eu/registry/status/',
        DBpedia: 'http://dbpedia.org/resource/',
        WIKIDATA: 'http://www.wikidata.org/entity/'
    };
    for (let i in abbrev) {
        htmlText = htmlText.split('>' + abbrev[i]).map(a => a.replace('<', ` (${i})<`)).join('>').replace(` (${i})`, '');
    }
    return htmlText;
}

//******************create the hidden part of concept descriptions ***********************************************************************

function createTechnicalPart(divID, data, props) { //loop all single properties
    let html = '';
    let geoPath = 'http://www.w3.org/2003/01/geo/wgs84_pos#';
    let coord = {};

    props.forEach((i) => {
        let ul = getObj(data, i); //console.log(data);
        if (ul.size > 0) {
            html += '<tr><td class="propTech">' + createHref(i) + '</td><td><ul><li>' + shortenText(Array.from(ul).join('</li><li>')) + '</li></ul></td></tr>';

            if (i == geoPath + 'lat') {
                coord.lat = Number(ul.values().next().value);
            }
            if (i == geoPath + 'long') {
                coord.long = Number(ul.values().next().value);
            }
        }
    });

    if (html.length > 0) {
        $('#' + divID).append(`
                    <tr id="${key}">
                        <th></th>
                        <th>
                            ${key}
                        </th>
                    </tr>
                    <tr>
                        ${html}
                    </tr>`);
    }
}
//******************transform the sparql json query result into a set of HTML elements like <a> *************************************

function getObj(data, i) { //console.log(data, i);
    return new Set($.map(data.results.bindings.filter(item => item.p.value === i), (a => (a.Label !== undefined ? '<a href="' + BASE +
        '?uri=' + a.o.value + '&lang=' + USER_LANG + '">' + setUserLang(a.Label.value) + '</a> ' + ' ' + addPlusSign(a.count['value']) : createHref(a.o.value) + ' ' + createDTLink(a.o.datatype) + ' ' + langTag(a.o['xml:lang'])))));
}

//*******************count of further concepts if > 0*******************
function addPlusSign(x) {
    if (x == "0") {
        x = '';
    } else {
        x = `<span class="plusSign">(${x})</span>`; //cycled plus for narrower concepts
    }

    //console.log(x);
    return x;
}

//*******************prepare HTML links for browsing the vocabulary***************************************************

function createHref(x) {
    if (x.substring(0, 4) == 'http') {
        let a = x;
        for (const [key, value] of Object.entries(n)) a = a.replace(value, key + ':');
        x = '<a href="' + x + '">' + a.replace(/_/g, ' ') + '</a>';
    }
    return x;
}

//*******************create beautiful language tags*******************************************************************

function langTag(x) {
    if (typeof x !== 'undefined') {
        x = '<span class="lang">' + x + '</span>';
    } else {
        x = '';
    }
    return x;
}

//********************create beautiful xsd data format tags******************************************************************************

function createDTLink(x) {
    if (typeof x !== 'undefined') {
        if (x.indexOf('XMLSchema') > 0) {
            x = '<a class="datatype" href="' + x + '">' + x.replace('http://www.w3.org/2001/XMLSchema#', 'xsd:') + '</a>';
        }
    } else {
        x = '';
    }
    return x;
}

//********************select the adequate language *********************************************************************

function setUserLang(x) {
    if (x.indexOf('@' + USER_LANG) > 0) {
        return x.substr(0, x.indexOf('@' + USER_LANG)).split('|').slice(-1).pop();
    } else if (x.indexOf('@en') > 0) {
        return x.substr(0, x.indexOf('@en')).split('|').slice(-1).pop();
    } else if (x.indexOf('@') > 0) {
        return x.substr(0, x.indexOf('@')).split('|').slice(-1).pop();
    } else {
        return x.split('|')[0];
    }
}

//********************************************************************************************************
//************************insert the corresponding vocabulary description*********************************

function insertProjCards(divID, projects, p) {
    if (projects.has(p)) {
        //console.log(p);
        iPC(projects.get(p), divID, false);
    } else {
        for (let project of projects.values()) {
            iPC(project, divID, true);
        }
    }
}

//***************************get the corresponding vocabulary description********************************

function iPC(project, divID, startPage) {
    let rdf_dl = project.rdf_download.map(a => `<a href="${'rdf/' + a}">${a.split('.')[1].toUpperCase()}</a>`).join(', ')

    if (startPage) {
        $('#' + divID).append(`
                <div class="card mb-4">
                    <div class="card-header"><strong>${project.acronym}</strong> - ${project.title}</div>
                    <div class="card-body">
                    ${project.description}
                        <div class="text-muted" style="font-size: smaller; margin-top: 5px;">
                            <strong>Website:</strong>
                            <a title="website" href="${project.project_page}">${project.project_page}</a>&nbsp;&nbsp;
                            
                        </div>
                    </div>
                </div>`);
    } else {
        //console.log(project);

        $('#' + divID).append(`
        <div class="card my-4">
            <h5 class="card-header">
                <strong>${project.acronym}</strong><small> - ${project.title}</small>
            </h5>
            <div class="card-body">
                ${project.description.slice(0, 490)}..<br>
                <div class="text-muted" style="margin-top: 5px;">
                    <strong>Website:</strong>
                    <a title="website" target="_blank" href="${project.project_page}"></a>&nbsp;&nbsp;
                    <strong>Download:</strong> ${rdf_dl}
                </div>
            </div>
        </div>`);                 

    }
}

//*******************************************************************************************************
//***************create a bootstrap card with all concept links within a concept scheme******************

function insertConceptBrowser(divID, uri, offset) {
    $('#' + divID).append(`
        <hr>
            <details id="conceptsList">
            <summary>
            <img src="assets/caret-right-solid.svg" class="downscaled-svg grey-svg" alt="caretRight icon" style="margin-right: 5px;">
            <em id="allConceptsHeader" style="display:inline-block;"></em>
            </summary>
            <div id="allConcepts" class="card-body"></div>
            </details>
        <hr>
		`);

    provideAll('allConcepts', uri, 0);
}
//*******************the query to provide all concept links within a concept scheme****************************************************

function provideAll(divID, uri, offset) { //provide all available concepts for navigation
    let AT = "";
    let query = encodeURIComponent(`PREFIX dcterms:<http://purl.org/dc/terms/>
                                    PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
                                    PREFIX dbpo:<http://dbpedia.org/ontology/>
                                    SELECT DISTINCT 
                                    ?c (MIN(COALESCE(?l, ?lEN)) AS ?Label) (MIN(?t) AS ?Title) (MIN(?d) AS ?Desc) ?sColor
                                    (MIN(EXISTS{?cs skos:hasTopConcept ?c}) AS ?isTopConcept)
                                    WHERE {GRAPH ?g {
                                    VALUES ?cs {<${uri.split('/').slice(0, -1).join('/')}>}
                                    ?cs skos:hasTopConcept ?tc; dcterms:title ?t . ?tc skos:narrower* ?c .
                                    ?c skos:prefLabel ?lEN . FILTER(lang(?lEN)="de") .
                                    FILTER(REGEX(STR(?c),STR(?cs))||!REGEX(STR(?c),'europe-geology|earth')) .  
                                    OPTIONAL {?c skos:prefLabel ?l . FILTER(lang(?l)="de")}
                                    OPTIONAL {?cs dcterms:description ?d . FILTER(lang(?d)="de")}
                                    OPTIONAL {?c dbpo:colourHexCode ?sColor}
                                    }} GROUP BY ?c ?sColor
                                    ORDER BY ?Label
                                    LIMIT 100
                                    OFFSET ${offset}`);

    fetch(ENDPOINT + '?query=' + query + '&format=json')
        .then(res => res.json())
        .then(jsonData => {
            let data = jsonData; 
            var allConcepts = $('#allConcepts');
            let a = [];
            $('#' + divID).append('');
            if(data.results.bindings.length <1){
                console.log(data.results.bindings.length);
                $('#conceptsList').hide();
            } else if (offset == 0) {
                //console.log(data.results.bindings);

                $('#allConceptsHeader').html(data.results.bindings[0].Title.value + ' (alphabetical list of concepts)');
                allConcepts.empty().append('<div class="allConceptsPerex">' + data.results.bindings[0].Desc.value.slice(0, 400) + '</div><br>');

                ([...new Map(data.results.bindings.map(({ c, sColor, Label, Desc }) => ({ c, sColor, Label, Desc })).map(item => [item.c.value, item])).values()]).forEach((i) => {
                    let color = i.sColor && i.sColor.value ? ' style="background-color:' + i.sColor.value + ';" ' : '';
                    a.push('<div' + color + '><a ' + AT + 'data-toggle="tooltip" data-placement="right" data-html="true" title="' + i.Label.value + ' - ' + i.Desc.value.slice(0, 230) + '.." href="' + BASE + '?uri=' + i.c.value + '&lang=' + USER_LANG + '">' + trnc(i.Label.value) + '</a></div>');
                });

                let links = a.join('\n\n');
                allConcepts.append('<div class="allConceptsCards">' + links + '</div>');
                allConcepts.append(`<div id="coBr" style="justify-content: center; display:flex; margin:5px;">
                    <button type="button" id="rightBtn" class="btn" style="background-color: #004953; color:white;" onclick="provideAll('allConcepts', '${uri}', Number(this.value)+100)">
                        Show next 100...
                    </button>
            </div>
                `);
            } else {
                //console.log(data.results.bindings);
                ([...new Map(data.results.bindings.map(({ c, sColor, Label, Desc }) => ({ c, sColor, Label, Desc })).map(item => [item.c.value, item])).values()]).forEach((i) => {
                    let color = i.sColor && i.sColor.value ? ' style="background-color:' + i.sColor.value + ';" ' : '';
                    a.push('<div' + color + '><a ' + AT + 'data-toggle="tooltip" data-placement="right" data-html="true" title="' + i.Label.value + ' - ' + i.Desc.value.slice(0, 230) + '.." href="' + BASE + '?uri=' + i.c.value + '&lang=' + USER_LANG + '">' + trnc(i.Label.value) + '</a></div>');
                });
                let links = a.join('\n\n');
                $(".allConceptsCards").append(links);
            }
            document.getElementById("rightBtn").value = offset;
            if (Object.keys(jsonData.results.bindings).length < 100) {
                $("#coBr").hide();
            }
        });
}


function trnc(label) {
    return label.split(" ").map(function(word) {
        if (word.length > 14) {
        // Keep 10 characters and add ".." for a total of 14
        return word.substring(0, 12) + "..";
        }
        return word;
    }).join(" ");
}


//***********************************************************************************************************
//********************************END************************************************************************
