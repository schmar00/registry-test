//******************************************************************************************************
//*****START********************************************************************************************

let USER_LANG = (navigator.language || navigator.userLanguage).substring(0, 2);

if (USER_LANG !== 'de') {
    USER_LANG = 'en';
}

let BASE = location.protocol + '//' + location.host + location.pathname;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}

function normalizeRegistryUri(raw) {
    if (typeof raw !== 'string' || raw.length === 0) {
        return '';
    }
    let decoded;
    try {
        decoded = decodeURI(raw);
    } catch (e) {
        return '';
    }
    try {
        const parsed = new URL(decoded);
        if (parsed.protocol === 'https:' && parsed.hostname === 'registry.inspire.gv.at') {
            return parsed.href;
        }
    } catch (e) {
        return '';
    }
    return '';
}

function safeHttpUrl(url) {
    if (typeof url !== 'string' || url.length === 0) {
        return '';
    }
    try {
        const parsed = new URL(url);
        if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            return parsed.href;
        }
    } catch (e) {
        return '';
    }
    return '';
}

function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
    }
    const dummy = $('<input>').val(text).appendTo('body').select();
    document.execCommand('copy');
    dummy.remove();
    return Promise.resolve();
}

function setSortableHeader(tableSelector, columns) {
    const table = document.querySelector(tableSelector);
    if (!table) return;
    table.textContent = '';
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    columns.forEach((column) => {
        const th = document.createElement('th');
        th.setAttribute('scope', 'col');
        th.setAttribute('data-id', column);
        th.setAttribute('sortable', '');
        th.textContent = column;
        tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
}

function makePaginationItemElement(page, label, disabled, active, linkClass, ariaPrefix) {
    const text = label || page;
    const $li = $('<li>', { class: `page-item ${active ? 'active' : ''}`.trim() });
    if (disabled) {
        $li.addClass('disabled').attr('aria-disabled', 'true');
        $li.append($('<span>', { class: 'page-link', text }));
        return $li;
    }
    const ariaLabel = label
        ? `Go to ${label.toLowerCase()} page of ${ariaPrefix}`
        : `Go to page ${page} of ${ariaPrefix}`;
    const $a = $('<a>', {
        class: `page-link ${linkClass}`,
        href: '#',
        text,
        'data-page': String(page),
        'aria-label': ariaLabel
    });
    if (active) {
        $a.attr('aria-current', 'page');
    }
    $li.append($a);
    return $li;
}

function makePaginationEllipsisElement() {
    const $li = $('<li>', { class: 'page-item disabled' }).attr('aria-disabled', 'true');
    $li.append($('<span>', { class: 'page-link', html: '&hellip;' }));
    return $li;
}

$(document).ready(function () {
    let urlParams = new URLSearchParams(window.location.search);
    
    insertSearchCard(); // inserts search widget only

    if (urlParams.has('search')) {
        $('header').empty();
        $('header').removeClass('py-5');
        $('#data_providers').empty();
        search(decodeURI(urlParams.get('search').replace(/[^a-z\p{L} -]/uig, "").slice(0, 25)));

    } else if (urlParams.has('uri')) {
        $('header').empty();
        $('header').removeClass('py-5');
        let raw = urlParams.get('uri');
        let uri = normalizeRegistryUri(raw);
        $('#pageContent').empty();
        $('#data_providers').empty();

        if (uri === 'https://registry.inspire.gv.at/dataprovider') {
            showCodelist(uri, 'dataprovider');
        } else if (uri.replace('https://registry.inspire.gv.at/codelist','').split('\/').length == 2) {
            showCodelist(uri, uri.replace('https://registry.inspire.gv.at/codelist/',''));
        } else {
            details('pageContent', uri);
        }

    } else { //startpage
        insertPageDesc(); //general intro
        insertCodelists('proj_desc');
        insertDataProviderList();
    }
    initSearch(); //provides js for fuse search

    function copyUriFromTrigger(el) {
        const uri = String($(el).attr('data-uri') || '');
        if (!uri) return;
        copyToClipboard(uri).catch(() => undefined);
    }

    function setCopyUriHoverState(el, isHover) {
        const $el = $(el);
        const $label = $el.find('strong').first();
        if (!$label.length) return;
        if (!$el.attr('data-default-label')) {
            $el.attr('data-default-label', $label.text());
        }
        if (isHover) {
            $label.text('copy URI:');
        } else {
            $label.text($el.attr('data-default-label') || 'URI:');
        }
    }

    $(document).on('click', '.copy-uri-btn', function (e) {
        e.preventDefault();
        copyUriFromTrigger(this);
    });

    // Security-compliant hover copy: uses validated data attribute + clipboard helper (no inline JS).
    $(document).on('mouseenter', '.copy-uri-btn', function () {
        setCopyUriHoverState(this, true);
        copyUriFromTrigger(this);
    });

    $(document).on('mouseleave', '.copy-uri-btn', function () {
        setCopyUriHoverState(this, false);
    });

    $(document).on('click', '#detailsBtn', function (e) {
        e.preventDefault();
        toggleRead('detailsBtn', 'detailsToggle', 'RDF statements');
    });

    $(document).on('click', '#rightBtn', function (e) {
        e.preventDefault();
        const uri = String($(this).attr('data-uri') || '');
        provideAll('allConcepts', uri, Number(this.value) + 100);
    });
});

//********set start page texts for browser language********************************************************************
// menu text in English only

function insertPageDesc() {
    const $pageDesc = $('#page_desc');
    $pageDesc.append($('<h1>', { text: PAGE.codelist.heading[USER_LANG] }));
    $pageDesc.append($('<p>', { class: 'lead mb-0', text: PAGE.codelist.subheading[USER_LANG] }));
    $pageDesc.append($('<p>').html(PAGE.codelist.desc[USER_LANG].replace('§', BASE)));
    $('#tabheading-en').text(PAGE.dataprovider.tabheading[USER_LANG]);
}

//*********************list of codelists on start page******************************

function insertCodelists(divID) {
    
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
                    <div class="small text-muted" id="reg-table-info" role="status" aria-live="polite" aria-atomic="true"></div>
                    <nav aria-label="Registry table pagination">
                        <ul class="pagination pagination-sm mb-0" id="reg-table_pagination"></ul>
                    </nav>
                </div>`);
            } else {
                // Keep controls positioned above the table even after re-renders.
                $('#reg-table').before($('#reg-table_pagination_wrap'));
            }

            setSortableHeader('#reg-table', Object.keys(data[0]));

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
                    return makePaginationItemElement(page, label, disabled, active, 'reg-page', 'registry code lists');
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
                    if (start > 2) $ul.append(makePaginationEllipsisElement());
                }

                for (let p = start; p <= end; p++) {
                    $ul.append(makePageItem(p, null, false, p === currentPage));
                }

                if (end < totalPages) {
                    if (end < totalPages - 1) $ul.append(makePaginationEllipsisElement());
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
                });

            $('.progress-bar').css('width', '100%').attr('aria-valuenow', 100);
            setTimeout(() => {
                $('.progress').hide();
            }, 300);
        });
    }

//**********************list of data providers on start page******************************

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
                const $row = $('<div>').css('margin-bottom', '7px');
                const $link = $('<a>', {
                    href: `${BASE}?uri=${encodeURIComponent(a.s.value)}`,
                    text: a.label.value
                });
                const $count = $('<small>').text(`(${a.count.value})`);
                $row.append($link).append(' ').append($count);
                $('#data_provider_list').append($row);
            });
            jsonData.results.bindings.filter(x=>x.count.value == 0).forEach(b => { 
                const $row = $('<div>').css('margin-bottom', '7px');
                const $link = $('<a>', {
                    href: `${BASE}?uri=${encodeURIComponent(b.s.value)}`,
                    text: b.label.value
                });
                $row.append($link);
                $('#data_provider_list_all').append($row);
            });            
        });
}

//************************     show CODELIST page     ****************************************************

function showCodelist(uri, cl) {
    
    let query = encodeURIComponent(`PREFIX dcterms: <http://purl.org/dc/terms/>
        PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
        PREFIX adms:<http://www.w3.org/ns/adms#>

        SELECT DISTINCT ?g ?insertDate ?editDate 
        (MIN(CONCAT('<a href="', STR(?cls), '">', REPLACE(STR(?cls), "http://inspire.ec.europa.eu/registry/status/", ""), '</a>')) AS ?CLS)
        (CONCAT('<a href="${BASE}?uri=',STR(?URI),'">',COALESCE(?l1,?l),'</a>') AS ?Label)
        (GROUP_CONCAT(DISTINCT ?n; separator = '; ') as ?Notation)
        (GROUP_CONCAT(DISTINCT ?D; separator = '; ') as ?Definition)
        (GROUP_CONCAT(DISTINCT CONCAT('<a href="${BASE}?uri=',STR(?o),'">',COALESCE(?p1,?p),'</a>')) as ?Parent)
        (GROUP_CONCAT(DISTINCT COALESCE(?tit1,?tit)) AS ?Title)
		(GROUP_CONCAT(DISTINCT COALESCE(?desc1,?desc)) AS ?Description)
        (MIN(CONCAT('<a href="', STR(?status), '">', REPLACE(STR(?status), "http://inspire.ec.europa.eu/registry/status/", ""), '</a>')) AS ?Status)
        (MIN(?pub) AS ?pubURI)
        (GROUP_CONCAT(DISTINCT COALESCE(?pubLabel1,?pubLabel)) AS ?Publisher)
        (MIN(COALESCE(?pubdef,'')) AS ?PublisherDefinition)

        WHERE { GRAPH ?g {
            <${uri}> skos:hasTopConcept ?tc; dcterms:title ?tit .
            ?tc skos:narrower* ?URI . ?URI skos:prefLabel ?l; adms:status ?status . 
            OPTIONAL {?URI skos:prefLabel ?l1 . FILTER(lang(?l1)="${USER_LANG}")}
            OPTIONAL {<${uri}> dcterms:title ?tit1 . FILTER(lang(?tit1)="${USER_LANG}")}
            OPTIONAL {<${uri}> dcterms:description ?desc}
            OPTIONAL {<${uri}> dcterms:description ?desc1 . FILTER(lang(?desc1)="${USER_LANG}")}
    		OPTIONAL {<${uri}> dcterms:created ?insertDate}
    		OPTIONAL {<${uri}> dcterms:modified ?editDate}
            OPTIONAL {<${uri}> adms:status ?cls}
            ${cl !== 'dataprovider' ? 'OPTIONAL {<' + uri + '> dcterms:publisher ?pub . }' : ''}
            OPTIONAL {?URI skos:notation ?n}
            OPTIONAL {?URI skos:definition ?D . filter(lang(?D)="${USER_LANG}")}
            OPTIONAL {?URI skos:broader ?o . ?o skos:prefLabel ?p .}
    		OPTIONAL {?URI skos:broader ?o . ?o skos:prefLabel ?p1 . FILTER(lang(?p1)="${USER_LANG}")}
        }
            ${cl !== 'dataprovider' ? 'GRAPH ?dp { OPTIONAL {?pub skos:prefLabel ?pubLabel} OPTIONAL {?pub skos:definition ?pubdef} OPTIONAL {?pub skos:prefLabel ?pubLabel1 . FILTER(lang(?pubLabel1)="${USER_LANG}")}}' : ''}
        }

        GROUP BY ?URI ?Label ?g ?l ?l1 ?p ?p1 ?tit ?tit1 ?desc ?desc1 ?insertDate ?editDate
        ORDER BY ?Label`);
    fetch(ENDPOINT + '?query=' + query + '&format=json')
        .then(res => res.json()) 
        .then(jsonData => {
            if (cl !== 'dataprovider') insertDataProviderCard(jsonData.results.bindings[0].Publisher.value, jsonData.results.bindings[0].PublisherDefinition.value, `${BASE}?uri=${jsonData.results.bindings[0].pubURI.value}`);
            
            let tblFields = ['Label', 'Notation', 'Definition', 'Parent', 'Status']; 

            let data = jsonData.results.bindings.map(obj =>
                Object.fromEntries(
                    tblFields.map((key) => [key, (obj[key] && obj[key].value) ? obj[key].value : ''])
                ));

                const $pageContent = $('#pageContent');
                $pageContent.append($('<h1>', {
                    class: 'mt-4',
                    text: jsonData.results.bindings[0].Title ? jsonData.results.bindings[0].Title.value : 'Titel auf nicht verfügbar'
                }));

                const $copyUriLink = $('<a>', {
                    class: 'copy-uri-btn',
                    'data-uri': uri,
                    href: '#'
                }).append($('<strong>', { text: 'URI:' }));

                const $uriSpan = $('<span>', { id: 'uri' }).css('word-wrap', 'break-word').text(` ${uri}`);
                $pageContent.append($copyUriLink);
                $pageContent.append($uriSpan);
                $pageContent.append($('<br>'));
                $pageContent.append($('<br>'));
                $pageContent.append($('<p>', {
                    text: jsonData.results.bindings[0].Description ? jsonData.results.bindings[0].Description.value : 'Beschreibung nicht verfügbar'
                }));
                $pageContent.append($('<hr>'));

// with pagination and sorting (client-side)###################################################
                let version = jsonData.results.bindings[0].g.value.split(':')[2];
                const fileName = 'rdf/' + cl + '-v' + version;
                const $meta = $('<div>', { class: 'mb-3' });
                $meta.append(document.createTextNode(`This version: ${jsonData.results.bindings[0].g.value}`));
                $meta.append($('<br>'));
                if (parseInt(version) > 1) {
                    $meta.append(document.createTextNode('Version history:  '));
                    $meta.append($('<a>', {
                        href: `${fileName}.rdf`,
                        text: `${uri}:${parseInt(version) - 1}`
                    }));
                    $meta.append($('<br>'));
                }
                $meta.append(document.createTextNode(`Status:  ${jsonData.results.bindings[0].CLS ? jsonData.results.bindings[0].CLS.value.replace(/<[^>]*>/g, '') : 'N/A'}`));
                $meta.append($('<br>'));
                $meta.append(document.createTextNode(`Insert date:  ${jsonData.results.bindings[0].insertDate ? jsonData.results.bindings[0].insertDate.value : 'N/A'}`));
                $meta.append($('<br>'));
                if (jsonData.results.bindings[0].editDate) {
                    $meta.append(document.createTextNode(`Edit date:  ${jsonData.results.bindings[0].editDate.value}`));
                    $meta.append($('<br>'));
                }
                $meta.append(document.createTextNode('Available formats:  '));
                [
                    { ext: 'rdf', label: 'RDF/XML' },
                    { ext: 'trig', label: 'TriG/Turtle' },
                    { ext: 'json', label: 'JSON-LD' },
                    { ext: 'csv', label: 'CSV' },
                    { ext: 'txt', label: 'Text' }
                ].forEach((fmt, idx) => {
                    if (idx > 0) $meta.append(document.createTextNode('  '));
                    $meta.append($('<a>', { href: `${fileName}.${fmt.ext}`, text: fmt.label }));
                });
                $pageContent.append($meta);
                $pageContent.append($('<br>'));
                $pageContent.append($('<div>', { class: 'mb-3' }).append($('<strong>', { text: 'Available items:' })));

                const $codeList = $('#CodeList');
                $codeList.append($('<hr>'));
                const $topBar = $('<div>', { class: 'd-flex justify-content-between align-items-center mt-2' });
                $topBar.append($('<div>', {
                    class: 'small text-muted',
                    id: 'codelist-info',
                    role: 'status',
                    'aria-live': 'polite',
                    'aria-atomic': 'true'
                }));
                const $nav = $('<nav>', { 'aria-label': 'Codelist pagination' });
                $nav.append($('<ul>', { class: 'pagination pagination-sm mb-0', id: 'codelist_pagination' }));
                $topBar.append($nav);
                $codeList.append($topBar);
                const $tableWrap = $('<div>', { class: 'p-1 col-sm-12 sortable-table' });
                $tableWrap.append($('<table>', { class: 'table table-hover', id: 'codelist' }));
                $codeList.append($tableWrap);
        
            // build table header
            setSortableHeader('#codelist', tblFields);

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
                    return makePaginationItemElement(page, label, disabled, active, 'codelist-page', 'codelist entries');
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
                    if (start > 2) $ul.append(makePaginationEllipsisElement());
                }

                for (let p = start; p <= end; p++) {
                    $ul.append(makePageItem(p, null, false, p === currentPage));
                }

                if (end < totalPages) {
                    if (end < totalPages - 1) $ul.append(makePaginationEllipsisElement());
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
            // sort full dataset and re-render current page
            sortableTable.events()
                .on('sort', (event) => {
                    // event.colId & event.sortDir are provided by SortableTable
                    sortMasterData(event.colId, event.sortDir);
                    renderPage(currentPage);
                });

            $('.progress-bar').css('width', '100%').attr('aria-valuenow', 100);
            setTimeout(() => {
                $('.progress').hide();
            }, 300);
        });

}

//***********************set the input box for concept search****************************************

function insertSearchCard() {

    $('#searchInput').keydown(function (e) {
        if (e.which === 13 && $('#searchInput').val().length > 0) {
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
                        entry = entry + ' (' + value.s.value.split('\/')[4].split('_').at(-1) + ')';
                    }
                    const $a = $('<a>', {
                        class: 'searchLink dropdown-item',
                        href: `${BASE}?uri=${encodeURIComponent(value.s.value)}&lang=${encodeURIComponent(USER_LANG)}`,
                        text: entry
                    });
                    const $tr = $('<tr>');
                    const $td = $('<td>');
                    $td.append($a);
                    $tr.append($td);
                    $('#dropdown').append($tr);
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
        .then(jsonData => {
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

function search(searchText) {
    let HITS_SEARCHRESULTS = '0 results for ';
    $('#pageContent').empty();
    $('#pageContent').append('<br><h1>Search results</h1><p id="hits" class="lead" role="status" aria-live="polite" aria-atomic="true"></p><hr><ul id="searchresults" class="searchresults"></ul>');
    $('#hits').text(HITS_SEARCHRESULTS + '"' + searchText + '"');
    $('#searchresults').bind("DOMSubtreeModified", function () {
        $('#hits').text(HITS_SEARCHRESULTS.replace('0', $('#searchresults li').length) + '"' + searchText + '"');
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
        .then(jsonData => {
            jsonData.results.bindings.forEach(function (a) { 
                const $li = $('<li>');
                const $link = $('<a>', {
                    href: `${BASE}?uri=${encodeURIComponent(a.s.value)}&lang=${encodeURIComponent(USER_LANG)}`
                });
                $link.append($('<strong>').text(a.title.value));

                const $propType = $('<span>', { class: 'searchPropTyp', text: 'URI: ' });
                const $uri = $('<span>', { class: 'searchResultURI', text: a.s.value });
                const $text = $('<p>', { class: 'searchResultText' }).html(createSearchResultsText(a.text.value, searchText));

                $li.append($link)
                    .append('<br>')
                    .append($propType)
                    .append($uri)
                    .append('<br>')
                    .append($text);

                $('#searchresults').append($li);
                $('#hits').text(HITS_SEARCHRESULTS.replace('0', $('#searchresults li').length) + '"' + searchText + '"');
                if ($('#searchresults li').length > 99) {
                    $('#hits').prepend('>');
                }
            });

        }).catch(function (error) {
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
        resultText += escapeHtml(propPart.split('|')[0]).replace('http:\/\/www.w3.org\/2004\/02\/skos\/core#', '<span class="searchPropTyp">skos:').replace('http://purl.org/dc/terms/', '<span class="searchPropTyp">dcterms:') + '</span> - ';
        let textArr = propPart.split('|')[1].split('\. ');
        for (let i of textArr) {
            if (i.search(new RegExp(searchText, "i")) > -1) {
                const escapedSentence = escapeHtml(i);
                resultText += escapedSentence.replace(regex1, '<strong>' + escapeHtml(searchText1) + '</strong>').replace(regex2, '<strong>' + escapeHtml(searchText2) + '</strong>') + ' .. ';
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
const RELATIONS_3 = [n.dbpo + 'category', n.owl + 'sameAs', n.dcterms + 'relation', n.dcterms + 'hasPart', n.dcterms + 'isPartOf'];
const WEB_LINK = [n.dcterms + 'source', n.dcterms + 'isReferencedBy', n.dcterms + 'subject', n.dcterms + 'isRequiredBy', n.dcterms + 'identifier', n.foaf + 'isPrimaryTopicOf', n.schema + 'subjectOf', n.foaf + 'page', n.schema + 'hasMap'];
const ICONS = [n.foaf + 'isPrimaryTopicOf', n.schema + 'subjectOf', n.foaf + 'page', n.dcterms + 'isPartOf', n.dcterms + 'hasPart'];
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
    document.getElementById('irdfQuery').value = "CONSTRUCT {?s ?p ?o} WHERE { GRAPH ?g {VALUES ?s {" + v + "} ?s ?p ?o}}";
    document.getElementById('irdfForm').submit();
}

//************set the "details page" to view a single concept ***********************************************************************

function details(divID, uri) { //build the web page content
    const dp = uri.indexOf('dataprovider') === 31;
    const $rdfForm = $('<form>', {
        id: 'irdfForm',
        target: '_blank',
        method: 'post',
        action: ENDPOINT
    }).css('display', 'none');
    $rdfForm.append($('<input>', { type: 'hidden', name: 'query', id: 'irdfQuery' }));
    $('#' + divID).append($rdfForm);
    
    let query = encodeURIComponent(`PREFIX skos:<http://www.w3.org/2004/02/skos/core#>
        PREFIX dcterms: <http://purl.org/dc/terms/>
        PREFIX adms: <http://www.w3.org/ns/adms#>
        SELECT DISTINCT ?s ?p ?o 
        (GROUP_CONCAT(DISTINCT CONCAT(STR(?L), "@", lang(?L)) ; separator="|") AS ?Label)
        (COUNT(distinct(?sr)) AS ?count)
        (COALESCE(?stat,"") AS ?status)
        (MIN(?pub) AS ?pubURI)
        (COALESCE(?pubLabel1,?pubLabel) AS ?Publisher)
        (MIN(?pubdef) AS ?PublisherDefinition)

        WHERE { GRAPH ?g 
            { VALUES ?s {<${uri}>}
            ?s ?p ?o .
            OPTIONAL {?o skos:prefLabel ?L}
            OPTIONAL {?o skos:narrower|skos:related ?sr}
            OPTIONAL {?o adms:status ?stat}
            ${dp ? '':'OPTIONAL {?s skos:inScheme ?cs . ?cs dcterms:publisher ?pub . }'}
            }
            ${dp ? '':'GRAPH ?dp { OPTIONAL {?pub skos:prefLabel ?pubLabel . } OPTIONAL {?pub skos:definition ?pubdef . } OPTIONAL {?pub skos:prefLabel ?pubLabel1 . FILTER(lang(?pubLabel1)="${USER_LANG}")}}'}
        }
        GROUP BY ?s ?p ?o ?stat ?pubLabel1 ?pubLabel
        ORDER BY ?Label`);

    fetch(ENDPOINT + '?query=' + query + '&format=json')
        .then(res => res.json())
        .then(jsonData => {
            if (!dp && jsonData.results.bindings.length > 0) {
                insertDataProviderCard(jsonData.results.bindings[0].Publisher.value, jsonData.results.bindings[0].PublisherDefinition.value, `${BASE}?uri=${jsonData.results.bindings[0].pubURI.value}`);
            }

            if (jsonData.results.bindings.length > 1) {
                uri = jsonData.results.bindings[0].s.value;
                
                for (key in FRONT_LIST) createFrontPart(divID, uri, jsonData, Array.from(FRONT_LIST[key].values()));

                // RDF download icon added to apps (notation div or altLabel div)
                let r_links = jsonData.results.bindings.map(a => [a.p.value, '<' + a.o.value + '>']).filter(b => b[0] == REF_LINKS[0]).map(c => c[1]).join(' ');
                const $row = $('<div>');
                const $rdfWrap = $('<span>');
                const $rdfLink = $('<a>', {
                    href: '#',
                    title: 'RDF download',
                    style: 'text-decoration: none;'
                }).on('click', function (e) {
                    e.preventDefault();
                    rdfTS('<' + uri + '> ' + r_links);
                });
                $rdfLink.append($('<img>', {
                    src: 'assets/rdf-svgrepo-com.svg',
                    class: 'downscaled-svg blue-svg',
                    alt: 'RDF icon'
                }));
                $rdfWrap.append($rdfLink);
                $row.append($rdfWrap).append('&nbsp;');

                if (jsonData.results.bindings.filter(a => a.p.value == 'http://www.w3.org/2004/02/skos/core#narrower').length > 0) {
                    const $tblWrap = $('<span>');
                    const $tblLink = $('<a>', {
                        href: `tbl.html?uri=${encodeURIComponent(uri)}`,
                        title: 'table view',
                        target: '_blank',
                        style: 'text-decoration: none;'
                    });
                    $tblLink.append($('<img>', {
                        src: 'assets/table-list.svg',
                        class: 'downscaled-svg blue-svg',
                        alt: 'table icon'
                    }));
                    $tblWrap.append($tblLink);

                    const $treeWrap = $('<span>');
                    const $treeLink = $('<a>', {
                        href: `diagram.html?uri=${encodeURIComponent(uri)}`,
                        title: 'tree view',
                        target: '_blank',
                        style: 'text-decoration: none;'
                    });
                    $treeLink.append($('<img>', {
                        src: 'assets/sitemap-solid-full.svg',
                        class: 'downscaled-svg blue-svg',
                        alt: 'tree icon'
                    }));
                    $treeWrap.append($treeLink);

                    $row.append($tblWrap).append('&nbsp;').append($treeWrap);
                }

                if ($('#appsInsert').length > 0) {
                    $('#appsInsert').append($row);
                } else {
                    const $appsInsert = $('<div>', { id: 'appsInsert' }).css('float', 'right');
                    $appsInsert.append($row);
                    if ($('#notation').length > 0) {
                        $('#notation').after($appsInsert);
                    } else {
                        $('#altLabel').after($appsInsert);
                    }
                }

                
                const $detailsWrap = $('#' + divID);
                $detailsWrap.append($('<hr>'));
                const $detailsBtn = $('<button>', {
                    type: 'button',
                    class: 'btn btn-link p-0 text-start',
                    id: 'detailsBtn',
                    'aria-expanded': 'false',
                    'aria-controls': 'detailsToggle'
                }).css({ color: '#777', textDecoration: 'none' });
                $detailsBtn.append($('<img>', {
                    src: 'assets/caret-right-solid.svg',
                    class: 'downscaled-svg grey-svg',
                    alt: 'caretRight icon'
                }));
                $detailsBtn.append($('<em>').html('&nbsp;&nbsp;RDF statements'));
                $detailsWrap.append($detailsBtn);

                const $detailsToggle = $('<div>', {
                    id: 'detailsToggle',
                    hidden: 'hidden',
                    'aria-hidden': 'true'
                }).css({ display: 'none', position: 'relative' });
                $detailsToggle.append($('<br>'));
                $detailsToggle.append($('<table>', { id: 'details' }));
                $detailsWrap.append($detailsToggle);


                for (key in TECHNICAL_LIST) createTechnicalPart('details', jsonData, Array.from(TECHNICAL_LIST[key].values()));

                if (!dp){insertConceptBrowser(divID, uri, 50);}

            } else {
                const $wrap = $('#' + divID);
                $wrap.append($('<hr>'));
                const $alert = $('<div>', { class: 'alert alert-dismissible alert-warning' });
                $alert.append($('<button>', { type: 'button', class: 'btn-close', 'data-bs-dismiss': 'alert' }));
                $alert.append($('<h4>', { class: 'alert-heading', text: 'Can´t open the page!' }));
                const $p = $('<p>', { class: 'mb-0' });
                $p.append(document.createTextNode('404 Resource Not Found'));
                $p.append($('<br>'));
                $p.append(document.createTextNode(uri));
                $alert.append($p);
                $wrap.append($alert);
            }
        });
}

//************************toggle the hidden details **************

function toggleRead(divBtn, divTxt, text) {
    const $btn = $('#' + divBtn);
    const $target = $('#' + divTxt);
    const expanded = $target.is(':hidden');
    const txt = expanded
        ? '<img src="assets/caret-down-solid.svg" class="downscaled-svg grey-svg" alt="caretDown icon"><em>&nbsp;&nbsp;' + text + '</em>'
        : '<img src="assets/caret-right-solid.svg" class="downscaled-svg grey-svg" alt="caretRight icon"><em>&nbsp;&nbsp;' + text + '</em>';

    $btn.html(txt).attr('aria-expanded', expanded ? 'true' : 'false');

    if (expanded) {
        $target.removeAttr('hidden').attr('aria-hidden', 'false').show();
    } else {
        $target.attr('hidden', 'hidden').attr('aria-hidden', 'true').hide();
    }
}

//*************create the upper part of details page - always visible *********************************************************************

function createFrontPart(divID, uri, data, props) {
    let html = '';
    let pL = '';

    props.forEach((i) => {
        let ul = getObj(data, i);
        if (ul.size > 0) {
            switch (key) {
                case 'prefLabel':
                    pL = setUserLang(Array.from(ul).join('|').replace(/  <span class="lang">/g, '@').replace(/<\/span>/g, ''));
                    const codelist = uri.split('/').slice(0, -1).join('/');
                    
                    html += `<ol class="breadcrumb mt-3" style="margin-left: -12px;">
                        <li class="breadcrumb-item"><a href="${BASE}">registry</a></li>
                        <li class="breadcrumb-item"><a href="${BASE}?uri=${encodeURIComponent(codelist)}">${escapeHtml(codelist.split('/').pop())}</a></li>
                        <li class="breadcrumb-item active">${escapeHtml(pL)}</li>
                    </ol>`;
                        
                    html += `<h1 id="prefLabel" class="mt-4">${escapeHtml(pL)}</h1>`;

                    html += `<p>
                        <a class="copy-uri-btn"
                            data-uri="${escapeAttr(uri)}"
                            href="#"><strong>URI:</strong>
                        </a>
                        <span id="uri" style="word-wrap: break-word;">
                            &nbsp;${escapeHtml(uri)}
                        </span>
                    </p>
                    <hr>`;
                    break;
                case 'altLabel':
                    html += '<ul id="altLabel" class="' + key + '"><li>' + Array.from(ul).join('</li><li>') + '</li></ul>';
                    break;
                case 'notation':
                    $('#' + divID).append('<hr><span></span>');
                    html += `<ul id="notation" class="${key}">
                            <li>Notation: ${Array.from(ul)[0]}</li>`;
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
                case 'abstract':
                    html += '<hr><div class="' + key + '">' + setUserLang(Array.from(ul).join('|').replace(/  <span class="lang">/g, '@').replace(/<\/span>/g, '')) + '</div>';
                    break;
                case 'scope':
                    html += '<br><p class="text-secondary">Anmerkung:<br>' + Array.from(ul).map(a => a.split('<')[0]).join('<br><br>') + '</p>';
                    break;
                case 'citation':
                    let a = []; 
                    if (uri.indexOf('ref')>1){ html += '<br>' }
                    html += '<br><footer class="blockquote-footer">' + Array.from(a).join('</footer><footer class="blockquote-footer">') + '</footer>';
                    break;
                case 'relatedConcepts':

                    if (html.search('<h4') == -1) {
                        html += '<hr><h4 style="margin-bottom: 1rem;">Concept relations</h4>';
                    }
                    html += '<table><tr><td class="skosRel' + i.search('Match') + ' skosRel">' + i.replace(n.skos, '').replace(n.geosparql, '').replace(n.prov, '').replace(n.dcterms, '') + '</td><td class="skosRelUl"><ul><li>' + shortenText(Array.from(ul).join('</li><li>')) + '</li></ul></td></tr></table>';
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
        const safeImageUrl = safeHttpUrl(i);
        if (!safeImageUrl) return;

        const $card = $('<div>', { class: 'card my-4' });
        const $body = $('<div>', { class: 'card-body' });
        const $figure = $('<figure>');
        const $link = $('<a>', { href: safeImageUrl });
        const $img = $('<img>', { class: 'img-fluid', src: safeImageUrl, alt: 'Chania', title: '' });
        const $caption = $('<figcaption>');
        if (safeImageUrl.indexOf('wikimedia') > 0) {
            $caption.append($('<img>', { src: '../img/wikimedia.png', alt: 'Wikimedia', height: '12' }));
            $caption.append(' ');
        }
        $caption.append(document.createTextNode(capt));

        $link.append($img).append($caption);
        $figure.append($link);
        $body.append($figure);
        $card.append($body);
        $('#' + divID).append($card);
    });
}

//*******************insert data provider card as side information************************************************************************

function insertDataProviderCard(title, text, link) {
    $('#data_providers').empty();

    const $card = $('<div>', { class: 'card border-light mb-3 data-provider-secondary-card' });
    const $header = $('<div>', { class: 'card-header', text: PAGE.dataprovider.cardheader[USER_LANG] });
    const $body = $('<div>', { class: 'card-body' });
    $body.append($('<h4>', { class: 'card-title', text: title }));
    $body.append($('<p>', { class: 'card-text', text: text }));
    const $uriLabel = $('<span>').text('URI: ');
    const $uriLink = $('<a>', { href: link, text: (link.split('=')[1] || '') });
    $body.append($uriLabel).append($uriLink);
    $card.append($header).append($body);

    $('#data_providers').prepend($card);
}

//*******************replace long URIs by acronyms************************************************************************

function shortenText(htmlText) {

    const abbrevList = [
        ['INSPIRE', 'http://inspire.ec.europa.eu/codelist/'],
        ['INSPIRE', 'http://inspire.ec.europa.eu/featureconcept/'],
        ['INSPIRE', 'https://inspire.ec.europa.eu/registry/status/'],
        ['DBpedia', 'http://dbpedia.org/resource/'],
        ['WIKIDATA', 'http://www.wikidata.org/entity/'],
        ['codelist', 'https://registry.inspire.gv.at/codelist/']
    ];
    for (const [name, prefix] of abbrevList) {
        htmlText = htmlText.split('>' + prefix).map(a => a.replace('<', ` (${name})<`)).join('>').replace(` (${name})`, '');
    }
    return htmlText;
}

//******************create the hidden part of concept descriptions ***********************************************************************

function createTechnicalPart(divID, data, props) { //loop all single properties
    let geoPath = 'http://www.w3.org/2003/01/geo/wgs84_pos#';
    const $rows = [];

    props.forEach((i) => {
        let ul = getObj(data, i);
        if (ul.size > 0) {
            const $tr = $('<tr>');
            const $tdProp = $('<td>', { class: 'propTech' }).html(createHref(i));
            const $tdVal = $('<td>');
            const $ul = $('<ul>');
            Array.from(ul).forEach((item) => {
                $ul.append($('<li>').html(shortenText(item)));
            });
            $tdVal.append($ul);
            $tr.append($tdProp).append($tdVal);
            $rows.push($tr);

            if (i == geoPath + 'lat' || i == geoPath + 'long') {
                // Coordinates are currently rendered as text in the technical table.
            }
        }
    });

    if ($rows.length > 0) {
        const $target = $('#' + divID);
        const $headRow = $('<tr>', { id: key });
        $headRow.append($('<th>'));
        $headRow.append($('<th>', { text: key }));
        $target.append($headRow);
        $rows.forEach(($r) => $target.append($r));
    }
}
//******************transform the sparql json query result into a set of HTML elements like <a> *************************************

function getObj(data, i) {
    return new Set(
        $.map(data.results.bindings.filter(item => item.p.value === i), (a => (
            a.Label !== undefined
                ? '<a href="' + BASE + '?uri=' + encodeURIComponent(a.o.value) + '&lang=' + encodeURIComponent(USER_LANG) + '">' + escapeHtml(setUserLang(a.Label.value)) + '</a>  ' + addPlusSign(a.count['value'])
                : createHref(a.o.value) + ' ' + createDTLink(a.o.datatype) + ' ' + langTag(a.o['xml:lang'])
        )))
    );
}

//*******************count of further concepts if > 0*******************
function addPlusSign(x) {
    if (x === "0") {
        x = '';
    } else {
        x = `<span class="plusSign">(${x})</span>`; //cycled plus for narrower concepts
    }
    return x;
}

//*******************prepare HTML links for browsing the vocabulary***************************************************

function createHref(x) {
    let isRegistry = normalizeRegistryUri(x) !== '';
    if (x.substring(0, 4) == 'http') {
        const safeUrl = safeHttpUrl(x);
        if (!safeUrl) {
            return escapeHtml(x);
        }
        let a = x;
        for (const [key, value] of Object.entries(n)) a = a.replace(value, key + ':');
        const href = isRegistry ? `${BASE}?uri=${encodeURIComponent(safeUrl)}` : safeUrl;
        x = `<a href="${escapeAttr(href)}">${escapeHtml(a.replace(/_/g, ' '))}</a>`;
    }
    return x;
}

//*******************create beautiful language tags*******************************************************************

function langTag(x) {
    if (typeof x !== 'undefined') {
        x = '<span class="lang">' + escapeHtml(x) + '</span>';
    } else {
        x = '';
    }
    return x;
}

//********************create beautiful xsd data format tags******************************************************************************

function createDTLink(x) {
    if (typeof x !== 'undefined') {
        if (x.indexOf('XMLSchema') > 0) {
            x = '<a class="datatype" href="' + escapeAttr(x) + '">' + escapeHtml(x.replace('http://www.w3.org/2001/XMLSchema#', 'xsd:')) + '</a>';
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

//*******************************************************************************************************
//***************create a bootstrap card with all concept links within a concept scheme******************

function insertConceptBrowser(divID, uri, offset) {
    const $target = $('#' + divID);
    $target.append($('<hr>'));
    const $details = $('<details>', { id: 'conceptsList' });
    const $summary = $('<summary>');
    $summary.append($('<img>', {
        src: 'assets/caret-right-solid.svg',
        class: 'downscaled-svg grey-svg',
        alt: 'caretRight icon'
    }).css('margin-right', '5px'));
    $summary.append($('<em>', { id: 'allConceptsHeader' }).css('display', 'inline-block'));
    $details.append($summary);
    $details.append($('<div>', { id: 'allConcepts', class: 'card-body' }));
    $target.append($details);
    $target.append($('<hr>'));

    provideAll('allConcepts', uri, 0);
}
//*******************the query to provide all concept links within a concept scheme****************************************************

function provideAll(divID, uri, offset) { //provide all available concepts for navigation
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
            if(data.results.bindings.length <1){
                $('#conceptsList').hide();
            } else if (offset === 0) {

                $('#allConceptsHeader').text(data.results.bindings[0].Title.value + ' (alphabetical list of concepts)');
                allConcepts.empty();
                allConcepts.append($('<div>', {
                    class: 'allConceptsPerex',
                    text: data.results.bindings[0].Desc.value.slice(0, 400)
                }));
                allConcepts.append($('<br>'));

                ([...new Map(data.results.bindings.map(({ c, sColor, Label, Desc }) => ({ c, sColor, Label, Desc })).map(item => [item.c.value, item])).values()]).forEach((i) => {
                    const $item = $('<div>');
                    if (i.sColor && i.sColor.value) {
                        $item.css('background-color', i.sColor.value);
                    }
                    const $link = $('<a>', {
                        'data-toggle': 'tooltip',
                        'data-placement': 'right',
                        'data-html': 'true',
                        title: `${i.Label.value} - ${i.Desc.value.slice(0, 230)}..`,
                        href: `${BASE}?uri=${encodeURIComponent(i.c.value)}&lang=${encodeURIComponent(USER_LANG)}`,
                        text: trnc(i.Label.value)
                    });
                    $item.append($link);
                    a.push($item);
                });

                const $cards = $('<div>', { class: 'allConceptsCards' });
                a.forEach($node => $cards.append($node));
                allConcepts.append($cards);

                const $controls = $('<div>', { id: 'coBr' }).css({ justifyContent: 'center', display: 'flex', margin: '5px' });
                const $btn = $('<button>', {
                    type: 'button',
                    id: 'rightBtn',
                    class: 'btn',
                    'data-uri': uri,
                    text: 'Show next 100...'
                }).css({ backgroundColor: '#004953', color: 'white' });
                $controls.append($btn);
                allConcepts.append($controls);
            } else {
                ([...new Map(data.results.bindings.map(({ c, sColor, Label, Desc }) => ({ c, sColor, Label, Desc })).map(item => [item.c.value, item])).values()]).forEach((i) => {
                    const $item = $('<div>');
                    if (i.sColor && i.sColor.value) {
                        $item.css('background-color', i.sColor.value);
                    }
                    const $link = $('<a>', {
                        'data-toggle': 'tooltip',
                        'data-placement': 'right',
                        'data-html': 'true',
                        title: `${i.Label.value} - ${i.Desc.value.slice(0, 230)}..`,
                        href: `${BASE}?uri=${encodeURIComponent(i.c.value)}&lang=${encodeURIComponent(USER_LANG)}`,
                        text: trnc(i.Label.value)
                    });
                    $item.append($link);
                    a.push($item);
                });
                a.forEach($node => $(".allConceptsCards").append($node));
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
