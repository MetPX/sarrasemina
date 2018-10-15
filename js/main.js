// ---------------------------------------------------------------------
//
// Author        : Daniel Léveillé
//                  SSC-SPC - Gouvernement du Canada
// created       : 2017-08-24 08:00:00
// last-modified : 2018-10-15 12:41:23
//
//  ### TODO ###
//      -> Do some more cleanup in this file!
//      -> Do optimize mem usage
//
// ---------------------------------------------------------------------

"use strict";

/*#*/var DEBUG = false;/*#*/
/*#*/if( DEBUG ){ console.time   ( "   " ); console.group(me("--- WARMING UP ---"));};/*#*/

if( $.cookie( "LANG" ) === undefined )                                  // Detect browser's default language and set cookie
    $.cookie( "LANG", (/fr/.test(navigator.languages[0]) ? 'fr':'en') );


// ---------------------------------------------------------------------
//  CLASSES
// ---------------------------------------------------------------------

const CANCEL        = Symbol(),
      CANCEL_SEARCH = Symbol();

class CancellationToken {
    constructor() {
        this.cancelled       = false;
        this.cancelledSearch = false;
    }
    [ CANCEL ]()              { this.cancelled       = true; }
    [ CANCEL_SEARCH ]()       { this.cancelledSearch = true; }
    reset()                   {
                                this.cancelled       = false;
                                this.cancelledSearch = false;
                                }
    isCancelled()             { return this.cancelled       === true; }
    isSearchCancelled()       { return this.cancelledSearch === true; }
    throwIfCancelled()        { if( this.isCancelled() )       { throw "Cancelled"; } }
    throwIfSearchCancelled()  { if( this.isSearchCancelled() ) { throw "CancelledByUser"; } }
}

class CancellationTokenSource {
    constructor()   { this.token = new CancellationToken(); }
    cancel()        { this.token[ CANCEL ](); }
    cancelSearch()  { this.token[ CANCEL_SEARCH ](); }
    reset()         { this.token.reset(); }
}


// ---------------------------------------------------------------------
//  GLOBAL VARS
// ---------------------------------------------------------------------

const
    L    = '\n',
    FILTER = {
        CHAR_DELIMITER : '|',
        MAX_SUBTOPICS  : null,                  // User may enter an unlimited number of subtopics...
        INPUT_AMQP_SRC : '#input-subtopics'
    },
    CONFIG = {
        options : {
            broker        : "amqps://anonymous@dd.weather.gc.ca",
            exchange      : "xpublic",
            expire        : "5m",                                        // default:  5m   - s[econds], m[inutes], h[our], d[ay], w[eek]
            inflight      : ".tmp",                                      // default: .tmp  - or NONE if post_broker is set
            instances     : "1",                                         // default:  1    - add more instances if there is lagging
            mirror        : "True",                                      // default:  True - will build a mirror directory structure; False: will put all files in same directory
            topic_prefix  : "v02.post",
            subtopic      : [],
            accept_reject : [],
            accept_unmatch: "False"
        },
        setup   : ( newOptions = {} ) => {
            CONFIG.options = Object.assign( {}, CONFIG.options, newOptions );
        },
        write   : ( includeHints = false, includeMan = false ) => {
            let config=getConfigHeader(includeMan), pad='accept_unmatch'.length+2, newOptions={}, subtopics=[], accept_rejects=[];

            subtopics = $( "#input-subtopics" ).val().split(FILTER.CHAR_DELIMITER);
            for( let i=0; i<subtopics.length; i++ ) {
                subtopics[i] = subtopics[i].trim();
            }
            
            $( ".input-accept_reject" ).each( (index, item)  => { let filter = $(item).val(); if( filter ) accept_rejects.push( [$(item).data('ar'),filter] ); });
            newOptions.topic_prefix   = $(".label-topic").data('label');
            newOptions.subtopic       = subtopics;
            newOptions.accept_reject  = accept_rejects;
            newOptions.accept_unmatch = $("#btn-accept_unmatch").data('accept_unmatch');
            
            CONFIG.options = Object.assign( {}, CONFIG.options, newOptions );
            
            Object.keys(CONFIG.options).forEach( (opt) => {
                switch( opt ) {
                    case 'subtopic':
                        if( CONFIG.options[opt].length > 0 ) {
                            for( let i=0; i<CONFIG.options[opt].length; i++ )
                                config += L+ opt.padEnd(pad) + CONFIG.options[opt][i];
                            if( includeMan )   config += getConfigManual(opt) + (includeHints && t.confComment[opt].length ? '':'\n');
                            if( includeHints ) config += t.confComment[opt];
                        }
                        break;
                    case 'accept_reject':
                        if( CONFIG.options[opt].length > 0 ) {
                            for( let i=0; i<CONFIG.options[opt].length; i++ ) {
                                config += L+ CONFIG.options[opt][i][0].padEnd(pad) + CONFIG.options[opt][i][1];
                            }
                            if( includeMan )   config += getConfigManual(opt) + (includeHints && t.confComment[opt].length ? '':'\n');
                            if( includeHints ) config += t.confComment[opt];
                        }
                        break;
                        
                    default: 
                        config += L+ opt.padEnd(pad) + CONFIG.options[opt];
                        if( includeMan )   config += getConfigManual(opt) + (includeHints && t.confComment[opt].length ? '':'\n');
                        if( includeHints ) config += t.confComment[opt];
                }
            });
            return config;
        }
    },
    CATALOG = {
        MAX            : 5,                                             // Display only the latest MAX (5) Catalogues available; i.e.: ignore the rest (older ones)
        NAME           : '',
        LOADTIME       : 0,
        FILETYPE       : 'toc',
        DATA_SEPARATOR : '|',
        id_NB_FILES    : 0,
        id_RANGE_START : 1,
        id_RANGE_STOP  : 2,
        id_TOTAL_SIZE  : 3
    },
    GUI = {
        state           : 0,
        STATE_READY     : 0,
        STATE_RESET     : 1,
        STATE_LOADING   : 2,
        STATE_SEARCHING : 3,
        STATE_FOUND     : 4,
        BLACK :'black',
        BLUE  :'blue'
    },
    LANG = $.cookie("LANG"),                                            // Select user's prefered language
    PANE = {
        EDITOR   : "editor",
        CATALOGUE: "folders",
        SUBTOPIC : "topics",
        FILES    : "files"
    },
    TAG = { 
        H1: ['<h1>','</h1>'],                                       // Predefined tag wrapers
        cG: ['<span class="c-gris">'    , '</span>'],
        cJ: ['<span class="c-jaune">'   , '</span>'],
        cR: ['<span class="c-rouge">'   , '</span>'],
        cV: ['<span class="c-vert">'    , '</span>'],
        
        Vxs:['<span class="visible-xs-inline">', '</span>'],
        Hxs:['<span class="hidden-xs">'        , '</span>'],
        
        CN: ['<strong class="c-noir">'  , '</strong>'],
        CB: ['<strong class="c-bleu">'  , '</strong>'],
        CR: ['<strong class="c-rouge">' , '</strong>'],
        CV: ['<strong class="c-vert">'  , '</strong>']
    };
    
var
    t       = {},                                                       // GUI's text container
    selectedFilesCatalogue,                                             // ### NOTE ### Catalogue is splitted in two data files: .json (contains folder paths) and .toc (contains file names)
    bigData_Folders = [],                                               // Array of objects - folders data (catalogue.json)
    bigData_Files   = [],                                               // Array of objects - files   data (catalogue.toc - byterange)
    GUIstate        = 0,
    statistics      = {
        catalog : {},
        search  : {},
        results : {},
        reset   : ( { catalog, search, results } = {} ) => {
            
            if( !catalog && !search && !results ) {
                statistics.catalog={};
                statistics.search ={};
                statistics.results={};
            }
            if( catalog ) statistics.catalog = catalog;
            if( search  ) statistics.search  = search;
            if( results ) statistics.results = results;
        }
    },
    searchToken     = new CancellationTokenSource,
    
    cluster         = {},
    $selectize      = {},
    progressBar     = {
        $progress     : $('.progress'),
        $progress_bar : $('.progress-bar'),
        $progress_txt : $('.progress .info'),
        
        max           : 0,
        str           : {ln1:'',ln2:''},
        color         : GUI.BLACK,
        progress      : 0,
        minCount2Show : 5000,                   // minimum number of file count iterations to worth display progress bar...
        isWorth2Display: 0,
        
        doColor       : function( newColor ) { $('.progress').removeClass( this.color ).addClass( newColor ); this.color = newColor; },
        doHide        : function() { $('.progress').hide(); },
        doShow        : function() { $('.progress').show(); },
        init          : function( max, s={ ln1:t.data.searching, ln2:'' }, color ) {
                            this.max      = max;
                            this.str      = s;
                            this.doColor( color||GUI.BLACK );
                            this.progress = "0%";
                            this.$progress_bar.width( this.progress );
                            this.$progress_txt.html( `${this.str.ln1} - [ 0% ]${( this.str.ln2 ? `<br>0${this.str.ln2}`:'' )}` );
                            this.$progress.show();
                        },
        set           : function( num, found=0 ) {
                            if( this.max && num ) {
                                this.progress = String( Math.round( num / this.max * 100 ) ) +"%";
                                this.$progress_bar.width( this.progress );
                                this.$progress_txt.html( `${this.str.ln1} - [ ${this.progress} ]${(found?`<br>${numeral(found).format('0,0')}${this.str.ln2}`:'')}` );
                            }
                        },
        updateDisplay : function( count ) { this.isWorthDisplay = count > this.minCount2Show; }
    };

// ---------------------------------------------------------------------
//  TEST ZONE BEGIN
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------

// Test if a config is available in cookie.
/** /

// Serialize user's config
Person.prototype.toJson = function() {
    return JSON.stringify({age: this.age});
};

// Similar for deserializing:
Person.fromJson = function(json) {
    var data = JSON.parse(json); // Parsing the json string.
    return new Person(data.age);
};

// The usage would be:
var serialize = p1.toJson();
var _p1 = Person.fromJson(serialize);
alert("Is old: " + _p1.isOld());
/**/


// ---------------------------------------------------------------------

// 
// Returns server origin
// Since development domains do not host product files,
// a default server is provided.
    
function getOrigin() {
    let domain = window.location.origin.split('//')[1].split('.')[0];
    return ['lab','pfd-dev1'].includes( domain ) ? 'http://ddi1.cmc.ec.gc.ca/' : window.location.origin +"/";
}

function getConfigHeader( includeMan ) {
    let regxWarning  = $("#checkbox-regex_case").is(":checked") ? t.confComment.regex_case:"";
    let configHeader = regxWarning + t.confComment[(includeMan ? 'SarraS_git':'SarraS')].replace('(url)',`<a href="${window.location.href}" target="_blank">${window.location.href}</a>`).replace('(catalogue)',CATALOG.NAME).replace('(date)',(new Date()).toJSON());
    if( includeMan ) {
        let url = t.confManual.baseURL.split('|');
        configHeader = configHeader.replace('(git)', `<a href="${url[0]}" target="_blank">${url[0]}</a>`);
    }
    return configHeader;
}
function getConfigManual(opt) {
    let man = t.confManual[opt];
    if( man ) {
        let url = t.confManual.baseURL.split('|'),
            lnk = man.split('|'),
//             out = L+'# <a href="'+url[0]+lnk[0]+'" target="_blank">'+url[1]+lnk[1]+' <i class="fa fa-external-link" aria-hidden="true"></a>';
            out = url[1] +' <a href="'+url[0]+lnk[0]+'" target="_blank">'+lnk[1]+'</a>';
//     console.log('opt[',opt,']\nman[',man,']\nurl[',url,']\nlnk[',lnk,']\nout[',out,']\n');
        return out;
    }
}
    
function setSubtopicFilters( filterOptions=[], groupOptions=[] ) {
    
    var eventHandler = function get (name) {
        return function give() {
            if( name === "onChange" ) {
                $('#btnSearchReset').prop('disabled', ($(FILTER.INPUT_AMQP_SRC).val() === "") );
                setFilterSubtopic( isValidAMQP( $(FILTER.INPUT_AMQP_SRC).val() ) ? 'enable':'disable' );
            }
            /** /
            if( $selectize[0] )
                if( $selectize[0].selectize )
                    if( $selectize[0].selectize.$activeItems ) {
                        console.log( me(), name, $selectize[0].selectize.$activeItems);
                        $selectize[0].selectize.$activeItems;
                    }
                    else
                        console.log( me(), name, $selectize[0].selectize);
                else
                    console.log( me(), name, $selectize[0]);
            else
                console.log( me(), name );
            /**/
        };
    };
    
    if( $selectize.length ) {
        $selectize[0].selectize.setValue( '' );
        $(FILTER.INPUT_AMQP_SRC).selectize()[0].selectize.destroy();
        $selectize = {}
    }
    
    $selectize =
    $(FILTER.INPUT_AMQP_SRC).selectize({
         persist          : true
        ,diacritics       : true
        ,closeAfterSelect : true
        ,plugins          : ['remove_button','restore_on_backspace','drag_drop']
        ,maxItems         : FILTER.MAX_SUBTOPICS
        ,delimiter        : FILTER.CHAR_DELIMITER
        ,placeholder      : FILTER.MAX_SUBTOPICS !== null ? t.addUpTo_N_filters.replace('_N_',FILTER.MAX_SUBTOPICS) : t.addAMQPfilters
        ,options          : filterOptions
        ,optgroups        : groupOptions
        ,optgroupField    : 'path'
        ,valueField       : 'filter'
        ,labelField       : 'filter'
        ,searchField      : ['filter']
        ,create           : (input) => { return { path: 'X', filter: input }; }
        ,render           : {
             optgroup_add   : (input) => { return { id:'X', data: input }; }
            ,optgroup_header: (data, escape) => { return '<div class="optgroup-header">' + escape(data.label) + '</div>'; }
            ,item   : (item, escape) => {
                if( item.filter ) {
                    let classAMQP = !isValidAMQP( item.filter, false ) ? ' c-ERR':'';
                    return `<div class="editable-click item${classAMQP}">${escape(item.filter)}</div>`;
                }
            }
        }
        ,onChange        : eventHandler('onChange')
        ,onItemAdd       : eventHandler('onItemAdd')
        ,onItemRemove    : eventHandler('onItemRemove')
        ,onOptionAdd     : eventHandler('onOptionAdd')
        ,onOptionRemove  : eventHandler('onOptionRemove')
        ,onDropdownOpen  : eventHandler('onDropdownOpen')
        ,onDropdownClose : eventHandler('onDropdownClose')
        ,onFocus         : eventHandler('onFocus')
        ,onBlur          : eventHandler('onBlur')
        ,onInitialize    : eventHandler('onInitialize')
    });

}

// ---------------------------------------------------------------------
//  TEST ZONE END
// ---------------------------------------------------------------------

// ---------------------------------------------------------------------
//  Initialize Engine
// ---------------------------------------------------------------------

_initialize_();

/*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/

// ==========================================================================================================================================
//  I/O Stuff
// ==========================================================================================================================================

// ---------------------------------------------------------------------
//
// Start engines!

function _initialize_() {
// let DEBUG = true;
/*#*/if( DEBUG ){ console.group(me());};/*#*/
    
    let switchLangue = { fr: { btn:"English", title:"Display in English" }, en: { btn:"Français", title:"Afficher en français" } }
    $("#switchLang").attr('title',switchLangue[LANG].title).text( switchLangue[LANG].btn ).addClass(LANG).show();

    searchToken.cancel();
    _init_data_tabs();
    
    var msg = {                                                         // Set GUI's fallback texts
            "ini":{ "fr":"Chargement des fichiers JSON.",
                    "en":"Loading JSON files."
            },
            "err":{ "loadJSON": {
                        "fr":"Erreur au chargement de l'un des fichiers JSON. Code #",
                        "en":"Error while loading one of the JSON files. Code #"
                    },
                    "noCatalogues": {
                        "fr":"Aucun catalogue disponible pour l'instant.",
                        "en":"There are no catalogues actually available."
                    },
                    "browserIssue": {
                        "fr":"Votre navigateur ne semble pas supporter les fonctionnalités requises pour ce site.\n\nSi vous éprouvez des problèmes à afficher les informations, veuillez installer un navigateur ayant une version égale ou supérieure aux suggestions suivantes :\n\n",
                        "en":"Your browser does not seem to support the features required for this site.\n\nIf you have problems accessing / displaying data, please consider installing a browser having a version equal to (or newer than) one from the following suggestions :\n\n",
                    },
                    "browserUsed": {
                        "fr":"Votre navigateur actuel est :\n",
                        "en":"Your actual browser is:\n"
                    }
            },
            "cookie":{ "fr":'<strong>Ce site utilise des témoins pour : </strong> &nbsp; 1- Conserver votre langue préférée. &nbsp; 2- Ne pas répéter les avertissements (vieux navigateurs). &nbsp; <strong>C’est tout!</strong>',
                        "en":'<strong>This site use cookies to: </strong> &nbsp; 1- Remember your prefered language. &nbsp; 2- Keep shut warning dialogs (on old browsers). &nbsp; <strong>That’s it!</strong>'
            }
        },
        requests    = jsonURLs.map((url) => $.ajax(url)),               // Get JSON requests for GUI texts & catalogue lists from jsonURLs global var
        $catalogues = $("#catalogues");
    
    $catalogues.html( wrap( msg.ini[LANG] ) );
    testCookies();
    testBrowserCompatibility();
    
    
    Promise .all    ( requests )
            .then   ( processData )
            .catch  ( processError );                                    // Load GUI texts  ### MS IE don't support Promise -> Only MS Edge
    
    function processError(data) {
        $catalogues.html( wrap( msg.err.loadJSON[LANG] + data.status, ['<p style="white-space: pre-wrap; font-size: 10px;">','</p>'] ) );
    }

    function processData(data) {
    
        let dataDirs = data[0]; // raw data: need processing
        let GUItexts = data[1];
        let DOCtexts = data[2];
        var brokers  = data[3];
        let dirBase  = jsonURLs[0];
        let catalogs = [];
        $(dataDirs).find('a[href$="/"]').each( function(){ 
            let jUrl = $(this).attr('href');
            if( jUrl !== "/" ) {
                let dirName = jUrl.slice(0,-1);
                catalogs.push( dirName );
            }
        });
        
        $.extend(t,GUItexts[LANG],DOCtexts[LANG],GUItexts.icons);

        $("#title")                .html(t.title);
        $(".title-text")           .html(t.titleHeader);
        $(".label-filters")        .html(t.filters._        +t.comma);
        $("#caseInsensitive")      .html(t.filters.caseInsensitive);
        $(".label-topic")          .html(t.topic            +t.comma);
        $(".label-subtopic")       .html(t.subtopic         +t.comma);
        $(".input-subtopic")       .attr("placeholder", t.placeholder.AMQP_filter ).attr("aria-label",t.enterYourFilter);
        $(".label-accept_reject")  .html(wrap(t.accept,    TAG.cV) +t.comma);
        $(".input-accept_reject")  .attr("placeholder", t.placeholder.Regex_filter).attr("aria-label",t.enterYourFilter);
        $(".label-accept_unmatch") .html(wrap(t.reject,    TAG.cR) +t.comma);
        $(".label-catalogue")      .html(t.selectedCatalogue+t.comma);

        $("#switchLang")                                                                          .data("title", switchLangue[LANG].title)    .tooltip();
        $("#about").text( t.about ).attr("title", t.help.tip +" - "+ t.help.title.page)           .data("title", t.help.title.page)           .tooltip().show();
        
        $(".help.filters")         .attr("title", t.help.tip +" - "+ t.help.title.filters)        .data("title", t.help.title.filters)        .tooltip();
        $(".help.topic")           .attr("title", t.help.tip +" - "+ t.help.title.topic)          .data("title", t.help.title.topic)          .tooltip();
        $(".help.subtopic")        .attr("title", t.help.tip +" - "+ t.help.title.subtopic)       .data("title", t.help.title.subtopic)       .tooltip();
        $(".help.accept_reject")   .attr("title", t.help.tip +" - "+ t.help.title.accept_reject)  .data("title", t.help.title.accept_reject)  .tooltip();
        $(".help.accept_unmatch")  .attr("title", t.help.tip +" - "+ t.help.title.accept_unmatch) .data("title", t.help.title.accept_unmatch) .tooltip();
        
        $("#btnSearch")            .html(t.g_search + t.search);

        $("#editor-tab")           .html(t.f_editor_tab +wrap(t.editor,TAG.Hxs)        +wrap(t.edit,TAG.Vxs)).attr('title',t.editor);
        $("#stats-tab")            .html(t.f_config_tab +wrap(t.configuration,TAG.Hxs) +wrap(t.conf,TAG.Vxs)).attr('title',t.configuration);
        
        if( !catalogs ) {

            $catalogues.html(msg.err.noCatalogues[LANG]);
        }
        else {
            
            catalogs.sort().reverse();
            if( catalogs.length > CATALOG.MAX ) catalogs.length = CATALOG.MAX;
            
            let options = catalogs.map( dirName => `<option value="${dirBase}${dirName}/catalogue.json">${dirName}</option>` ).join('');
            let mySelector = `
            <select id="catalogueSelector" class="form-control input-sm">
                ${options}
            </select>`;

            $catalogues.html( mySelector );
            $('#catalogueSelector').on('change', function(){
                let selectedCatalogue  = $(this).find("option:selected").val();
                selectedFilesCatalogue = selectedCatalogue.split("json")[0]+ CATALOG.FILETYPE;
                loadCatalogueData( selectedCatalogue );
            });
            
            // Auto select the latest catalog when loading page
            $('#catalogueSelector').find('option:nth-child(1)').prop('selected',true).trigger('change');
        }
        
        if( brokers ) {
            let rx = new RegExp(/ /,'i'), thisSubdomain = window.location.hostname.split('.')[0];
            $.each( brokers, ( filter, thisBroker ) => { rx = new RegExp(filter,'i'); if( thisSubdomain.match(rx) ){ CONFIG.setup( { broker: thisBroker } ); } });
        }
        
        showTabPane( PANE.EDITOR );
        activatePane( PANE.EDITOR );
        $('#input-subtopics').attr('placeholder',t.wait.loadingData);
    }
    
    function testCookies() {
        if( !$.cookie('cookies') ) {
            $('.notif-cookies .msg').html( msg.cookie[LANG] );
            $('.notif-cookies').show();
        }
    }
    
    function testBrowserCompatibility() {
        
        if( ($.cookie("browser") === "OK") || ($.cookie("showWarningDialog") === "NO") ) return;
        
        var parser = new UAParser();
        /* // this should print an object structured like this:
            {
                ua: "",
                browser: { name: "", version: "" },
                engine:  { name: "", version: "" },
                os:      { name: "", version: "" },
                device:  { model: "", type: "", vendor: "" },
                cpu:     { architecture: "" }
            }
        */
        var result = parser.getResult();
        // by default it takes ua string from current browser's window.navigator.userAgent

        var browserOK = false,
            requiredVersion = {
                    desktop:{
                            Chrome   : 55,
                            Chromium : 55,
                            Edge     : 1,
                            Firefox  : 52,
                            Safari   : 10.1,
                            Opera    : 42
                    },
                mobile: {
                    "Android Browser"    : 53,
                    "Chrome for Android" : 55,
                    "Edge mobile"        : 1,
                    "Firefox for Android": 52,
                    "iOS Safari"         : 9.3,
                    "Opera Android"      : 42,
                    "Samsung Internet"   : "?"
                    },
                    list:{
                            desktop:" - Chrome v.55\n - Chromium v.55\n - Edge\n - Firefox v.52\n - Safari v.10.1\n - Opera v.42",
                            mobile :" - Android Browser v.53\n - Android Chrome v.55\n - Edge mobile\n - Android Firefox v.52\n - Android Opera v.42\n - iOS Safari v.9.3"
                    }
            }
        
        console.log(requiredVersion);
        
        if( result.device.type === undefined ) {
            
            var browserList = requiredVersion.list.desktop;
            if( !browserOK && requiredVersion.desktop.hasOwnProperty( result.browser.name ) )
                browserOK = result.browser.major >= requiredVersion.desktop[result.browser.name];
        }
        else {
            
            var browserList = requiredVersion.list.mobile;
            if( !browserOK && requiredVersion.mobile.hasOwnProperty( result.browser.name ) )
                browserOK = result.browser.major >= requiredVersion.mobile[result.browser.name];
        }
        
        if( browserOK ) {
            
            $.cookie( "browser", "OK", { expires: 365 } );
        }
        else {
            let pTitle     = ((LANG == 'fr') ? "Problème":"Issue"),
                pMessage   = wrap( msg.err.browserIssue[LANG] + browserList +"\n\n"+ msg.err.browserUsed[LANG] +"- "+ result.browser.name +" v."+ result.browser.major ),
                pType      = "type-danger",
                pBtnOK     = { cssClass:'btn-default btn-sm', label:'&nbsp; &nbsp; OK &nbsp; &nbsp;' },
                pBtnGetRid = { cssClass:'btn-default btn-sm', label:((LANG == 'fr') ? "Ne plus afficher ce message":"Don't show this message again"), action:( function(){ $.cookie( "showWarningDialog", "NO", { expires: 365 }) }) };
                
                BootstrapDialog.show({
                type:    pType,
                size:   "size-small",
                title:   pTitle,
                message: pMessage,
                closable: false,
                buttons: [{
                    label:    pBtnGetRid.label,
                    cssClass: pBtnGetRid.cssClass,
                    action: function(dialog){
                        $.cookie( "showWarningDialog", "NO", { expires: 365 } );
                        if( pBtnGetRid.action ) 
                            console.log( pBtnGetRid.action );
                        dialog.close();
                    }
                }, {
                    label:    pBtnOK.label,
                    cssClass: pBtnOK.cssClass,
                    action: function(dialog){
                        dialog.close();
                    }
                }]
            });
        }

    }

/*#*/if( DEBUG ){ console.groupEnd();};/*#*/
}


// ---------------------------------------------------------------------
//
// Load selected catalogue 

function loadCatalogueData( selectedCatalogue ) {
// let DEBUG = true;
/*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log(selectedCatalogue);};/*#*/
    
    let loadtime = Date.now();
    
    $('#msg').html(`<p class="title-text">${t.wait.loadingData}</p>`).show();
    $('#logs').show();

    $.ajax({
        url    : selectedCatalogue,
        cache  : false,             // Get latest file version
        xhr    : function() { return new window.XMLHttpRequest(); },
        statusCode: { 404: function() { BSDialog( t.fileNotFound, t.error, "type-danger" ); } },
        success: function(foldersData){
            
            $('#input-subtopics').prop("disabled", false);
            bigData_Folders = foldersData;
            
            let getSums     = function(folders) { let s = { folders:folders.length, files:0,bytes:0 }; folders.forEachFromTo( (folder) => { s.files += folder.inf[CATALOG.id_NB_FILES]; s.bytes += folder.inf[CATALOG.id_TOTAL_SIZE]; }); return s; };
            let total       = getSums( foldersData );
            let fmtTotal    = { folders : plural(t.folder, total.folders, '0,0', TAG.CV),
                                files   : plural(t.file,   total.files,   '0,0', TAG.CR),
                                bytes   : ("("+ numeral(total.bytes).format('0.00 b') +")").replace(' ','&nbsp;')
                              };
            let cataloguePaths = selectedCatalogue.split("/");
            let catalogueName  = cataloguePaths[cataloguePaths.length -2];
            let paneHeader     = `${t.catalogue} [ <strong>${catalogueName}</strong> ] ${t.contains}${t.comma} ${fmtTotal.folders},&nbsp;${fmtTotal.files}&nbsp;${fmtTotal.bytes}<br>${t.click2AddSubtopic}`;
            CATALOG.NAME       = catalogueName;

            setSubtopicDirs();
            cluster   .catalog = getScrollClusterData( PANE.CATALOGUE, bigData_Folders, paneHeader );
            statistics.reset({ catalog:{ name:catalogueName, folders:total.folders, files:total.files, bytes:total.bytes }, search:{}, results:{} });
            _init_data_tabs ( total.folders, total.files );
            setGUIstate     ( GUI.STATE_LOADING );
            
            setFilterSubtopic ( "reset" );
            
            CATALOG.LOADTIME = Date.now() - loadtime;
        },
        error: function( XMLHttpRequest, textStatus, errorThrown ) {
            $('#msg').html(`<h2 class="clusterize-no-data">${t.error}<br><small> >>> ${errorThrown} <<< </small></h2>`).show();
            console.log( t.error + " - loadCatalogueData("+ selectedCatalogue +")",L,'XMLHttpRequest',XMLHttpRequest,L,'textStatus',textStatus,L,'errorThrown',errorThrown );
        }
    });
    
/*#*/if( DEBUG ){ console.timeEnd( "   " ); logMe('-','-'); console.groupEnd();};/*#*/
}


// ---------------------------------------------------------------------
//
// fetchFileRange returns text from a XMLHttpRequest within byte range

async function fetchFileRange( url, byteRanges=[""] ) {
// let DEBUG = true;
/*#*/if( DEBUG ){ logMe(url +L+"   - ["+ byteRanges +"]", '-');};/*#*/

    try {
        let fileInfo, rangeText = "";
        for( let i=0, n=byteRanges.length; i < n; i++ ) {
            fileInfo  = await getFileSize( url, byteRanges[i] );
            rangeText+= await getHttpByteRange( url, fileInfo, byteRanges[i] );
        }
/*#* /if( DEBUG ){ 'rangeText',L,rangeText,L,logMe('-','-');};/*#*/
        return rangeText;
    }
    catch(err) {
        console.log( "ERR : ", err );
/*#*/if( DEBUG ){ logMe('-','-');};/*#*/
    }
}


// ---------------------------------------------------------------------
//
// Filter the header boundaries which are added to response 
// by XMLHttpRequest when a multipart byteranges is fetch
// Ref.: https://stackoverflow.com/questions/41348421/how-to-properly-parse-multipart-byteranges-responses-using-typescript-javascript

function filterHeadersFromMultipartByteRangeResponse (body, boundary) {
    
    let bodies = body.split(`--${boundary}`).reduce((parts, part) => {
        if (part && part !== '--') {
            let [ head, body ] = part.trim().split(/\r\n\r\n/g)
            parts.push({
                body: body,
                headers: head.split(/\r\n/g).reduce((headers, header) => {
                    let [ key, value ] = header.split(/:\s+/);
                    headers[key.toLowerCase()] = value;
                    return headers;
                }, {})
            })
        }
        return parts
    }, []);
    
    // delete first and last empty bodies
    bodies.shift();
    bodies.pop();
    
    // join 
    let text = "";
    $.each(bodies, (i) => { text += bodies[i].body +"\n" } );

    return text;
    
}


// ---------------------------------------------------------------------
//
// Get URL's file size and range size

function getFileSize(url, byteRange) {
    
    return new Promise( (resolve, reject) => {

            const requestHead  = new XMLHttpRequest();
            requestHead.onload = function() {
                if (this.status === 200) {                              // Success
                    
                    let filesize = parseInt(requestHead.getResponseHeader("Content-Length"));
                    let partsize = getRangeSize( byteRange, filesize );
                    resolve( { fileSize: filesize, partSize: partsize } );
                }
                else {                                                  // Something wrong (404 etc.)
                    
                    reject(new Error(this.status +" - "+ this.statusText));
                }
            }
            requestHead.open("HEAD", url, true); // Notice "HEAD" instead of "GET", to get only the header; true = asynchronous
            requestHead.send();
        });
    
}

// ---------------------------------------------------------------------
//
// Get an "estimate" size of the byte range response

function getRangeSize( byteRange, filesize ) {
    
    /** /
    When requesting a multipart byterange, headers are sent back within the response.
    Those headers have to be removed with filterHeadersFromMultipartByteRangeResponse function
    Ex.:
    --b3d00981a655aacf
    Content-type: text/plain
    Content-range: bytes 0-1234/123456789

    ... requested byte range here ...

    --b3d00981a655aacf
    Content-type: text/plain
    Content-range: bytes 23456-34567/123456789

    ... requested byte range here ...

    --b3d00981a655aacf--

    In this example, the first header contains a total of 79 chars:
    1- 18 chars for the first  line which is response's boundary
    2- 24 chars for the second line which is response's content type
    3- 37 chars for the third  line which is content's byte range : from 2255135 to 2256010 of a 68590933 bytes file size.
    
    The second header contains a total of 84 chars                
    The last line is a 20 chars boundary trailer closing the response
    /**/
    let multipartSize = ( byteRange ) ? byteRange.split("=")[1].split(',') : [ filesize ];
    
    if( multipartSize.length < 2 )
    {
        return Math.abs( eval(multipartSize[0]) );
    }
    else
    {
        let ccBoundary        = "--b3d00981a655aacf"      .length +1, // char count for boundary                                                 + one hidden trailing char
            ccBoundaryTrailer = "--b3d00981a655aacf--"    .length +1, // char count for closing boundary                                         + one hidden trailing char
            ccContentType     = "Content-type: text/plain".length +1, // char count for Content-type                                             + one hidden trailing char
            ccContentRange    = "Content-range: bytes /"  .length +1, // char count for Content-range (yes, including the slash before filesize) + one hidden trailing char
            ccEmptyLine       = 2,                                    // char count for the empty line                                           + one hidden trailing char
            ccHeader          = ccBoundary + ccContentType + ccContentRange + filesize.toString().length + ccEmptyLine,
            totalSizeRange    = 0,
            totalSizeHeaders  = 0;
        
        for (let i=0, n=multipartSize.length; i < n; i++)
        {
            totalSizeHeaders += ccHeader + multipartSize[i].length;
            totalSizeRange   += eval(multipartSize[i]);
        }
        
        return totalSizeHeaders + Math.abs(totalSizeRange) + ccBoundaryTrailer + ccEmptyLine;
    }
}

// ---------------------------------------------------------------------
//
// Get part file within byte range
// If no byteRange, returns the whole url file in rText

function getHttpByteRange( url, fileinfo, byteRange="", responseType="" ) {
    
    return new Promise(
        function (resolve, reject) {
            const request = new XMLHttpRequest();

            request.onerror     = function () { reject(new Error('XMLHttpRequest Error: '+this.statusText)); };
            request.onloadstart = function () { document.body.style.cursor = 'wait'; };
            request.onload      = function () {
                if ( this.status === 200 || this.status === 206 ) {
                    // Success
                    let rText = this.responseText;
                    let cType = this.getResponseHeader('Content-Type');
                    let fSize = parseInt(this.getResponseHeader("Content-Length"));
                    if( this.status === 206 && cType !== "text/plain" && cType !== null ) {
                        rText = filterHeadersFromMultipartByteRangeResponse(rText, cType.match(/boundary=(.+)$/i)[1]) ;
                    }
                    resolve( rText );                                           // Returns responseText
                }
                else { 
                    // Something went wrong (404 etc.)
                    reject(new Error(this.status +" - "+ this.statusText));
                }
                
                document.body.style.cursor = 'default';
            };
            
            // -- Beam me up Scotty!
            request.open('GET', url);
            request.responseType = responseType;
            if( byteRange ) {
                request.setRequestHeader("Content-Type", "multipart/byteranges");
                request.setRequestHeader("Range", byteRange);
            }
            request.send();
        });
}            

// ---------------------------------------------------------------------
//
// Returns a clusterized scroll object

function getScrollClusterData( pane = PANE.CATALOGUE, data, paneTitle ) {
    
    var n,qtyFound, noDataText, bigData, tabLabel, $pane, $probar;
    
    $pane     = $( `#${pane}` );
    bigData   = [];
    paneTitle = paneTitle ? `<span id="${pane}-label" class="pane-title">${paneTitle}</span>`:"";
    
    switch( pane ) {
        
        case PANE.CATALOGUE:
            
            n        = bigData_Folders.length;
            tabLabel = t.Folder + "s";
            for( var i=0; i<n; i++ ) {
                bigData.push( `<li><span class="content">${bigData_Folders[i].dir}</span></li>` );
            }
            break;
        
        case PANE.SUBTOPIC:
            
            n        = data.length || 0;
            tabLabel = ( n < 1 ? t.noFolders : t.Folder ) + ( n > 1 ? "s":"" );
            tabLabel = wrap(tabLabel,TAG.Hxs) + wrap(t.f_topics_tab,TAG.Vxs);
            for( var i=0; i<n; i++ ) {
                bigData.push( `<li><span class="content">${data[i].dir}</span></li>` );
            }
            break;
        
        case PANE.FILES:
            
            n        = data.length || 0;
            tabLabel = ( n < 1 ? t.noFiles : t.file ) + ( n > 1 ? "s":"" );
            tabLabel = wrap(tabLabel,TAG.Hxs) + wrap(t.f_files_tab,TAG.Vxs);
            for( var i=0; i<n; i++ ) {
                bigData.push( `<li><span class="content"><span class="size">${data[i].size}</span> - ${data[i].path}</span></li>` );
            }
            break;
    }
    
    if( pane !== PANE.CATALOGUE ) {
        qtyFound = n > 0 ? numeral(n).format('0,0') +" " : "";
        $(`#${pane}-tab`).html( qtyFound + tabLabel ); // Update pane's tab
    }
    
    $pane.html(`
                    ${paneTitle}
                    <div id="scroll-${pane}" class="clusterize-scroll emulate-progress">
                        <ol id="scroll-${pane}-content" class="clusterize-content customize-counter ${pane}" tabindex="0" start="1" style="counter-increment: 1;">
                        </ol>
                    </div>
                    <span id="${pane}-progress-bar" class="progress-scroll"></span>`);
    
    $probar = $(`#${pane}-progress-bar`);
    
    return new Clusterize({
        rows          : bigData,
        scrollId      : `scroll-${pane}`,
        contentId     : `scroll-${pane}-content`,
        rows_in_block : Math.min(n,12),
        callbacks     : { scrollingProgress: ( progress ) => { $probar.width(progress +"%"); } },
        no_data_text  : t.noData,
        keep_parity   : false
    });
}


// ---------------------------------------------------------------------
//
// 
// for products only = only second level dirs -> subtopics are: *.*.dir2.#                   
// otherwise, show source and products only   -> subtopics are: *.dir1.dir2.#

function setSubtopicDirs() {
    
    let path="", paths=[], groups=[], paths_P=[], paths_SP=[];
    
    bigData_Folders.forEach( (item,index) => {
        
        // Do list Products only
        path = item.dir.replace(/^\/\d{8}\/[a-z-0-9_]*\/([a-z-0-9_]*)\/.*/i,"*.*.$1.#").
                        replace(/^\/\d{8}\/([a-z-0-9_]*)\/\d{2}$/i,"*.$1").
                        replace(/^\/\d{8}\/[a-z-0-9_]*\/([a-z-0-9_]*)/i,"*.*.$1");
        if( !paths_P.includes(path) ){ paths_P.push(path); }

        // Do list Sources & Products only
        path = item.dir.replace(/^\/\d{8}\/([a-z-0-9_]*)\/([a-z-0-9_]*)\/.*/i,"*.$1.$2.#").
                        replace(/^\/\d{8}\/([a-z-0-9_]*)\/\d{2}$/i,"*.$1").
                        replace(/^\/\d{8}\/([a-z-0-9_]*)\/([a-z-0-9_]*)/i,"*.$1.$2");
        if( !paths_SP.includes(path) ){ paths_SP.push(path); }
    });
    
    paths_P .sort( (a,b) => { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    paths_SP.sort( (a,b) => { return a.toLowerCase().localeCompare(b.toLowerCase()); });
    
    paths_P .forEach( (path,index)=>{ paths.push({path:'P', filter:path}); });
    paths_SP.forEach( (path,index)=>{ paths.push({path:'SP', filter:path}); });
    groups=[{value: 'P', label:t.products},{value:'SP', label:t.sources_products}, {value: 'X', label:'AUTRES'}];
    
    setSubtopicFilters( paths, groups );
}


// ==========================================================================================================================================
//  Sarra Stuff
// ==========================================================================================================================================

async function wait(ms) { return new Promise( r => setTimeout(r, ms) ); }
            
// ---------------------------------------------------------------------
//
// getBigDataFiles
// - It receives an array texts where each line contains file size and file path
// - It returns an array of objects containing path and size

async function getBigDataFiles( folders, selectedCatalogue = selectedFilesCatalogue, cancel ) {
// let DEBUG = true;
    /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log("selectedCatalogue [",selectedCatalogue,"]\nFolders", folders );};/*#*/

    let dataFiles = [];
    if( folders.matched ) {
        
        // If the file's byterange is larger than a reasonable size to pick it up with one request, it is broken into smaller multipart chuncks to make it easier to chew ...
        let multipartRanges = optimizeMultipartRanges( folders.matched.map( file => { return [ file.inf[CATALOG.id_RANGE_START], file.inf[CATALOG.id_RANGE_STOP], file.id ]; } ) );
        
        let percent = 0,
            count   = 0,
            buffer  = '',
            total   = multipartRanges.length;
        
        if( progressBar.isWorthDisplay ) { progressBar.init( total, {ln1:t.data.gathering, ln2:t.data.files }, GUI.BLUE ); await wait( 1 ); } // Give some time to progress-bar beeing refreshed...

        // Can't use forEach on async/await functions... -> go for traditional way...
        for (let multipartRange of multipartRanges) {
            
            count++;
            if( progressBar.isWorthDisplay ) { progressBar.set(count, dataFiles.length ); await wait( 10 ); }
            if( cancel.token.isSearchCancelled() ) {
                cleanUpCancelledSearch();
                return;
            }
            else {
                
                // If there's more than 1 multipartrange files to fetch and when we're in the middle of the fetch process,
                // it is hightly probable that the last line of each fetched file will be incomplete.
                // To manage potential problems, the last element of lines array is poped out into a buffer:
                // it will take place at the begining of the next file range fetch.
                
                let files = buffer + await fetchFileRange( selectedCatalogue, [multipartRange] );
                let lines = files.split("\n");
                if( total > 1 && count < total ) {
                    buffer = lines.pop(); }
                else { // The process left an empty line in the last element: remove it.
                    lines.pop(); } 
                
                /*#*/if( DEBUG ){ console.log(' count',count,' total',total,' lines[',(typeof lines[lines.length -2].split(CATALOG.DATA_SEPARATOR)[1]),'] #####[',lines[lines.length -1],']#####'); };/*#*/
                lines.forEach( (line) => {
                    let fileInfo = line.split(CATALOG.DATA_SEPARATOR);
                    if( fileInfo.length == 3 ) {
                        dataFiles.push( { path: bigData_Folders[parseInt(fileInfo[0])].dir +'/'+ fileInfo[2], size: parseInt(fileInfo[1]) });
                    }
                });
            }
        }
        if( progressBar.isWorthDisplay ) { await wait( 250 ); progressBar.doHide(); }
    }
    
    /*#*/if( DEBUG ){ console.log("dataFiles",dataFiles); console.timeEnd( "   " ); logMe('-','-'); console.groupEnd();};/*#*/
    return dataFiles;
}


// ---------------------------------------------------------------------
//
// buildBigDataFiles

function buildBigDataFiles( filesInFolders, withAcceptRejectFilters = false ) {
// DEBUG = true;
/*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('withARFilter['+withAcceptRejectFilters+'] filesInFolders :',L,filesInFolders);};/*#*/

    let dataFiles = [];

    if( filesInFolders.matched ) {
        
        if( withAcceptRejectFilters ) {
            dataFiles = filesInFolders.matched;
        }
        else {

            let multipartRanges = optimizeMultipartRanges( filesInFolders.matched.map( (file) => { return [ file.inf[CATALOG.id_RANGE_START], file.inf[CATALOG.id_RANGE_STOP], file.id ]; } ) );
            multipartRanges.forEachAsync(
                ( multipartRange ) => {
                    fetchFileRange( selectedFilesCatalogue, [multipartRange] )
                    .then( (files) => {
                        let lines = files.split("\n");
                        lines.forEach( (line) => { let fileInfo = line.split(' /'); if( fileInfo.length == 2 ) dataFiles.push({ path: '/'+fileInfo[1], size: parseInt(fileInfo[0]) } ) });
                    });
                });
        }
    }
        
/*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/
    return dataFiles;
}


// ---------------------------------------------------------------------
// 
// getSubtopicMatch
// Fnds folder that match/unmatch the AMQP filter
// Receives a data array, regex string and accept/reject (true/false)
// Returns an object containing stats, matched and unmatched data

function getSubtopicMatch( foldersData, subtopicFilters, accept_rejectFilters ) {
// let DEBUG = true;
/*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('regex['+subtopicFilters+'] foldersData :',L,foldersData);};/*#*/

    let regex = $.map( subtopicFilters, ( subtopicFilter ) => { return new RegExp( subtopicFilter ) } );
    let stats = { matched: { nbFiles: 0, totSize: 0, ranges: [] }, unmatch: { nbFiles: 0, totSize: 0, ranges: [] } };
    let matched = [];
    let unmatch = [];
    let withARFilters = accept_rejectFilters.length > 2;

    if( withARFilters || (!withARFilters && accept_rejectFilters[1][1] ) ) {
        for( let i=0, n=foldersData.length; i < n; i++ ) {
            for( let ii=0, nn=regex.length; ii<nn; ii++) {
                if( regex[ii].test( foldersData[i].dir ) && !matched.includes(foldersData[i]) ) {
                    matched.push(foldersData[i]);
                    if(foldersData[i].inf[CATALOG.id_NB_FILES] > 0) {
                        stats.matched.nbFiles += foldersData[i].inf[CATALOG.id_NB_FILES];
                        stats.matched.totSize += foldersData[i].inf[CATALOG.id_TOTAL_SIZE];
                        stats.matched.ranges.push( foldersData[i].inf[CATALOG.id_RANGE_START]+'-'+foldersData[i].inf[CATALOG.id_RANGE_STOP] );
                    }
                }
            }
        }
    }
    else {
        for( let i=0, n=foldersData.length; i < n; i++ ) {
            for( let ii=0, nn=regex.length; ii<nn; ii++) {
                if( regex[ii].test( foldersData[i].dir ) && !unmatch.includes(foldersData[i]) ) {
                    unmatch.push(foldersData[i]);
                    if(foldersData[i].inf[CATALOG.id_NB_FILES] > 0) {
                        stats.unmatch.nbFiles += foldersData[i].inf[CATALOG.id_NB_FILES];
                        stats.unmatch.totSize += foldersData[i].inf[CATALOG.id_TOTAL_SIZE];
                        stats.unmatch.ranges.push( foldersData[i].inf[CATALOG.id_RANGE_START]+'-'+foldersData[i].inf[CATALOG.id_RANGE_STOP] );
                    }
                }
            }
        }
    }
    
    
/*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/
    return { matched, unmatch, stats }
}


// ---------------------------------------------------------------------
// 
// getAcceptRejectMatch
// Finds files that match/unmatch the accept_reject regex filter
// Receives a data array, regex string and accept/reject (true/false)
// Returns an object containing stats, matched and unmatched data

async function getAcceptRejectMatch( filesData, reg, cancel ) {
// let DEBUG = true;
/*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('regex['+reg+']',L,'filesData :',L,filesData);};/*#*/
    
    reg[0][0] = reg[0][0].replace('$','.*$');   // First filter is subtopic. When Accept-Reject filters kiks in, make sure subtopic will allow everything beyond its path.
    let rxModifier = $("#checkbox-regex_case").is(":checked") ? "i":""
    
    let regex    = reg.map( (r) => { return new RegExp(r[0],rxModifier); } );
    let accept   = reg.map( (r) => { return r[1]; } );
    let matched  = reg.map( () => { return [] } );
    let unmatch  = reg.map( () => { return [] } );
    let nbLines  = filesData.length;
    let firstReg = 0;
    let lastReg  = regex.length -1;
    let chunk    = Math.floor( nbLines / 100 );
    let stats    = { matched: { nbFiles: 0, totSize: 0 }, unmatch: { nbFiles: 0, totSize: 0 } };
    
    let subtopic    = regex[0];        // First regex filter is SubTopic
    let keepUnmatch = accept[lastReg]; // Last accept value for unmatched elements: true for accept or false for reject

    statistics.search.accept_reject = reg.map( (r) => { return { filter : r[0], accept : r[1], matched: {files:0, totalSize:0 }, unmatch: {files:0, totalSize:0 } }; });
    statistics.results.found = 0;
    
    loopLines: for( let line = 0; line < nbLines; line++ ) {
        
        if( progressBar.isWorthDisplay && (line % chunk) == 0 ) { progressBar.set(line, stats.matched.nbFiles ); await wait(10); }
        if( cancel.token.isSearchCancelled() ) {
            cleanUpCancelledSearch();
            return;
        }
        
        loopRegex: for( let r = 0, n=regex.length; r < n; r++ ) {
            
            switch( r ) {

                case firstReg:
                    
                    continue loopRegex;

                    if( !subtopic.test( filesData[ line ].path ) )
                        continue loopLines;
                    break;
                    
                case lastReg:

                    if( lastReg == firstReg+1 ) {
                        matched[ firstReg ].push( filesData[line] );
                        stats.matched.nbFiles ++;
                        stats.matched.totSize += filesData[line].size;
                        statistics.search.accept_reject[r].matched.files ++;
                        statistics.search.accept_reject[r].matched.totalSize += filesData[line].size;
                    }
                    else if( keepUnmatch ) {
                        matched[ r ].push( filesData[line] );
                        stats.matched.nbFiles ++;
                        stats.matched.totSize += filesData[line].size;
                        statistics.search.accept_reject[r].matched.files ++;
                        statistics.search.accept_reject[r].matched.totalSize += filesData[line].size;
                    }
                    else {
                        unmatch[ r ].push( filesData[line] );
                        stats.unmatch.nbFiles ++;
                        stats.unmatch.totSize += filesData[line].size;
                        statistics.search.accept_reject[r].unmatch.files ++;
                        statistics.search.accept_reject[r].unmatch.totalSize += filesData[line].size;
                    }
                    break;
                    
                default:

                    if( regex[r].test( filesData[ line ].path ) ) {
                        if( accept[ r ] ) {
                            matched[ r ].push( filesData[line] );
                            stats.matched.nbFiles ++;
                            stats.matched.totSize += filesData[line].size;
                            statistics.search.accept_reject[r].matched.files ++;
                            statistics.search.accept_reject[r].matched.totalSize += filesData[line].size;
                        }
                        else {
                            unmatch[ r ].push( filesData[line] );
                            stats.unmatch.nbFiles ++;
                            stats.unmatch.totSize += filesData[line].size;
                            statistics.search.accept_reject[r].unmatch.files ++;
                            statistics.search.accept_reject[r].unmatch.totalSize += filesData[line].size;
                        }
                        continue loopLines;
                    }
                    else {
                        continue;
                    }
                    
            }
            
        }
    }
    
    if( progressBar.isWorthDisplay ) { await wait(250); progressBar.doHide(); await wait(10); }
/*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/

    return { matched, unmatch, stats };
}

// ---------------------------------------------------------------------
//
// isValidAMQP
// Test if received filters are valid AMQP filters
// Filters, if more than on, are separated by semi-columns (;)

function isValidAMQP(filters, updatePanes=true) {
    // --------------
    //
    // AMQP filter rules 
    //  - in AMQP, dots (.) represent directory separators (/) in a path
    //  - wildcard star (*) match any directory name
    //  - wildcard hash (#) match any string from its position and after
    //
    // Rules Specifications
    //  1- The filter must not start with a dot (.) except for star (*) & hash (#)
    //  2- Wildcard star must only be used within two dots (.*.) and no characters in between
    //  3- Wildcard hash, IF ANY, must be the last filter's character, preceded immediately by a dot (.#)
    //
    // --------------
    let vr1 = true, vr2 = true, vr3 = true;
    filters.split(FILTER.CHAR_DELIMITER).forEach( filter => { 
        vr1 = vr1 && !/^\./.test(filter);                   // test rule #1
        vr2 = vr2 && (filter ==                             // test rule #2 -> valid if filter does not change after replacements
                        filter.replace(/\*[^\.]/g,"")         // - remove * followed by any char except dot 
                              .replace(/[^\.]\*/g,"")         // - remove * preceded by any char except dot 
                              .replace(/\*$/,""));            // - remove traling *
        vr3 = vr3 && !(/#/.test(filter)                     // test rule #3
                    && !( /.+\.#$/.test(filter) 
                          || /#.+/.test(filter)
                          || /^#$/.test(filter)
                        ));
    });
    
    let isValidFilter = vr1 && vr2 && vr3; // AMQP is a valid filter when all valid rules are passed
    
    if( updatePanes ) {
        if ( !(isValidFilter) ) {
            let eTitle   = '<p><strong>'+ t.error + t.comma + t.err_amqp.rules +'</strong></p>';
            let eMessage = '<p>'+ ( !vr1 ? t.err_amqp.nodot : '' ) +
                                ( !vr2 ? (!vr1 ? '<br>':'') + t.err_amqp.stars : '' ) +
                                ( !vr3 ? (!vr1 || !vr2 ? '<br>':'') + t.err_amqp.hasht : '' ) +'</p>';
            $("#err-subtopic .err").html( eTitle + wrap(eMessage, TAG.cJ) );
            $("#err-subtopic").show();
        }
        
        if ( isValidFilter ) {
            $("#err-subtopic").hide();
        }
    }
    
    return isValidFilter && filters !== '';
}


// ---------------------------------------------------------------------
//
// Convert AMQP subtopicFilter to a RegExp filter
// (This way, JavaScript will be able to search properly!)

function AMQP_2_RegExp( AMQPfilter ) {

    return AMQPfilter
                    .trim()                                 // remove leading and trailing white spaces
                    .replace(/(.*)/, "^/$1")                // add ^/ before and $ after the string
                    .replace(/[.]/g, "/")                   // all . becomes /
                    .replace(/\*/g,  /((?:\\.|[^\/\\])*)/ ) // magic finder - find any chars between 2 consecutive slashes 
                    .replace(/\/{2,}/g, "/")                // reduce any consecutive slashes //, /// become /
                    .replace(/(#.*)/,".*")
                    .replace(/(.*)/, "$1$");
}


// ---------------------------------------------------------------------
//
// path_2_AMQP
// Convert normal path to AMQP path
// By default, use a star in place of the root folder

function path_2_AMQP( path ) { return path.replace(/^\/\d{8}/,"*").replace(/\//g,"."); }


// ---------------------------------------------------------------------
//
// cleanUpCancelledSearch
// 
// Reset UI display and stuff

function cleanUpCancelledSearch() { window.location.reload(); }


// ---------------------------------------------------------------------
//
// performSearch    NOTE: async function
// 
// Perform search on selected catalogue with provided filters
// The AMQPfilter is assumed valid prior calling performSearch
//
// --------------
//
// Prior searching, AMQP filter must be converted to Regex' equivalent
//
// Convert in this order -
//   a) ADD     circumflex (^) as filter's first char
//   b) REPLACE dots       (.) by slashes         /
//   c) REPLACE stars      (*) by magic regex     /((?:\\.|[^\/\\])*)/
//   d) REPLACE hashtag    (#) by dot_star        .*
//   e) ADD     trailing   ($) as filter's last char

async function performSearch ( allFilters ) {
// let DEBUG = true;
/*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('Filters',allFilters); };/*#*/
//             
    setGUIstate( GUI.STATE_SEARCHING );
    
    let AMQPfilter          = allFilters[0][0],     // AMQP filter    is the first item of allFilters list;
        AMQPfilters         = AMQPfilter.split(FILTER.CHAR_DELIMITER),
        accept_rejectFilters = allFilters,           // The leftovers are accept_reject plain regex filters; -> Set in a separate variable for readability
        subtopicFilter      = AMQP_2_RegExp( AMQPfilter ),
        subtopicFilters     = $.map( AMQPfilters, (filter) => { return AMQP_2_RegExp( filter ); }),
        config              = '',                   // Sarra config to be displayed on screen according to user's choices
        STm                 = {},                   // STm (SubTopic match)     stores selectedCatalogue's data filtered with subtopicFilter
        ARm                 = {},                   // ARm (AcceptReject match) stores STm's (SubTopic match)'s data filtered with accept_rejectFilters
        nbFolders, nbFoldersHtml,                   // Number of folders found with subtopicFilter
        nbFiles,   nbFilesHtml,                     // Number of files   found with subtopicFilter and accept_rejectFilter (if any)
        matches    = [],                            // Store a list matching filters criteria
        unmatchs   = [],                            // Store a list unmatching filters criteria
        filesInFolders = { matched: [], unmatch: [], stats: { matched: { nbFiles:0,totSize:0 }, unmatch: { nbFiles:0,totSize:0 } } },
        
        nbFilters     = accept_rejectFilters.length,
        withARFilters = nbFilters > 2,
        acceptUnmatch = accept_rejectFilters[ nbFilters-1 ][1];


    // Apply Subtopic filter if different 
    // from a previous search...
    // --------------------------------------------------
    STm = getSubtopicMatch( bigData_Folders, subtopicFilters, accept_rejectFilters );             // From JSON's catalogue bigData_Folders (global var), get SubTopic Matchs
    statistics.reset({
                        search: {
                            subtopic:{
                                filters: AMQPfilters,
                                matched: {folders:STm.matched.length, files:STm.stats.matched.nbFiles, totalSize:STm.stats.matched.totSize},
                                unmatch: {folders:STm.unmatch.length, files:STm.stats.unmatch.nbFiles, totalSize:STm.stats.unmatch.totSize}
                            }
                        }
                     });
    
    matches.push( STm );                                                    // Add it to the matches array
    matches.forEach( (match) => {                                           // Merge all match in filesInFolders
        filesInFolders.stats.matched.nbFiles += match.stats.matched.nbFiles;
        filesInFolders.stats.unmatch.nbFiles += match.stats.unmatch.nbFiles;
        filesInFolders.stats.matched.totSize += match.stats.matched.totSize;
        filesInFolders.stats.unmatch.totSize += match.stats.unmatch.totSize;
        $.merge(filesInFolders.matched, match.matched);
        $.merge(filesInFolders.unmatch, match.unmatch);
    });
    
/*#*/if( DEBUG ){ console.log('STm',STm); };/*#*/
    
    // Extract some info for the logger...
    nbFolders     = STm.matched.length + STm.unmatch.length;
    nbFiles       = filesInFolders.stats.matched.nbFiles;
    nbFoldersHtml = plural(t.folder, nbFolders, '0,0', TAG.CV);
    nbFilesHtml   = plural(t.file,   nbFiles,   '0,0', TAG.CR);
    
    let paneFolderHeader = "";
        paneFolderHeader = wrap( numeral( nbFolders ).format('0,0') +" " +(nbFolders > 1 ? t.foldersFound : t.folderFound), TAG.CV ) +' ';
        paneFolderHeader+= ( AMQPfilters.length > 1 ) ? t.withAMQPfilters : t.withAMQPfilter;
    
    progressBar.updateDisplay( nbFiles );

    // And update display...
    if( withARFilters || acceptUnmatch ) {
        if( AMQPfilters.length > 1 )
            cluster.subtopic = getScrollClusterData( PANE.SUBTOPIC, STm.matched, `${paneFolderHeader}<span class="amqp-filters">${AMQPfilters.join('<br>')}</span>` );
        else
            cluster.subtopic = getScrollClusterData( PANE.SUBTOPIC, STm.matched, `${paneFolderHeader}<span class="amqp-filters">${AMQPfilter}</span>` );
    }
    else {
        if( AMQPfilters.length > 1 )
            cluster.subtopic = getScrollClusterData( PANE.SUBTOPIC, STm.unmatch, `${paneFolderHeader}<span class="amqp-filters">${AMQPfilters.join('<br>')}</span>` );
        else
            cluster.subtopic = getScrollClusterData( PANE.SUBTOPIC, STm.unmatch, `${paneFolderHeader}<span class="amqp-filters">${AMQPfilter}</span>` );
    }
    
    if( folders.length < 1 ) subtopicCluster.clear();
    
    // All files found with SubTopic filter are
    // stored in the global var bigData_Files
    // --------------------------------------------------
    if( filesInFolders.matched ) {
        
        let nbFiles   = filesInFolders.stats.matched.nbFiles,
            totalSize = filesInFolders.stats.matched.totSize;
            
        nbFilesHtml   = nbFiles > 0 ? plural(t.File, nbFiles, '0,0', TAG.cR) : nbFiles == 0 ? t.noFiles : "&nbsp;";
        searchToken.reset();
        bigData_Files = await getBigDataFiles( filesInFolders, selectedFilesCatalogue, searchToken )
                                .then( (data) => { return data } )
                                .catch( (err) => {
                                    console.log(me()," err: ",err);
                                    if( !searchToken.token.cancelledSearch ) { console.log( "### Err : ",L, err ); }
                                    else { console.log( "### ",t.searchCancelled, L, err ); return; }
                                });

        let totSize   = t.totalSize +t.comma+ totalSize +" "+ t.bytes + (totalSize > 1024 ? ' ('+ numeral(totalSize).format('0.00 b') +')' : '' ) +L +L;
        $("#files-tab").html( nbFilesHtml );
        $("#files pre").html( totSize + t.FileSize +L );
    }
    
    // Apply accept_rejectFilters if any...
    // --------------------------------------------------
    if( withARFilters ) {                                                                               // If no accept_rejectFilters, update files tab as well with found files...

        let matchfiles = [],
            total      = bigData_Files.length,
            initArrStr = { ln1:t.data.searching, ln2:( t.data.foundOn   + numeral(total).format('0,0') +t.data.files +" - "+ numeral(nbFolders).format('0,0') +t.data.folders ) };
            
        initArrStr = { ln1:t.data.searching, ln2:( t.data.foundFF[0]+ numeral(total).format('0,0') +t.data.foundFF[1]  + numeral(nbFolders).format('0,0') +t.data.foundFF[2] ) };
            
        if( progressBar.isWorthDisplay ) { progressBar.init( total, initArrStr );  await wait(1); }
        
        accept_rejectFilters[0][0] = subtopicFilter;
        searchToken.reset();
        ARm = await getAcceptRejectMatch( bigData_Files, accept_rejectFilters, searchToken )   // Get Accept/Reject filtered filess
                        .then( (data) => { return data } )
                        .catch( (err) => {
                            if( !searchToken.token.cancelledSearch ) { console.log( "### Err : ",L, err ); }
                            else { console.log( "### ",t.searchCancelled, L, err ); return; }
                        });
        
        // Reset matched filesInFolders to merge
        nbFiles         = 0;
        filesInFolders  = { matched: [], stats: { matched: { nbFiles:0,totSize:0 } } };
        ARm.matched.forEach( (match) => { 
            $.merge(filesInFolders.matched, match);
            nbFiles += match.length;
        });
        filesInFolders.stats = ARm.stats;
        nbFilesHtml = plural(t.file,   nbFiles,   '0,0', TAG.CR);
        
        updateFilesTab( filesInFolders, withARFilters );
    }
    else {

        updateFilesTab( filesInFolders );
    }
    /*#*/if( DEBUG ){ console.log('filesInFolders',filesInFolders); };/*#*/
    
    activatePane( PANE.CATALOGUE );
    setGUIstate(GUI.STATE_FOUND);
    setGUIstate(GUI.STATE_READY);

    /*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/
}


// ---------------------------------------------------------------------
//
// updateResults
// Update content of Results Tab

function updateResultsTab( withHints=false, withMan=false, withCaseSensitive=false ) {
// let DEBUG = true;
/*#*/if( DEBUG ){ console.group(me()); logMe('-','-'); console.log('>>> statistics[', statistics, ']'); };/*#*/
    
    let numFolders = statistics.catalog.folders,
        numFiles   = statistics.catalog.files,
        strFolders = plural( t.folder, -numFolders ),
        strFiles   = plural( t.file,   -numFiles   );
        
    numFolders = numeral(numFolders).format('0,0');
    numFiles   = numeral(numFiles).format('0,0');

    // --------------------------------------
    // User's config
    // --------------------------------------
    let tbody_config = `
        <tbody id="user-conf">
            <tr><th colspan="4" class="title">${t.data.table.config} &nbsp; - &nbsp;${t.include} &nbsp;
               [ <label class="toggle"><input id="include-hints" type="checkbox" name="toggle" ${withHints?'checked=""':''}> <span class="label-text">${t.inc_hints}</span></label> ]  &nbsp;
               [ <label class="toggle"><input id="include-man"   type="checkbox" name="toggle" ${withMan?'checked=""':''}> <span class="label-text">${t.inc_man}</span></label> ]
            </th></tr>
            <tr><td colspan="4"><div class="flex"><button id="btnCopy" class="btn btn-secondary" type="button" data-original-title title="${t.copyConfig}" data-toggle="tooltip" data-placement="bottom"><i class="fa fa-clipboard" aria-hidden="true"></i><br><span>${t.copy}</span></button><pre id="config">${CONFIG.write( withHints, withMan )}</pre></td></div></tr>
        </tbody>`;
    
    // --------------------------------------
    // Catalogue info
    // --------------------------------------
    let tr_catalogue = `
            <tr class="tr"><th class="th1" colspan="4">${t.searchResults} ${t.forThisConfig}</th></tr>
            <tr class="c-bleu"><td class="title" colspan="4">Catalogue${t.comma} [ <strong>${statistics.catalog.name}</strong> ]</td></tr>
            <tr class="c-bleu"><td></td><td>${numFolders}<br>${numFiles}</td><td colspan="2"> ${strFolders} <br> ${strFiles}</td></tr>
            <tr><td></td><td colspan="2"></td><td><strong>${t.data.table.filter}</strong></td></tr>`;
    
    // --------------------------------------
    // Search filters
    // --------------------------------------
    // Subtopics
    let tr_findings   = "",
        allFilters    = getFilters(),
        nbFilters     = allFilters.length,
        withARFilters = nbFilters > 2,
        acceptUnmatch = allFilters[ nbFilters-1 ][1];
    
    numFolders = ( withARFilters || acceptUnmatch ) ? statistics.search.subtopic.matched.folders : statistics.search.subtopic.unmatch.folders;
    numFiles   = statistics.search.subtopic.matched.files;
    strFolders = numFolders == 0 ? t.noFolders : plural( t.folder, -numFolders ),
    strFiles   = numFiles   == 0 ? t.noFiles   : plural( t.file,   -numFiles   );
    numFolders = numFolders == 0 ? "" : numeral(numFolders).format('0,0');
    numFiles   = numFiles   == 0 ? "" : numeral(numFiles).format('0,0');
    tr_findings   += `
            <tr class="sub"><td>${t.data.table.subtopic}</td><td>${numFolders}<br>${numFiles}</td><td>${ strFolders } <br>${ strFiles } &nbsp;</td><td>&nbsp; ${statistics.search.subtopic.filters.filter(Boolean).join( "<br>&nbsp; ")}</td></tr>`;
    
    // Accepts - Rejects
    if( statistics.search.accept_reject ) {
        let color, choice, files, size, elem, filter, plural,
            numAcceptReject = statistics.search.accept_reject.length,
            lastAcceptReject = numAcceptReject - 1;
        for( let i = 1; i < numAcceptReject; i++ ) {
            if( statistics.search.accept_reject[i].accept ) {
                color  = ' class="c-vert"';
                choice = t.data.table.accepted;
                files  = statistics.search.accept_reject[i].matched.files;
                size   = statistics.search.accept_reject[i].matched.totalSize;
            }
            else {
                color  = ' class="c-rouge"',
                choice = t.data.table.rejected,
                files  = statistics.search.accept_reject[i].unmatch.files,
                size   = statistics.search.accept_reject[i].unmatch.totalSize;
            }
            plural = files > 1 ? "s":"";
            files  = numeral(files).format('0,0');
            filter = i < lastAcceptReject ? statistics.search.accept_reject[i].filter : `( ${t.data.table.unmatchs} )`;
            elem   = t.file + plural; // i < lastAcceptReject ? t.file+plural : t.data.table['unmatch'+plural];
            tr_findings  += `
            <tr${color}><td>${choice}</td><td>${files}</td><td>${elem} (${ numeral(size).format("0.00 b") }) &nbsp;</td><td>&nbsp; ${filter}</td></tr>`;
        }
    } else if( !withARFilters && !acceptUnmatch ) {
        let color, choice, files, size, elem, plural;
        color  = ' class="c-rouge"',
        choice = t.data.table.rejected,
        files  = statistics.search.subtopic.unmatch.files,
        size   = statistics.search.subtopic.unmatch.totalSize;
        plural = files > 1 ? "s":"";
        files  = numeral(files).format('0,0');
        elem   = t.file + plural; // i < lastAcceptReject ? t.file+plural : t.data.table['unmatch'+plural];
        tr_findings  += `
        <tr${color}><td>${choice}</td><td>${files}</td><td>${elem} (${ numeral(size).format("0.00 b") }) &nbsp;</td><td>&nbsp; ${t.data.table.unmatchs}</td></tr>`;
    }

    let tbody_search = `
        <tbody id="search">
            ${tr_catalogue}
            ${tr_findings}
        </tbody>`;
    
    // --------------------------------------
    // Results
    // --------------------------------------
    if( !statistics.search.accept_reject ) {
        statistics.results.files = statistics.search.subtopic.matched.files     == 0 ? "" :     numeral(statistics.search.subtopic.matched.files).format('0,0');
        statistics.results.size  = statistics.search.subtopic.matched.totalSize == 0 ? "" : "("+numeral(statistics.search.subtopic.matched.totalSize).format('0.00 b')+")";
        statistics.results.str   = statistics.results.files < 2  ? t.searchHits[ statistics.results.files ] : t.searchHits[2];
    }
    if( !withARFilters && !acceptUnmatch ) {
        statistics.results.str   = t.searchHits[0];
    }
    
    let tbody_results = `
        <tbody id="results">
            <tr><th colspan="4" class="title">${t.data.table.summary}</th></tr>
            <tr><td></td><td>${statistics.results.files}</td><td colspan="2">${statistics.results.str} ${statistics.results.size}</td></tr>
        </tbody>`;
        
    // --------------------------------------
    // Table wrapper
    // --------------------------------------
    let table = `
    <table id="table">
        ${tbody_config}
        ${tbody_search}
        ${tbody_results}
    </table>`;
    
    $("#stats").html( table );
    
    let $config = $("#config"),
        colors = { 
            click:  { color:"#a00","background-color":"#fee","border-color":"#a00" },
            hover:  { color:"#e55", "background-color":"#fee" },
            origin: { color: $config.css('color'), "border-color": $config.css( 'border-color' ), "background-color": $config.css( 'background-color' ) }
        },
        resetColors = ()=>{ $config.animate( colors.origin, 250 ) };
        
    $("#btnCopy")
        .tooltip()
        .hover( ()=>{ $config.animate( colors.hover, 0 ) }, () => { $config.css( colors.origin ) })
        .click( ()=>{ $config.animate( colors.click, 10, resetColors ) });
        
/*#*/if( DEBUG ){ logMe('-','-'); console.groupEnd();};/*#*/
}


// ---------------------------------------------------------------------
//
// optimizeMultipartRanges
//  - Receives an array of arrays containing start and stop range pairs
//  - Return an array of minimized multipart ranges strings
//  - Ex.: multipartRanges = [ [0,200],[201,400]...[4001,6000] ];
//  - Instead of ["bytes=0-200, 201-400, ..., 4001-6000"]
//  - We'll have ["bytes=0-400","bytes=500-600",...,"bytes=4001-6000"]
//    68590932
//    50000000

function optimizeMultipartRanges( multipartRanges ) {
// let DEBUG = true;
    /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('multipartRanges',multipartRanges);};/*#*/
    
    if( multipartRanges.length == 0 )
        return [];
    
    let i                 = 0;
    let newByteRange      = [multipartRanges.shift()];
    let maxByteRangeSize  = 5000000;
    let maxByteRangeParts = 10;
    
    multipartRanges.forEach( (item) => { if( newByteRange[i][1] == item[0]-1 ) { newByteRange[i][1] = item[1]; } else { i++; newByteRange.push(item); } });
    
    // ====
    if( newByteRange.length > 0 ) {
        let r = [], byteRangeStart, byteRangeStop, numberOfRanges, numNewByteRange = newByteRange.length;
        
        for( let rangeNo = 0; rangeNo < numNewByteRange; rangeNo++ ) {
            
            byteRangeStart = newByteRange[rangeNo][0]
            byteRangeStop  = newByteRange[rangeNo][1]
            numberOfRanges = Math.trunc( (byteRangeStop - byteRangeStart)/maxByteRangeSize );
            r.push(byteRangeStart);
            if( numberOfRanges > 0 ) {
                for( let i=1; i <= numberOfRanges; i++ ) {
                    r.push( byteRangeStart + i*maxByteRangeSize-1 );
                    r.push( byteRangeStart + i*maxByteRangeSize );
                }
            }
            r.push(byteRangeStop);
        }
        if( r.length > 1 ) {
            let rr = [];
            for( let i=0, n=r.length; i < n; i += 2 ) {
                rr.push( [r[i], r[i+1]] );
            }
            maxByteRangeParts = 1;
            newByteRange = rr;
        }
    }
    // ====
    
    // regroup by slices of maximum 20 pairs multipart ranges
    let slicedRange = [];
    let allRanges = newByteRange.map( (range) => { return range.join('-') });
    while( allRanges.length > 0 ) slicedRange.push( "bytes=" + allRanges.splice(0,maxByteRangeParts).join(',') );
    
    /*#*/if( DEBUG ){ console.log('newByteRange',newByteRange,L,L,"allRanges",allRanges,L,"slicedRange",slicedRange);};/*#*/
    /*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/
    return slicedRange;
}

// ==========================================================================================================================================
//  GUI Stuff
// ==========================================================================================================================================

// ---------------------------------------------------------------------
// 
// Array.prototype.forEachAsync
// Promise wrapper
// Ref.: http://thecodebarbarian.com/basic-functional-programming-with-async-await

Array.prototype.forEachAsync = function (fn) { return this.reduce((promise, n) => promise.then(() => fn(n)), Promise.resolve()); };


// ---------------------------------------------------------------------
// 
// Document events handlers

$(document)
    .on('keyup', '#input-subtopics-selectized', function(e){
        if( e.originalEvent.code === "NumpadEnter" )
            $('#btnSearch').trigger('click');
    })

    .on('keyup', '.input-subtopic', function(e){
        let AMQPfilter = $.trim( $(this).val() );
        if( AMQPfilter !== "" && e.type === "mouseout" ) {
            setFilterSubtopic( "enable" );
        }
        else {
            let isValidFilter = isValidAMQP(AMQPfilter);
            if( e && (e.which === $.ui.keyCode.ESCAPE || AMQPfilter === "") ) { setFilterSubtopic( "reset" ); }
            else {
                let allFilters = getFilters();
                setFilterSubtopic( "enable" );
                if( isValidFilter && e.which === $.ui.keyCode.ENTER ) {
                    performSearch( allFilters );
                }
            }
        }
        return;
    })
    .focus()
    
    .on('keyup mouseout', '.input-accept_reject', function(e){
        if( e.which === $.ui.keyCode.ENTER ) { 
            $('#btnSearch').trigger('click');
        }
        return;
    })
    .focus()

    .on('click', '#scroll-folders li', function(e) {
        let filterText      = path_2_AMQP( $(this).find('.content').text() );
        $selectize[0].selectize.addOption({ path:'SP',filter:filterText });
        $selectize[0].selectize.addItem( filterText );                          // ( e.ctrlKey ) ? $selectize[0].selectize.addItem( filterText ) : $selectize[0].selectize.setValue( filterText );
        setFilterSubtopic( "enable" );
    })
    
    .on('click', '#scroll-files .content', function() {
        // let url   = $(this).text().replace( /^\d+ - \//, getOrigin() );
        let url   = $(this).text().replace( /^\d+ - \//, '/' );
        let file  = url.replace( /http.?:\/\//, '' ).replace( /\//g, '_' ).replace( /:/g, '-' );
        // let getIt = $('<a>').attr('href',url).attr('download',url).append('<span>file</span>').find('span'); // force download in HTML5
        // getIt.trigger('click');

        $.ajax({
            url       : url,
            success   : download.bind(true, "blob", file),
            statusCode: { 404: function() { BSDialog( t.fileNotFound, t.error, "type-danger" ); } }
        });
    })
    
    .on('click', 'a.dropdown-filter', function(e) {
        
        let $subtopic_input = $('.input-subtopic');
        $(this).parents('.dropdown-menu').find('.form-control').val( "" );
        $(this).parents('.catalogue-short-list .dropdown.open').removeClass( "open" );
        $subtopic_input.val( (e.ctrlKey ? $subtopic_input.val()+FILTER.CHAR_DELIMITER:'') + $(this).text() ).focus();
        setFilterSubtopic( "enable" );
        
        return false;
    })
    
    .on('click', '.btn-topic', function(e) {
        $(".label-topic").data('label',$(this).data('label'));
    })

    .on('click', '.help', function(e) {
        let url = `/docs/help.html #${LANG}-${$(this).data('help')}`;
        BSDialogUrl( url, $(this).data('title') );
    })
    
    .on('click', '.btn-add', function(e) {
        e.preventDefault();
        let accept_reject = $('.input-accept_reject'),
            controlForm  = $('.accepts-rejects .filters:last'),
            currentEntry = $(this).parents('.entry:last'),
            currentState = currentEntry.find('.btn-accept-regex').hasClass('active') ? 'accept':'reject',
            newEntry     = $(currentEntry.clone()).appendTo(controlForm),
            nextEntryID  = function (){
                                let ids = [];
                                for( let i=0, n=accept_reject.length; i < n; i++ ) ids.push( accept_reject[i].id );
                                return ("input-accept_reject__" + parseInt(ids.sort().pop().split("__").pop()) + 1);
                            };
        newEntry.find('label:first').attr('for',nextEntryID);
        newEntry.find('.help.accept_reject').attr("title", t.help.tip).data("title", t.help.title.accept_reject).tooltip();
        newEntry.find('.input-accept_reject').val('').data('ar',currentState).attr('id',nextEntryID);
        controlForm.find('.entry:not(:first) .btn-add')
            .removeClass('btn-add').addClass('btn-remove')
            .removeClass('btn-success').addClass('btn-danger')
            .html('<span class="glyphicon glyphicon-minus"></span>');
        adjustTabsHeight(true);
    })
    .on('click', '.btn-remove', function(e) {
        $(this).parents('.entry:last').remove();
        e.preventDefault();
        adjustTabsHeight(true);
        return false;
    })
    
    .on('click', '.btn-accept-regex', function(e) {
        let dude = $(this).closest(".entry");
        dude.find('.label-accept_reject').html(wrap(t.accept, TAG.cV) +t.comma);
        dude.find('.input-accept_reject').data("ar","accept");
    })
    .on('click', '.btn-reject-regex', function(e) {
        let dude = $(this).closest(".entry");
        dude.find('.label-accept_reject').html(wrap(t.reject, TAG.cR) +t.comma);
        dude.find('.input-accept_reject').data("ar","reject");
    })
    
    .on('click', '.btn-accept-unmatch', function(e) {
        $("#btn-accept_unmatch").data('accept_unmatch','True');
        $(".label-accept_unmatch").html(wrap(t.accept, TAG.cV) +t.comma);
    })
    .on('click', '.btn-reject-unmatch', function(e) {
        $("#btn-accept_unmatch").data('accept_unmatch','False');
        $(".label-accept_unmatch").html(wrap(t.reject, TAG.cR) +t.comma);
    })
    
    .on('click', '#btnCopy', function() {
        copyToClipboard( $("#config").text() );
    })
    
    .on('click', '#btnSearch', function() {                          // Do search products
        
        if( GUI.state == GUI.STATE_SEARCHING ) {
            BSDialogPrompt( t.wait.cancelSearch, t.wait.searchInProgress, "type-danger stop-search" );
        }
        else {
            let allFilters = getFilters();
            if( isValidAMQP(allFilters[0][0]) ) {
                performSearch( allFilters );
            }
            else {
                BSDialog( t.err_amqp.filtr, t.error, "type-warning" );
            }
        }
    })
    
    .on('click', '#btnSearchReset', function() {                     // Do reset search
        $selectize[0].selectize.setValue( '' );
    })
    
    .on('click', '#switchLang', function() {                         // Switch langue
        switchLangue(this);
    })
    
    .on('click', '#include-hints', function() {                      // Show/Hide Config Hints
        updateResultsTab( this.checked, $('#include-man').is(':checked') );
    })
    .on('click', '#include-man', function() {                        // Show/Hide Config Hints
        updateResultsTab( $('#include-hints').is(':checked'), this.checked );
    })
    
    .on('click', '.notif-cookies .fa.fa-times-circle', function() { // Register cookies & close notification
        $.cookie( 'cookies', 'notified', {expires:365} );
        $(".notif-cookies").hide();
    })
    ;

    
$(window)
    .scroll(() => { ($(this).scrollTop() > 100) ? $('#back-to-top').fadeIn() : $('#back-to-top').fadeOut(); })
    .resize(() => { adjustTabsHeight( true ); })
    ;

// On click, scroll body to top
$('#back-to-top')         .click(() => { $('body,html').animate( {scrollTop: 0}, 500 ); return false; });

// Track tabs' activation and adjust clusterized scroll's height
$('a[data-toggle="tab"]') .on('shown.bs.tab', (e) => { adjustTabsHeight( true ); });

$('.collapse')            .on('show.bs.collapse', () => { $('.collapse.in').each(()=>{ $(this).collapse('hide'); }); });

// ---------------------------------------------------------------------
//
// BSDialog
// Display a message in a modal dialog

function BSDialog( dMessage, dTitle = "Information", dType=BootstrapDialog.TYPE_INFO ) {
    
    if( dMessage )
        BootstrapDialog.show({
            title:    dTitle,
            message:  dMessage,
            type:     dType,
            size:     BootstrapDialog.SIZE_SMALL,
            buttons: [{
                label : t.dialog.btn.ok,
                hotkey: $.ui.keyCode.ENTER,
                action: function(dialogRef){ dialogRef.close(); }
            }]
        });
}


// ---------------------------------------------------------------------
//
// BSDialogUrl
// Prompt message extracted from an external URL at a given div ID
// ex.: /docs/help.html #en-about

function BSDialogUrl( url, dTitle = "Information", dType=BootstrapDialog.TYPE_INFO ) {
    
    if( url )
        BootstrapDialog.show({
            title:    dTitle,
            message:  $('<div></div>').load(url),
            type:     dType,
            size:     BootstrapDialog.SIZE_SMALL,
            buttons: [{
                label : t.dialog.btn.ok,
                hotkey: $.ui.keyCode.ENTER,
                action: function(dialogRef){ dialogRef.close(); }
            }]
        });
    
}


// ---------------------------------------------------------------------
//
// BSDialogPrompt
// Prompt a message to request an action

function BSDialogPrompt( dMessage, dTitle = "Information", dType=BootstrapDialog.TYPE_DEFAULT ) {
    
    if( dMessage )
        BootstrapDialog.show({
            title:    dTitle,
            message:  wrap( dMessage ),
            type:     dType,
            size:     BootstrapDialog.SIZE_SMALL,
            closable: false,
            buttons: [{
                label: t.dialog.btn.stopSearch,
                cssClass: 'btn-danger btn-sm stop-search',
                action: function(dialog){
                    searchToken.cancelSearch();
                    dialog.close();
                }
            }, {
                label: t.dialog.btn.continueSearch,
                cssClass: 'btn-success btn-sm',
                action: function(dialog){
                    dialog.close();
                }
            }]
        });
}


// ---------------------------------------------------------------------
//
// copyToClipboard
// Make received text available to clipboard

function copyToClipboard( text ) {
    
    let $temp = $("<textarea>");
    $("body").append($temp);
    $temp.val(text).select();
    document.execCommand("copy");
    $temp.remove();
}


// ---------------------------------------------------------------------
// 
// plural
// Returns the string "qty str" and add an "s" if absolute qty > 1
// - if qty < 0, it returns only the string without qty in front of it
// - if str is empty, it returns qty formatted numeral
// - it applies the numeral format to qty if one is provided
// - it applies the wrapper to the string if one is provided

function plural( str, qty, format="", wrapper="" ) {
    
    if( str == "" )
        return numeral(qty).format(format === "" ? "0,0":format);

    let string = (qty < 0 ? "" : (format ? numeral(qty).format(format) : qty) +"&nbsp;")+ str + (Math.abs(qty) > 1 ? "s":"");
    return wrapper ? wrap(string, wrapper) : string;
}


// ---------------------------------------------------------------------
//
// getFilters 
// Returns an array of sarracenia filters to apply
// for searching files in selected catalogue

function getFilters() {
    
    // The first item on the filter's list is the AMQP filter
    let filters = [ [$(FILTER.INPUT_AMQP_SRC).val(), true] ];
    
    // Add to the list all other Regex filters provided by the user
    $( ".input-accept_reject" ).each( (index, item) => { let filter = $(item).val(); if( filter ) filters.push( [filter,$(item).data('ar')==='accept'] ); });
    
    // The last item of the list is accept_unmatch value 
    filters.push( ['.*', $("#btn-accept_unmatch").data('accept_unmatch')==='True'] );
    
    return filters;
}


// ---------------------------------------------------------------------
// 
// https://coderwall.com/p/kvzbpa/don-t-use-array-foreach-use-for-instead
// 
Array.prototype.forEach2 = function(a) {
    for(let i=0, n=this.length; i < n; i++) a( this[i], i );
}
Array.prototype.forEachFromTo = function(a, inn=0, out=this.length) {
// let DEBUG = true;
/*#*/if( DEBUG ){ console.group(me()); console.log('a  : ',a,'\ninn: ',inn,'\nout: ',out);};/*#*/
    out = ( out < 0 ) ? 0 : (( out > this.length ) ? this.length : out);
    inn = ( inn < 0 ) ? 0 : (( inn > out ) ? out : inn );
    for(let i=inn; i<out; i++) a( this[i], i );
}

// ---------------------------------------------------------------------
//
// Show Pane Tab
// Unhide given tab through its ID

function showTabPane( tabID ) {
    if( tabID ) $(`#${tabID}-tab`).removeClass('hidden');
}

// ---------------------------------------------------------------------
//
// Activate Pane Tab
// Simulate a click on a given tab through its ID

function activatePane( tabID ) {
    if( tabID ) $(`#${tabID}-tab`).trigger('click');
}

// ---------------------------------------------------------------------
//
// _init_data_tabs
// Use data object to store information about folders/files to display

function _init_data_tabs(nbFolders=0, nbFiles=0) {
    
    resetDataDisplay("#files-tab", nbFiles);
}

function resetDataDisplay( obj, total=0, shown=0, lines=1000 ) {
// let DEBUG = true;
/*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('obj['+obj+'] total=['+total+'], shown=['+shown+'], lines['+lines+']');};/*#*/
    lines = total > 1000 ? 1000 : total;
    $(obj).data("display", { total:total,shown:shown,lines:lines });
/*#*/if( DEBUG ){ console.timeEnd( "   " ); logMe('-','-'); console.groupEnd();};/*#*/
}

// ---------------------------------------------------------------------
// 
// updateFilesTab
// Update files' tab with title as well as its page with text

function updateFilesTab( filesInFolders, withAcceptRejectFilters = false ) {
// let DEBUG = true;
/*#*/if( DEBUG ){ console.group('in -> '+me()); console.time( "   " ); console.log('>>> filesInFolders wFilters['+withAcceptRejectFilters+']',L,filesInFolders,L,'>>> bigData_Files :',L,bigData_Files); };/*#*/

    function getHeader( nbFiles=0, totSize=0 ) {
        let files_found=t.noFilesFoundFor, total_size="", size_file="";
        if( nbFiles > 0 ) {
            files_found = wrap( numeral( nbFiles ).format('0,0') +" " +(nbFiles > 1 ? t.filesFound : t.fileFound), TAG.CR ) +' - ';
            total_size  = t.totalSize +t.comma +numeral( totSize ).format('0,0')+" " +t.bytes +(totSize > 1024 ? ' ('+ numeral(totSize).format('0.00 b') +')' : '' ) +'<br>';
            size_file   = t.FileSize;
        }

        return files_found + total_size + size_file;
    }

    if( filesInFolders.matched ) {

        let header="", files="", totSize=0, nbFiles=0;
            
        if( withAcceptRejectFilters ) {
            filesInFolders.matched.forEach( file => { nbFiles++; totSize+=file.size; files+=file.size.toString().padStart(11) +" "+ file.path +L; });
            header = getHeader( nbFiles, totSize );
            bigData_Files = buildBigDataFiles( filesInFolders, withAcceptRejectFilters );
        }
        else {
            header = getHeader( bigData_Files.length, filesInFolders.stats.matched.totSize );
        }
      
        statistics.results.files = nbFiles == 0 ? "" :     numeral(nbFiles).format('0,0');
        statistics.results.size  = totSize == 0 ? "" : "("+numeral(totSize).format('0.00 b')+")";
        statistics.results.str   = nbFiles < 2  ? t.searchHits[ nbFiles ] : t.searchHits[2] ;
        updateResultsTab();
        
        cluster.files = getScrollClusterData( PANE.FILES, bigData_Files, header );
        if( bigData_Files.length < 1 ) cluster.files.clear();
        
/*#*/if( DEBUG ){ console.log('>>> filesInFolders wFilters['+withAcceptRejectFilters+']',L,filesInFolders,L,'>>> bigData_Files :',L,bigData_Files); console.groupEnd(); };/*#*/
    }
    else {
        
        $("#files pre").html( t.noFiles );
        
    }
    
/*#*/if( DEBUG ){ console.timeEnd( "   " ); logMe('-','-'); console.groupEnd();};/*#*/
}


// ---------------------------------------------------------------------
// 
// setFilterSubtopic
// 

function  setFilterSubtopic( state ) {
    
    switch ( state ) {
        
        case "enable" :
            $("#btnSearch").prop('disabled',false);
            break;

        case "disable" :
            $("#btnSearch").prop('disabled',true).html(t.g_search + t.search);
            break;

        case "reset" :
            resetDataDisplay( "#topics-tab", bigData_Folders.length );
            $("#err-subtopic").hide();
            $("#topics-tab, #files-tab").data("display").shown = 0;
            setFilterSubtopic( "disable" );
            setGUIstate(GUI.STATE_RESET);
            if( folders.length < 1 ) cluster.subtopic.clear();
            if( $(FILTER.INPUT_AMQP_SRC).val() == "" ) {
                $("#topics-tab, #files-tab, #stats-tab").addClass('hidden');
            }
            setGUIstate(GUI.STATE_READY);
            break;

        default : // if here, what did happen ???
            console.log(t.err_subtopicState +" ["+ state +"]")
    }
    
}


// ---------------------------------------------------------------------
// 
// setGUIstate
// 

function setGUIstate( thisState = GUI.STATE_READY ) {
    
    if( GUI.state != thisState ) {
    
        GUI.state = thisState;
        switch (thisState) {
            
            case GUI.STATE_FOUND: 
                document.body.style.cursor = 'wait';                           
                $("#logs").hide();
                $("#btnSearch").html(t.g_search + t.search);
                $("#btnCopy, #topics-tab, #files-tab, #stats-tab").removeClass('hidden');
                $("#stats-tab").trigger('click');
                adjustTabsHeight(true);
                break;
                
            case GUI.STATE_LOADING: 
                document.body.style.cursor = 'wait';
                $("#msg").html( wrap( t.wait.searchInProgress +" - "+ t.wait.please, TAG.CN ) );
                $(".input-subtopic").val("");
                $("#logs, #tabs, #tabs .nav-tabs").show();
                $("#sarra-formula").removeClass('hidden');
                $("#editor-tab").trigger('click');
                adjustTabsHeight(true);
                break;
                
            case GUI.STATE_RESET: 
                document.body.style.cursor = 'wait';
                $("#logs").show();
                $("#msg").html( wrap( t.wait.searchInProgress +" - "+ t.wait.please, TAG.CN ) );
                $("#files-tab").html(wrap( t.noFiles, TAG.cG ));
                $("#files pre").html( "" );
                $(".input-subtopic").val("");
                $("#editor-tab").trigger('click');
                adjustTabsHeight(true);
                break;
                
            case GUI.STATE_SEARCHING: 
                document.body.style.cursor = 'wait';
                $("#logs, #msg").show();
                $("#files-tab, #stats-tab").addClass('hidden');
                $("#btnSearch").html(t.f_superp + t.cancel);
                $("#editor-tab").trigger('click');
                adjustTabsHeight(true);
                break;
                
            case GUI.STATE_READY: 
            default:
                document.body.style.cursor = 'default';
                $("#logs").hide();
                adjustTabsHeight(true);
        }
    }
}


// ---------------------------------------------------------------------
// 
// adjustTabsHeight
// 

function adjustTabsHeight( adjust ) {
    
    let 
        $tabs          = $('#tabs'),
        $stats         = $('#stats'),
        tabsOffsetTop  = $tabs.offset().top,
        liHeight       = parseInt( $('.clusterize-content.customize-counter li').css('line-height') ),
        tabsMinHeight  = parseInt( $tabs.css('min-height') ),
        tabsPaddingBot = parseInt( $tabs.css('padding-bottom') ),
        newHeightTabs  = Math.max( ($(window).height() -tabsOffsetTop -parseInt($('body').css('padding-bottom'))), tabsMinHeight ),
        progressHeight = $('.progress-scroll').height(),
        
        $cluster   = {},
        newHeight  = 0,
        rowInBlock = 0;
    
    if(adjust) {
        $tabs.outerHeight( newHeightTabs );
        $stats.height(  $tabs.height() -parseInt($tabs.css("padding-bottom")) + tabsOffsetTop - $stats.offset().top );
        
        if( cluster.catalog ) {
            $cluster   = $('#scroll-folders');
            newHeight  = newHeightTabs -$cluster.offset().top +tabsOffsetTop -tabsPaddingBot -progressHeight;
            rowInBlock = ( Math.round( ( newHeight / liHeight ) / 2 ) * 2 );
            
            $cluster.height( newHeight );
            cluster.catalog.options.rows_in_block = rowInBlock;
            cluster.catalog.refresh();
        }
        if( cluster.subtopic ) {
            $cluster   = $('#scroll-topics');
            newHeight  = newHeightTabs -$cluster.offset().top +tabsOffsetTop -tabsPaddingBot -progressHeight;
            rowInBlock = ( Math.round( ( newHeight / liHeight ) / 2 ) * 2 );
            
            $cluster.height( newHeight );
            cluster.subtopic.options.rows_in_block = rowInBlock;
            cluster.subtopic.refresh();
        }
        if( cluster.files ) {
            $cluster   = $('#scroll-files');
            newHeight  = newHeightTabs -$cluster.offset().top +tabsOffsetTop -tabsPaddingBot -progressHeight;
            rowInBlock = ( Math.round( ( newHeight / liHeight ) / 2 ) * 2 );
            
            $cluster.height( newHeight );
            cluster.files.options.rows_in_block = rowInBlock;
            cluster.files.refresh();
        }
    }
}


// ---------------------------------------------------------------------
// 
// setCookie
// 

function setCookie() {

    LANG = ( LANG == "fr" ? "en":"fr" );
    $.cookie( "LANG",LANG );
}


// ---------------------------------------------------------------------
// 
// switch language
// 

function switchLangue() {

    $.cookie( "LANG", ( LANG == "fr" ? "en":"fr" ) );
    location.reload();
}


// ---------------------------------------------------------------------
// 
// wrap
// 

function wrap(str,wrapTag=['<p>','</p>']) {

    return wrapTag[0] + str + wrapTag[1];
}


// ==========================================================================================================================================
//  ### DEBUG HELPERS ###
// ==========================================================================================================================================

function me( n="" ) {

    let stack  = new Error().stack,
        caller = n ? n : stack.split('\n')[2].trim().split(" ")[1],
        myName = caller;
        
    return myName;
}

function logMe( msg="", pad="-", n = 100 ) {

    let stack  = new Error().stack,
        caller = stack.split('\n')[2].trim().split(" ")[1],
        text   = pad +"[ "+ caller +" ]"+ pad;
        
        if( n < 0 ) {
            text = msg + pad.repeat( Math.abs(n) - msg.length );
        }
        else {
            if( msg == pad )
                text = pad.repeat(n);
            else
                text  += ( msg ) ? ( pad.repeat(n-text.length) +L +" ".repeat(pad.length + 2) + "- "+msg ) : pad.repeat(n - text.length);
        }
            
    console.log( text );
}

function measureCRP(id="start") {
    var t = window.performance.timing,
        interactive = t.domInteractive - t.domLoading,
        dcl = t.domContentLoadedEventStart - t.domLoading,
        complete = t.domComplete - t.domLoading;
        
    console.log( id +' interactive: ' + interactive + 'ms, ' + 'dcl: ' + dcl + 'ms, complete: ' + complete + 'ms' );
}

// ==========================================================================================================================================
