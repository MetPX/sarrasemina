// ---------------------------------------------------------------------
//
// ### BRAINSTROM ###
//     -> Alert for IE11 -> Go to Edge, Chrome or FFox
//     -> Stats sur les config les plus populaires ?
//
// ---------------------------------------------------------------------

            /*#*/DEBUG = false;/*#*/
            /*#*/if( DEBUG ){ console.time   ( "   " ); console.group(me("--- WARMING UP ---"));};/*#*/

            'use strict';
            
            // ---------------------------------------------------------------------
            //  GLOBAL VARS
            // ---------------------------------------------------------------------
            
            const GUI = {   STATE_READY     : 0,
                            STATE_RESET     : 1,
                            STATE_LOADING   : 2,
                            STATE_SEARCHING : 10,
                            STATE_FOUND     : 20 },
                  C   = {   BLACK :"black",
                            BLUE  :"blue",
                            GREEN :"green",
                            RED   :"red" },
                  W   = {                                                           // Predefined tag wrapers
                        H1: ['<h1>','</h1>'],
                        H2: ['<h2>','</h2>'],
                        H3: ['<h3>','</h3>'],
                        H4: ['<h4>','</h4>'],
                        cB: ['<span class="c-bleu">','</span>'],
                        cG: ['<span class="c-gris">','</span>'],
                        cJ: ['<span class="c-jaune">','</span>'],
                        cN: ['<span class="c-noir">','</span>'],
                        cR: ['<span class="c-rouge">','</span>'],
                        cV: ['<span class="c-vert">','</span>'],
                        CB: ['<strong class="c-bleu">','</strong>'],
                        CG: ['<strong class="c-gris">','</strong>'],
                        CJ: ['<strong class="c-jaune">','</strong>'],
                        CN: ['<strong class="c-noir">','</strong>'],
                        CR: ['<strong class="c-rouge">','</strong>'],
                        CV: ['<strong class="c-vert">','</strong>'],
                        stg: ['<strong">','</strong>']
                    },
                  nl  = '\n',
                  DATA_SEPARATOR     = "|",
                  CATALOG_TYPE       = "toc",
                  id_NB_FILES        = 0,
                  id_TOC_RANGE_START = 1,
                  id_TOC_RANGE_STOP  = 2,
                  id_TOTAL_SIZE      = 3,
                  id_TOX_RANGE_START = 4,
                  id_TOX_RANGE_STOP  = 5,
                  id_RANGE_START     = CATALOG_TYPE === "toc" ? id_TOC_RANGE_START : id_TOX_RANGE_START,
                  id_RANGE_STOP      = CATALOG_TYPE === "toc" ? id_TOC_RANGE_STOP  : id_TOX_RANGE_STOP,
                  numberOfFilesToShowProgressBar = 5000;
            
            if( $.cookie( "lang" ) === undefined )                                  // Detect browser's default language and set cookie
                $.cookie( "lang", (/fr/.test(navigator.languages[0]) ? 'fr':'en') );

            var t       = {},                                                       // GUI's text container
                lang    = $.cookie("lang"),                                         // Select user's prefered language
                selectedFilesCatalogue,                                             // ### NOTE ### The catalogue data is splitted in two files: .json for folders and .toc for files
                bigData_Folders,                                                    // Contains structured data of folders (the whole catalogue.json)
                bigData_Files,                                                      // Contains structured data of files   (byterange catalogue.toc filtered with user's accept_reject filters)
                GUIstate,
                previous        = { catalogInfo: '', selectedCatalogueIndex : 0, AMQPfilter: '' },
                showProgressBar = false,
                statistics      = { catalog:{}, search: {}, results: {} },

                searchToken     = new CancellationTokenSource,
                progressBar     = {};
                
                searchToken.cancel();
                
            $( () => {
                progressBar = {
                    max          : 0,
                    str          : {ln1:'',ln2:''},
                    color        : C.BLACK,
                    progress     : 0,
                   $progress     : $('.progress'),
                   $progress_bar : $('.progress-bar'),
                   $progress_txt : $('.progress .info'),
                    doColor      : function ( newColor ) { $('.progress').removeClass( this.color ).addClass( newColor ); this.color = newColor; },
                    doHide       : function () { $('.progress').hide(); },
                    doShow       : function () { $('.progress').show(); },
                    init         : function ( max, s={ ln1:t.data.searching, ln2:'' }, color ) {
                                        this.max      = max;
                                        this.str      = s;
                                        this.doColor( color||C.BLACK );
                                        this.progress = "0%";
                                        this.$progress_bar.width( this.progress );
                                        this.$progress_txt.html( `${this.str.ln1} - [ 0% ]${( this.str.ln2 ? `<br>0${this.str.ln2}`:'' )}` );
                                        this.$progress.show();
                                    },
                    set          : function ( num, found=0 ) {
                                        if( this.max && num ) {
                                            this.progress = String( Math.round( num / this.max * 100 ) ) +"%";
                                            this.$progress_bar.width( this.progress );
                                            this.$progress_txt.html( `${this.str.ln1} - [ ${this.progress} ]${(found?`<br>${numeral(found).format('0,0')}${this.str.ln2}`:'')}` );
                                        }
                                    }
                };
            });
            
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
            //  _initialize_
            // Startup the engines!
                
            function _initialize_() {
            /*#*/if( DEBUG ){ console.group(me());};/*#*/
                
                let switchLangue = { fr: { btn:"English", title:"Display in English" }, en: { btn:"Français", title:"Afficher en français" } }
                $("#switchLang").attr('title',switchLangue[lang].title).text( switchLangue[lang].btn ).addClass(lang).show();

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
                    requests = jsonURLs.map((url) => $.ajax(url)),               // Get JSON requests for GUI texts & catalogue lists from jsonURLs global var
                    selector = $("#catalogues");
                
                selector.html( wrap( msg.ini[lang] ) );
                testCookies();
                testBrowserCompatibility();
                
                Promise .all    ( requests )
                        .then   ( processData )
                        .catch  ( processError );                                    // Load GUI texts  ### MS IE don't support Promise -> Only MS Edge
                
                function processError(data) {
                    
                    selector.html( wrap( msg.err.loadJSON[lang] + data.status ) );

                }

                function processData(data) {
                
                    let dataDirs = data[0]; // raw data: need processing
                    let GUItexts = data[1];
                    let DOCtexts = data[2];
                    let dirBase  = jsonURLs[0];
                    let catalogs = [];
                    $(dataDirs).find('a[href$="/"]').each( function(){ 
                        let jUrl = $(this).attr('href');
                        if( jUrl !== "/" ) {
                            let dirName = jUrl.slice(0,-1);
                            catalogs.push( dirName );
                        }
                    });
                    
                    $.extend(t,GUItexts[lang],GUItexts.icons);

                    $("#title")                .html(t.title);
                    $("#msg")                  .html(wrap(t.bienvenue, W.H1));
                    $(".label-topic")          .html(t.topic            +t.comma);
                    $(".label-subtopic")       .html(t.subtopic         +t.comma);
                    $(".input-subtopic")       .attr("placeholder", t.placeholder.AMQP_filter ).attr("aria-label",t.enterYourFilter);
                    $(".label-accept_reject")  .html(wrap(t.accept,    W.cV) +t.comma);
                    $(".input-accept_reject")  .attr("placeholder", t.placeholder.Regex_filter).attr("aria-label",t.enterYourFilter);
                    $(".label-accept_unmatch") .html(wrap(t.reject,    W.cR) +t.comma);
                    $("#descr-accept_unmatch") .html(t.unmatchElements);

                    $("#btnCopy")              .attr("title",t.copyConfig).addClass("hidden");
                    $("#btnSearch")            .html(t.g_search + t.search).addClass("disabled");
                    $("#btnSearchReset")       .html(t.g_remove).addClass("disabled");
                    $("#log_title")            .html(t.searchResults+" "+t.forThisConfig);

                    $("#help-topic")           .attr("title", t.help.tip) .data("title", t.help.title.topic)         .data("infos", t.help.infos.topic).tooltip();
                    $("#help-subtopic")        .attr("title", t.help.tip) .data("title", t.help.title.subtopic)      .data("infos", t.help.infos.subtopic).tooltip();
                    $(".help-accept_reject")   .attr("title", t.help.tip) .data("title", t.help.title.acceptReject)  .data("infos", t.help.infos.acceptReject).tooltip();
                    $(".help-accept_unmatch")  .attr("title", t.help.tip) .data("title", t.help.title.acceptUnmatch) .data("infos", t.help.infos.acceptUnmatch).tooltip();
                    
                    $("#stats-tab")            .html(t.results);

                    if( !catalogs ) {
                        
                        selector.html(msg.err.noCatalogues[lang]);
                    }
                    else {
                        
                        let options = catalogs.sort().reverse().map( dirName => `<option value="${dirBase}${dirName}/catalogue.json">Data - [ ${dirName} ]</option>` );
                        let mySelector = `
                        <label for="catalogueSelector">${t.selectCatalogue}${t.comma}</label>
                        <select id="catalogueSelector" class="form-control input-sm">
                            <option value="" selected hidden>${t.catalogList}</option>
                            ${options}
                        </select><br>
                        <span id="info-catalogue"></span>`;

                        selector.html( mySelector );
                        $('#catalogueSelector').on('change', function(){
                            let selectedCatalogue = $(this).find("option:selected").val();
                            selectedFilesCatalogue = selectedCatalogue.split("json")[0]+ CATALOG_TYPE;
                            $("#msg").hide();

                            loadFoldersCatalogueData( selectedCatalogue );
                        });
                    }
                }
                
                function testCookies() {
                    if( !$.cookie('cookies') ) {
                        $('.notif-cookies .msg').html( msg.cookie[lang] );
                        $('.notif-cookies').show();
                    }
                }
                
                function testBrowserCompatibility() {
                    
                    if( ($.cookie("browser") === "OK") || ($.cookie("showWarningDialog") === "NO") ) return;
                    
                	var parser = new UAParser();
                    /* // this will print an object structured like this:
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
//                    console.log("name    "+result.browser.name);
//                    console.log("version "+result.browser.major);
//                    console.log("device  "+result.device.model);
//                    console.log("OS      "+result.os.name);

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
                        let pTitle     = ((lang == 'fr') ? "Problème":"Issue"),
                            pMessage   = wrap( msg.err.browserIssue[lang] + browserList +"\n\n"+ msg.err.browserUsed[lang] +"- "+ result.browser.name +" v."+ result.browser.major ),
                            pType      = "type-danger",
                            pBtnOK     = { cssClass:'btn-default btn-sm', label:'&nbsp; &nbsp; OK &nbsp; &nbsp;' },
                            pBtnGetRid = { cssClass:'btn-default btn-sm', label:((lang == 'fr') ? "Ne plus afficher ce message":"Don't show this message again"), action:( function(){ $.cookie( "showWarningDialog", "NO", { expires: 365 }) }) };
                         // BSDialogPrompt(pMessage,pBtnAccept,pBtnCancel);
                         
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
            // Reset statistics
            
            function resetStatistics( part = "" ) {
                
                switch( part ) {
                
                    case "catalogue": statistics.catalogue = {}; break;
                    case "search":    statistics.search    = {}; break;
                    case "results":   statistics.results   = {}; break;
                    default:
                        statistics = { catalog:{}, search: {}, results: {} };
                }
            }
            
            
            // ---------------------------------------------------------------------
            //
            // fetchFileRange returns an httpGet object.
            // that contains texts of the url file within byte range
            
            async function fetchFileRange(url, byteRanges=[""]) {
//                let DEBUG = true;
            /*#*/if( DEBUG ){ logMe(url +nl+"   - ["+ byteRanges +"]", '-');};/*#*/

                try {
                    let rangeText = "";
                    for( let i=0; i < byteRanges.length; i++ ) {
                        let objFileInfo = await getFileSize( url, byteRanges[i] );
                        rangeText      += await httpGet( url, objFileInfo, byteRanges[i] );
                    }
            /*#*/if( DEBUG ){ 'rangeText',nl,rangeText,nl,logMe('-','-');};/*#*/
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
                    
                    for (let i = 0; i < multipartSize.length; i++)
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
            
            function httpGet( url, fileinfo, byteRange="", responseType="" ) {
                
                return new Promise(
                    function (resolve, reject) {
                        const request = new XMLHttpRequest();
//                         let partsize  = (byteRange) ? fileinfo.partsize : fileinfo.filesize;

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
//                              resolve( { cType: cType, fSize: fSize, rText: rText } );    // Returns object { cType: content-type, fSize: content-length, rText: responseText }
                            }
                                // Something went wrong (404 etc.)
                            else {
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
            // Load selected catalogue 
            
            function loadFoldersCatalogueData( selectedCatalogue ) {
//             let DEBUG = true;
            /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log(selectedCatalogue);};/*#*/
                $.ajax({
                    url    : selectedCatalogue,
                    cache  : false,             // Get latest file version
                    xhr    : function() {
                        let xhr = new window.XMLHttpRequest();
                        return xhr;
                    },
                    statusCode: {
                        404: function() { 
                                BSDialog( t.fileNotFound, t.error, "type-danger" );
                            }
                    },
                    success: function(foldersData){
                        
                        $("ui.tree").hide();
                        bigData_Folders = foldersData;

                        let getSums     = function(folders) { let s = { folders:folders.length, files:0,bytes:0 }; folders.forEachFromTo( (folder) => { s.files += folder.inf[id_NB_FILES]; s.bytes += folder.inf[id_TOTAL_SIZE]; }); return s; };
                        let total       = getSums( foldersData );
                        let fmtTotal    = { folders : plural(t.folder, total.folders, '0,0', W.CV),
                                            files   : plural(t.file,   total.files,   '0,0', W.CR),
                                            bytes   : "("+ numeral(total.bytes).format('0.00 b') +")"
                                          };
                        let catalogInfo    = wrap( t.thisCatalogue +t.comma+" "+ fmtTotal.folders +",&nbsp;"+ fmtTotal.files +"&nbsp;"+ fmtTotal.bytes.replace(' ','&nbsp;'), ['<span>','</span>']);
                        let cataloguePaths = selectedCatalogue.split("/");
                        let catalogueName  = cataloguePaths[cataloguePaths.length -2];
                        resetStatistics();
                        statistics.catalog = { name: catalogueName, folders: total.folders, files: total.files, bytes: total.bytes };
                        
                        _init_data_tabs(total.folders,total.files);
                        if( foldersData.length > 1000 ) {

                            BootstrapDialog.show({
                                size:     BootstrapDialog.SIZE_SMALL,
                                title:    t.dialog.title.about_catalogue +  "[ "+ wrap( catalogueName, W.cN) +" ]",
                                message:  t.dialog.message.tocLoaded + fmtTotal.folders +", "+ fmtTotal.files +" "+ fmtTotal.bytes + t.dialog.message.displayToc,
                                closable: false,
                                buttons: [
                                    {   id: 'catalogue-cancel',
                                        label: t.dialog.btn.cancel,
                                        hotkey: $.ui.keyCode.ESCAPE,
                                        action: function(dialogRef){
                                            $("#catalogueSelector").prop('selectedIndex',previous.selectedCatalogueIndex);
                                            $("#info-catalogue").html( previous.catalogInfo );
                                            dialogRef.close();
                                        }
                                    },
                                    {   id: 'catalogue-select',
                                        icon: t.dialog.icon,
                                        label: t.dialog.btn.display,
                                        hotkey: $.ui.keyCode.ENTER,
                                        autospin: true,
                                        action: function(dialogRef) {
                                            previous.selectedCatalogueIndex = $("#catalogueSelector").prop('selectedIndex');
                                            previous.catalogInfo = catalogInfo;
                                            $("#info-catalogue").html( catalogInfo );
                                            dialogRef.enableButtons(false);
                                            dialogRef.setTitle(t.dialog.title.wait);
                                            dialogRef.setMessage(t.dialog.message.buildingToc);
                                            $(".modal-footer").hide();
                                            
                                            setGUIstate( GUI.STATE_LOADING );
                                            setTimeout(function(){
                                                setFilterSubtopic( "reset" );
                                                dialogRef.close();
                                            }, 100);
                                        }
                                    }]
                            });
                        }
                        else {
                            previous.selectedCatalogueIndex = $("#catalogueSelector").prop('selectedIndex');
                            previous.catalogInfo = catalogInfo;
                            $("#info-catalogue").html( catalogInfo );
                            setGUIstate( GUI.STATE_LOADING );
                            setFilterSubtopic( "reset" );
                        }
                        
                    },
                    error: function(XMLHttpRequest, textStatus, errorThrown){
                        console.log( t.error + " - loadFoldersCatalogueData("+ selectedCatalogue +")",nl,'XMLHttpRequest',XMLHttpRequest,nl,'textStatus',textStatus,nl,'errorThrown',errorThrown );
                    }
                });

            /*#*/if( DEBUG ){ console.timeEnd( "   " ); logMe('-','-'); console.groupEnd();};/*#*/
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
//                 let DEBUG = true;
                /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log("selectedCatalogue [",selectedCatalogue,"]\nFolders", folders );};/*#*/

                let dataFiles = [];
                if( folders.matched ) {
                    
                    // If the file's byterange is larger than a reasonable size to pick it up with one request, it is broken into smaller multipart chuncks to make it easier to chew ...
                    let multipartRanges = optimizeMultipartRanges( folders.matched.map( file => { return [ file.inf[id_RANGE_START], file.inf[id_RANGE_STOP], file.id ]; } ) );
                    
                    let percent = 0,
                        count   = 0,
                        buffer  = '',
                        total   = multipartRanges.length;
                    
                    if( showProgressBar ) { progressBar.init( total, {ln1:t.data.gathering, ln2:t.data.files }, C.BLUE ); await wait( 1 ); } // Give some time to progress-bar beeing refreshed...

                    // Can't use forEach on async/await functions... -> go for traditional way...
                    for (let multipartRange of multipartRanges) {
                        
                        count++;
                        if( showProgressBar ) { progressBar.set(count, dataFiles.length ); await wait( 10 ); }
                        if( cancel.token.isSearchCancelled() ) {
                            cleanUpCancelledSearch();
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
                            
                            /*#*/if( DEBUG ){ console.log(' count',count,' total',total,' lines[',(typeof lines[lines.length -2].split(DATA_SEPARATOR)[1]),'] #####[',lines[lines.length -1],']#####'); };/*#*/
                            lines.forEach( (line) => {
                                let fileInfo = line.split(DATA_SEPARATOR);
                                if( fileInfo.length == 3 ) {
                                    dataFiles.push( { path: bigData_Folders[parseInt(fileInfo[0])].dir +'/'+ fileInfo[2], size: parseInt(fileInfo[1]) });
                                }
                            });
                        }
                    }
                    if( showProgressBar ) { await wait( 250 ); progressBar.doHide(); }
                }
                
                /*#*/if( DEBUG ){ console.log("dataFiles",dataFiles); console.timeEnd( "   " ); logMe('-','-'); console.groupEnd();};/*#*/
                return dataFiles;
            }
            
            
            // ---------------------------------------------------------------------
            //
            // buildBigDataFiles
            
            function buildBigDataFiles( filesInFolders, withAcceptRejectFilters = false ) {
            // DEBUG = true;
            /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('withARFilter['+withAcceptRejectFilters+'] filesInFolders :',nl,filesInFolders);};/*#*/
            
                let dataFiles = [];

                if( filesInFolders.matched ) {
                    
                    if( withAcceptRejectFilters ) {
                        dataFiles = filesInFolders.matched;
                    }
                    else {

                        let multipartRanges = optimizeMultipartRanges( filesInFolders.matched.map( (file) => { return [ file.inf[id_RANGE_START], file.inf[id_RANGE_STOP], file.id ]; } ) );
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

            function getSubtopicMatch( foldersData, subtopicFilter ) {
//             let DEBUG = true;
            /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('regex['+subtopicFilter+'] foldersData :',nl,foldersData);};/*#*/

                let regex = new RegExp( subtopicFilter );
                let stats = { matched: { nbFiles: 0, totSize: 0, ranges: [] }, unmatch: { nbFiles: 0, totSize: 0, ranges: [] } };
                let len   = foldersData.length;
                let matched = [];
                let unmatch = [];
                
                for( let i = 0; i < len; i++ ) {
                    if( foldersData[i].dir.match( regex ) ) {
                        matched.push(foldersData[i]);
                        matched[matched.length - 1].id = i;
                        if(foldersData[i].inf[id_NB_FILES] > 0) {
                            stats.matched.nbFiles += foldersData[i].inf[id_NB_FILES];
                            stats.matched.totSize += foldersData[i].inf[id_TOTAL_SIZE];
                            stats.matched.ranges.push( foldersData[i].inf[id_RANGE_START]+'-'+foldersData[i].inf[id_RANGE_STOP] );
                        }
                    }
                    else {
                        unmatch.push(foldersData[i]);
                        unmatch[unmatch.length - 1].id = i;
                        if(foldersData[i].inf[id_NB_FILES] > 0) {
                            stats.unmatch.nbFiles += foldersData[i].inf[id_NB_FILES];
                            stats.unmatch.totSize += foldersData[i].inf[id_TOTAL_SIZE];
                            stats.unmatch.ranges.push( foldersData[i].inf[id_RANGE_START]+'-'+foldersData[i].inf[id_RANGE_STOP] );
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
//             let DEBUG = true;
            /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('regex['+reg+']',nl,'filesData :',nl,filesData);};/*#*/
                
                reg[0][0] = reg[0][0].replace('$','.*$');   // First filter is subtopic. When Accept-Reject filters kiks in, make sure subtopic will allow everything beyond its path.

                let regex    = reg.map( (r) => { return new RegExp(r[0]); } );
                let accept   = reg.map( (r) => { return r[1]; } );
                let matched  = reg.map( () => { return [] } );
                let unmatch  = reg.map( () => { return [] } );
                let nbLines  = filesData.length;
                let nbRegex  = regex.length;
                let firstReg = 0;
                let lastReg  = regex.length -1;
                let chunk    = Math.floor( nbLines / 100 );
                let stats    = { matched: { nbFiles: 0, totSize: 0 }, unmatch: { nbFiles: 0, totSize: 0 } };
                
                let subtopic    = regex[0];        // First regex filter is SubTopic
                let keepUnmatch = accept[lastReg]; // Last accept value for unmatched elements: true for accept or false for reject

                statistics.search.accept_reject = reg.map( (r) => { return { filter : r[0], accept : r[1], matched: {files:0, totalSize:0 }, unmatch: {files:0, totalSize:0 } }; });
                statistics.results.found = 0;
                
                loopLines: for( let line = 0; line < nbLines; line++ ) {
                    
                    if( showProgressBar && (line % chunk) == 0 ) { progressBar.set(line, stats.matched.nbFiles ); await wait(10); }
                    if( cancel.token.isSearchCancelled() ) {
                        cleanUpCancelledSearch();
                    }
                    
                    loopRegex: for( let r = 0; r < nbRegex; r++ ) {
                        
                        switch( r ) {

                            case firstReg:
                                
                                continue loopRegex;

                                if( !filesData[ line ].path.match( subtopic ) )
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

                                if( filesData[ line ].path.match( regex[ r ] ) ) {
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
                
                if( showProgressBar ) { await wait(250); progressBar.doHide(); await wait(10); }
            /*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/
            
                return { matched, unmatch, stats };
            }
            
            // ---------------------------------------------------------------------
            //
            // isValidAMQP
            // Test if received filter is a valid AMQP filter

            function isValidAMQP(filter) {
                // --------------
                //
                // AMQP filter rules 
                //  - in AMQP, dots (.) represent directory separators (/) in a path
                //  - wildcard star (*) match any directory name
                //  - wildcard hash (#) match any string from its position and after
                //
                // Rules Specifications
                //  1- The filter must not start with a dot (.) except if hash (#) is the only char
                //  2- Wildcard star must only be used within two dots (.*.) and no characters in between
                //  3- Wildcard hash, IF ANY, must be the last filter's character, preceded immediately by a dot (.#)
                //
                // --------------
                let vr1 = !/^\./.test(filter);  // test rule #1
                let vr2 = (filter ==                                    // test rule #2 -> valid if filter does not change after replacements
                                    filter.replace(/\*[^\.]/g,"")           // - remove * followed by any char except dot 
                                            .replace(/[^\.]\*/g,"")         // - remove * preceded by any char except dot 
                                            .replace(/\*$/,""));            // - remove traling *
                let vr3 = !(/#/.test(filter)                            // test rule #3
                                && !( /.+\.#$/.test(filter) 
                                      || /#.+/.test(filter)
                                      || /^#$/.test(filter)
                                    ));

                let isValidFilter = vr1 && vr2 && vr3;                  // AMQP is a valid filter when all valid rules are passed
                
                if ( !(isValidFilter) ) {
                    let eTitle   = '<p><strong>'+ t.error + t.comma + t.err_amqp.rules +'</strong></p>';
                    let eMessage = '<p>'+ ( !vr1 ? t.err_amqp.nodot : '' ) +
                                          ( !vr2 ? (!vr1 ? '<br>':'') + t.err_amqp.stars : '' ) +
                                          ( !vr3 ? (!vr1 || !vr2 ? '<br>':'') + t.err_amqp.hasht : '' ) +'</p>';
                    $("#err-subtopic .err").html( eTitle + wrap(eMessage, W.cJ) );
                    $("#err-subtopic").show();
                }
                
                if ( isValidFilter ) {
                    $("#err-subtopic").hide();
                }
                
                return isValidFilter;
            }

            
            // ---------------------------------------------------------------------
            //
            // path2AMQP
            // Convert normal path to AMQP path

            function path2AMQP(path) {
                return path.replace(/^\//,"").replace(/\//g,".");
            }


            // ---------------------------------------------------------------------
            //
            // cleanUpCancelledSearch
            // 
            // Reset UI display and stuff
            
            function cleanUpCancelledSearch() {
                 window.location.reload();
            }


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
//                 let DEBUG = true;
            /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('Filters',allFilters); };/*#*/
            
                setGUIstate( GUI.STATE_SEARCHING );
                
                let AMQPfilter          = allFilters[0][0];     // AMQP filter    is the first item of allFilters list; -> Extract and remove it from the list
                let acceptRejectFilters = allFilters;           // The leftovers are accept_reject plain regex filters; -> Set in a separate variable for readability
                let subtopicFilter      = AMQPfilter            // Convert AMQP subtopicFilter to a RegExp filter;      -> JavaScript will be able to search!
                                            .replace(/(.*)/, "^/$1")                // add ^/ before and $ after the string
                                            .replace(/[.]/g, "/")                   // all . becomes /
                                            .replace(/\*/g,  /((?:\\.|[^\/\\])*)/ ) // magic finder - find any chars between 2 consecutive slashes 
                                            .replace(/\/{2,}/g, "/")                // reduce any consecutive slashes //, /// become /
                                            .replace(/(#.*)/,".*")
                                            .replace(/(.*)/, "$1$");
                
                let config,                                     // Sarra config to be displayed on screen according to user's choices
                    STm,                                        // STm (SubTopic match)     stores selectedCatalogue's data filtered with subtopicFilter
                    ARm,                                        // ARm (AcceptReject match) stores STm's (SubTopic match)'s data filtered with acceptRejectFilters
                    nbFolders, nbFoldersHtml,                   // Number of folders found with subtopicFilter
                    nbFiles,   nbFilesHtml,                     // Number of files   found with subtopicFilter and acceptRejectFilter (if any)
                    matches    = [],                            // Store a list matching filters criteria
                    filesInFolders = { matched: [], stats: { matched: { nbFiles:0,totSize:0 } } };
                
                
                $("#logger").html( wrap( t.wait.searchInProgress +" - "+ t.wait.please, W.CN ) );
                
                // Apply Subtopic filter if different 
                // from a previous search...
                // --------------------------------------------------
                STm = getSubtopicMatch( bigData_Folders, subtopicFilter );              // From JSON's catalogue bigData_Folders (global var), get SubTopic Matchs
                resetStatistics("search");
                statistics.search.subtopic = [{
                    filter:AMQPfilter,
                    matched: {folders: STm.matched.length, files:STm.stats.matched.nbFiles, totalSize:STm.stats.matched.totSize },
                    unmatch: {folders: STm.unmatch.length, files:STm.stats.unmatch.nbFiles, totalSize:STm.stats.unmatch.totSize }
                }];
                
                matches.push( STm );                                                    // Add it to the matches array
                matches.forEach( (match) => {                                           // Merge all match in filesInFolders
                    filesInFolders.stats.matched.nbFiles += match.stats.matched.nbFiles;
                    filesInFolders.stats.matched.totSize += match.stats.matched.totSize;
                    $.merge(filesInFolders.matched, match.matched);
                });
                
            /*#*/if( DEBUG ){ console.log('STm',STm); };/*#*/
                
                // Grab user's config
                // --------------------------------------------------
                let hasAcceptRejectFilter = false;
                config  = "topic          "+ $(".label-topic").data('label') +nl;
                config += "subtopic       "+ AMQPfilter +nl;
                $.each($('.input-accept_reject'), function() {
                    if( $(this).val() ) hasAcceptRejectFilter = true;
                    config += ( $(this).val() ) ? $(this).closest('.entry').find('.input-accept_reject').data("ar") +"         "+ $(this).val() +nl : "";
                });
                config += hasAcceptRejectFilter ? "accept_unmatch " + $("#btn-accept_unmatch").data("accept_unmatch") +nl : "";
                $("#config")   .html(config);
                
                // Extract some info for the logger...
                nbFolders     = STm.matched.length;
                nbFoldersHtml = plural(t.folder, nbFolders, '0,0', W.CV);
                nbFiles       = filesInFolders.stats.matched.nbFiles;
                nbFilesHtml   = plural(t.file,   nbFiles,   '0,0', W.CR);
                
                showProgressBar = nbFiles > numberOfFilesToShowProgressBar;

                // And update display...
                resetDataDisplay( "#folders-tab", nbFolders );
                updateFoldersTab( STm.matched );
                
                // All files found with SubTopic filter are
                // stored in the global var bigData_Files
                // --------------------------------------------------
                if( filesInFolders.matched ) {
                    
                    let nbFiles   = filesInFolders.stats.matched.nbFiles,
                        totalSize = filesInFolders.stats.matched.totSize;
                        
                    nbFilesHtml   = nbFiles > 0 ? plural(t.File, nbFiles, '0,0', W.cR) : nbFiles == 0 ? t.noFiles : "&nbsp;";
                    searchToken.reset();
                    bigData_Files = await getBigDataFiles( filesInFolders, selectedFilesCatalogue, searchToken )
                                            .then( (data) => { return data } )
                                            .catch( (err) => {
                                                console.log(me()," err: ",err);
                                                if( !searchToken.token.cancelledSearch ) { console.log( "### Err : ", nl, err ); }
                                            });

                    let totSize   = t.totalSize +t.comma+ totalSize +" "+ t.bytes + (totalSize > 1024 ? ' ('+ numeral(totalSize).format('0.00 b') +')' : '' ) +nl +nl;
                    $("#files-tab").html( nbFilesHtml );
                    $("#files pre").html( totSize + t.FileSize +nl );
                    $("#stats-tab").html( t.results );
                    //$("#stats").html( "" );
                }
                
                // Apply acceptRejectFilters if any...
                // --------------------------------------------------
                
                let nbFilters     = acceptRejectFilters.length,
                    withARFilters = nbFilters > 2;

                if( withARFilters ) {                                                                               // If no acceptRejectFilters, update files tab as well with found files...

                    let matchfiles = [],
                        total      = bigData_Files.length,
                        initArrStr = { ln1:t.data.searching, ln2:( t.data.foundOn   + numeral(total).format('0,0') +t.data.files +" - "+ numeral(nbFolders).format('0,0') +t.data.folders ) };
                        
                    initArrStr = { ln1:t.data.searching, ln2:( t.data.foundFF[0]+ numeral(total).format('0,0') +t.data.foundFF[1]  + numeral(nbFolders).format('0,0') +t.data.foundFF[2] ) };
                        
                    if( showProgressBar ) { progressBar.init( total, initArrStr );  await wait(1); }
                    
                    acceptRejectFilters[0][0] = subtopicFilter;
                    searchToken.reset();
                    ARm = await getAcceptRejectMatch( bigData_Files, acceptRejectFilters, searchToken )   // Get Accept/Reject filtered filess
                                    .then( (data) => { return data } )
                                    .catch( (err) => {
                                        if( !searchToken.token.cancelledSearch ) { console.log( "### Err : ", nl, err ); }
                                    });
                    
                    // Reset matched filesInFolders to merge
                    nbFiles         = 0;
                    filesInFolders  = { matched: [], stats: { matched: { nbFiles:0,totSize:0 } } };
                    ARm.matched.forEach( (match) => { 
                        $.merge(filesInFolders.matched, match);
                        nbFiles += match.length;
                    });
                    filesInFolders.stats = ARm.stats;
                    nbFilesHtml = plural(t.file,   nbFiles,   '0,0', W.CR);
                    
                    updateFilesTab( filesInFolders, withARFilters );
                }
                else {

                    updateFilesTab( filesInFolders );
                }
                /*#*/if( DEBUG ){ console.log('filesInFolders',filesInFolders); };/*#*/
                
                $("#logger").html( ( nbFiles < 1 ) ? t.searchHits[0] : nbFoldersHtml +" "+t.contains[0]+" "+ plural(t.file, nbFiles, '0,0', W.CR) );

                setGUIstate(GUI.STATE_READY);
                setGUIstate(GUI.STATE_FOUND);
                $("#logs").show();

                /*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/
            }
            
            
            // ---------------------------------------------------------------------
            //
            // updateResultsStatistics
            // Update results statistics for results Tab
            
            function updateResultsStatistics( files, size ) {
                
                statistics.results.files = files == 0 ? "": numeral(files).format('0,0');
                statistics.results.size  = size  == 0 ? "": "("+numeral(size).format('0.00 b')+")";
                statistics.results.str   = files < 2  ? t.searchHits[ files ] : t.searchHits[2] ;
                
            }


            // ---------------------------------------------------------------------
            //
            // updateResults
            // Update content of Results Tab
            
            function updateResultsTab() {
//                 let DEBUG = true;
            /*#*/if( DEBUG ){ console.group(me()); logMe('-','-'); console.log('>>> statistics[', statistics, ']'); };/*#*/
                
                let numFolders = statistics.catalog.folders,
                    numFiles   = statistics.catalog.files,
                    strFolders = plural( t.folder, -numFolders ),
                    strFiles   = plural( t.file,   -numFiles   );
                    
                numFolders = numeral(numFolders).format('0,0');
                numFiles   = numeral(numFiles).format('0,0');
                
                // --------------------------------------
                // Selected Catalog
                // --------------------------------------
                let tbody_catalog = `
                    <tbody id="catalogue">
                        <tr><th colspan="4" class="title">${t.data.table.catalogue} [ ${statistics.catalog.name} ]</th></tr>
                        <tr class="c-bleu"><td></td><td>${numFiles}<br>${numFolders}</td><td colspan="2"> ${strFiles} <br> ${strFolders}</td></tr>
                    </tbody>`;
                
                // --------------------------------------
                // Search filters
                // --------------------------------------
                // Subtopics
                let tr_findings = "";
                for( let n = 0; n < statistics.search.subtopic.length; n++ ) {
                    let numFolders = statistics.search.subtopic[n].matched.folders,
                        numFiles   = statistics.search.subtopic[n].matched.files,
                        strFolders = numFolders == 0 ? t.noFolders : plural( t.folder, -numFolders ),
                        strFiles   = numFiles   == 0 ? t.noFiles   : plural( t.file,   -numFiles   );
                        
                    numFolders = numFolders == 0 ? "" : numeral(numFolders).format('0,0');
                    numFiles   = numFiles   == 0 ? "" : numeral(numFiles).format('0,0');
                    tr_findings   += `
                        <tr class="sub"><td>${t.data.table.subtopic}</td><td>${numFiles}<br>${numFolders}</td><td>${ strFiles }<br>${ strFolders } &nbsp;</td><td>&nbsp; ${statistics.search.subtopic[n].filter}</td></tr>`;
                }
                
                // Accepts - Rejects
                if( statistics.search.accept_reject ) {
                    let lastAcceptReject = statistics.search.accept_reject.length - 1,
                        color, choice, files, size, elem, filter, plural;
                    for( let n = 1; n < statistics.search.accept_reject.length; n++ ) {
                        if( statistics.search.accept_reject[n].accept ) {
                            color  = ' class="c-vert"';
                            choice = t.data.table.accepted;
                            files  = statistics.search.accept_reject[n].matched.files;
                            size   = statistics.search.accept_reject[n].matched.totalSize;
                        }
                        else {
                            color  = ' class="c-rouge"',
                            choice = t.data.table.rejected,
                            files  = statistics.search.accept_reject[n].unmatch.files,
                            size   = statistics.search.accept_reject[n].unmatch.totalSize;
                        }
                        plural = files > 1 ? "s":"";
                        files  = numeral(files).format('0,0');
                        filter = n < lastAcceptReject ? statistics.search.accept_reject[n].filter : "";
                        elem   = t.file+plural; // n < lastAcceptReject ? t.file+plural : t.data.table['unmatch'+plural];
                        tr_findings  += `
                        <tr${color}><td>${choice}</td><td>${files}</td><td>${elem} (${ numeral(size).format("0.00 b") }) &nbsp;</td><td>&nbsp; ${filter}</td></tr>`;
                    }
                }

                let tbody_search = `
                    <tbody id="search">
                        <tr class="tr"><th class="th1" colspan="2">${t.data.table.search}</th><th class="th2">${t.data.table.results}</th><th class="th2">${t.data.table.filter}</th></tr>
                        ${tr_findings}
                    </tbody>`;
                
                // --------------------------------------
                // Results
                // --------------------------------------
                let tbody_results = "";
                if( statistics.search.accept_reject ) {
                    tbody_results = `
                    <tbody id="results">
                        <tr><th colspan="4" class="title">${t.data.table.summary}</th></tr>
                        <tr><td></td><td>${statistics.results.files}</td><td colspan="2"> ${statistics.results.str} ${statistics.results.size}</td></tr>
                    </tbody>`;
                }
                    
                // --------------------------------------
                // Table wrap
                // --------------------------------------
                let table = `
                <table id="table">
                    ${tbody_catalog}
                    ${tbody_search}
                    ${tbody_results}
                </table>`;
                
                $("#stats").html( table );
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
            /** /
            /**/
            function optimizeMultipartRanges( multipartRanges ) {
//                let DEBUG = true;
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
                    let r = [];
                    for( let rangeNo = 0; rangeNo < newByteRange.length; rangeNo++ ){
                        
                        let byteRangeStart = newByteRange[rangeNo][0],
                            byteRangeStop  = newByteRange[rangeNo][1],
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
                        for( n = 0; n < r.length; n += 2 ) {
                            rr.push( [r[n], r[n+1]] );
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
                
                /*#*/if( DEBUG ){ console.log('newByteRange',newByteRange,nl,nl,"allRanges",allRanges,nl,"slicedRange",slicedRange);};/*#*/
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

            Array.prototype.forEachAsync = function(fn) {
                return this.reduce((promise, n) => promise.then(() => fn(n)), Promise.resolve());
            };


            // ---------------------------------------------------------------------
            // 
            // Document events handlers
            
            $(document).
            
                on('keyup mouseout', '.input-subtopic', function(e){
                    let AMQPfilter = $(this).val();
                    if( $.trim(AMQPfilter) !== "" && e.type === "mouseout" ) {
                        setFilterSubtopic( "enable" );
                    }
                    else {
                        let isValidFilter = isValidAMQP(AMQPfilter);
//                         $("#logs").hide();
                        $("#logger").html("&nbsp;");
                        if (e && (e.which === $.ui.keyCode.ESCAPE || $.trim(AMQPfilter) === "") ) { setFilterSubtopic( "reset" ); }
                        else {
                            let allFilters = getFilters();
                            setFilterSubtopic( "enable" );
                            if (isValidFilter && e.which === $.ui.keyCode.ENTER) { performSearch( allFilters ); }
                        }
                    }
                    return;
                }).focus().
                
                on('keyup mouseout', '.input-accept_reject', function(e){
                    if (e.which === $.ui.keyCode.ENTER) { 
                        let allFilters = getFilters();
                        performSearch( allFilters );
                    }
                    return;
                }).focus().
                
                on('click', '#folders .tree li', function(e) {
                    let me = $(this);
                    $('.tree').find('.active').removeClass('active');
                    $(me).addClass('active');
                    $(".input-subtopic").val( path2AMQP( $(me).text() ) ).focus();
                    setFilterSubtopic( "enable" );
                }).
                
                on('click', '.btn-topic', function(e) {
                    $(".label-topic").data('label',$(this).data('label'));
                    $("#btnSearch").click();
                }).

                on('click', '#help-topic, #help-subtopic, .help-accept_reject, .help-accept_unmatch', function(e) {
                    BSDialog( $(this).data('infos'), $(this).data('title'), );
                }).
                
                on('click', '.btn-add', function(e) {
                    e.preventDefault();
                    let acceptReject = $('.input-accept_reject'),
                        controlForm  = $('.accepts-rejects .filters:last'),
                        currentEntry = $(this).parents('.entry:last'),
                        currentState = currentEntry.find('.btn-accept-regex').hasClass('active') ? 'accept':'reject',
                        newEntry     = $(currentEntry.clone()).appendTo(controlForm),
                        nextEntryID  = function (){
                                            let ids = [];
                                            for( let i =0; i<acceptReject.length; i++ ) ids.push( acceptReject[i].id );
                                            return ("input-accept_reject__" + parseInt(ids.sort().pop().split("__").pop()) + 1);
                                        };
                    newEntry.find('label:first').attr('for',nextEntryID);
                    newEntry.find('.help-accept_reject').attr("title", t.help.tip).data("title", t.help.title.acceptReject).data("infos", t.help.infos.acceptReject).tooltip();
                    newEntry.find('.input-accept_reject').val('').data('ar',currentState).attr('id',nextEntryID);
                    controlForm.find('.entry:not(:first) .btn-add')
                        .removeClass('btn-add').addClass('btn-remove')
                        .removeClass('btn-success').addClass('btn-danger')
                        .html('<span class="glyphicon glyphicon-minus"></span>');
                }).
                on('click', '.btn-remove', function(e) {
                    $(this).parents('.entry:last').remove();
                    e.preventDefault();
                    return false;
                }).
                
                on('click', '.btn-accept-regex', function(e) {
                    let dude = $(this).closest(".entry");
                    dude.find('.label-accept_reject').html(wrap(t.accept, W.cV) +t.comma);
                    dude.find('.input-accept_reject').data("ar","accept");
                    $("#btnSearch").click();
                }).
                on('click', '.btn-reject-regex', function(e) {
                    let dude = $(this).closest(".entry");
                    dude.find('.label-accept_reject').html(wrap(t.reject, W.cR) +t.comma);
                    dude.find('.input-accept_reject').data("ar","reject");
                    $("#btnSearch").click();
                }).
                
                on('click', '.btn-accept-unmatch', function(e) {
                    $("#btn-accept_unmatch").data('accept_unmatch','True');
                    $(".label-accept_unmatch").html(wrap(t.accept, W.cV) +t.comma);
                    $("#btnSearch").click();
                }).
                on('click', '.btn-reject-unmatch', function(e) {
                    $("#btn-accept_unmatch").data('accept_unmatch','False');
                    $(".label-accept_unmatch").html(wrap(t.reject, W.cR) +t.comma);
                    $("#btnSearch").click();
                }).
                
                on('click', '#btnCopy', function() {
                    copyToClipboard( $("#config").text() );
                }).
                
                on('click', '#btnSearch', function() {                          // Do search products
                    
                    if( GUIstate == GUI.STATE_SEARCHING ) {
                        
                        console.log()
                        BSDialogPrompt( t.wait.cancelSearch, t.wait.searchInProgress, "type-danger" );
                    }
                    else {
                        
                        let allFilters = getFilters();
                        if( isValidAMQP(allFilters[0][0]) && !$(this).hasClass('disabled') ) {
                            performSearch( allFilters );
                        }
                        else {
                            BSDialog( t.err_amqp.filtr, t.error, "type-warning" );
                        }
                    }
                }).
                
                on('click', '#btnSearchReset', function() {                     // Do reset search
                    if( ! $(this).hasClass('disabled') ) {
                        setFilterSubtopic( "reset" );
                    }
                }).
                
                on('click', '#switchLang', function() {                         // Switch langue
                    switchLangue(this);
                }).
                
                on('click', '.notif-cookies .fa.fa-times-circle', function() { // Register cookies & close notification
                    $.cookie( 'cookies', 'notified', {expires:365} );
                    $(".notif-cookies").hide();
            });
            
            $(function() {
                $(window).scroll( function () {
                    if( $(this).scrollTop() > 100 ) {
                        $('#back-to-top').fadeIn();
                    } else {
                        $('#back-to-top').fadeOut();
                    }
                });
                // scroll body to 0px on click
                $('#back-to-top').click( function () {
                    $('body,html').animate( {scrollTop: 0}, 500 );
                    return false;
                });
            });

            
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
                                label: t.dialog.btn.ok,
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
                    // BSDialogPrompt();
                    BootstrapDialog.show({
                        title:    dTitle,
                        message:  wrap( dMessage ),
                        type:     dType,
                        size: BootstrapDialog.SIZE_SMALL,
                        closable: false,
                        buttons: [{
//                             label: t.dialog.btn.cancel,
                            label: t.dialog.btn.stopSearch,
                            cssClass: 'btn-danger btn-sm',
                            action: function(dialog){
                                searchToken.cancelSearch();
                                dialog.close();
                            }
                        }, {
//                             label: t.dialog.btn.continue,
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
                let filters = [ [$(".input-subtopic").val(), true] ];
                
                // Add to the list all other Regex filters provided by the user
                $( ".input-accept_reject" ).each( (index, item) => { let filter = $(item).val(); if( filter ) filters.push( [filter,$(item).data('ar')==='accept'] ); });
                
                // The last item of the list is accept_unmatch value 
                filters.push( ['.*', $("#btn-accept_unmatch").data('accept_unmatch')==='True'] );
                
                return filters;
                
            }
            
            
            /**/
            // ---------------------------------------------------------------------
            // 
            // https://coderwall.com/p/kvzbpa/don-t-use-array-foreach-use-for-instead
            // 
            Array.prototype.forEach2 = function(a) {
                let l = this.length;
                for(let i=0; i<l; i++) a( this[i], i );
            }
            Array.prototype.forEachFromTo = function(a, inn=0, out=this.length) {
                let DEBUG = false;
            /*#*/if( DEBUG ){ console.group(me()); console.log('a  : ',a,'\ninn: ',inn,'\nout: ',out);};/*#*/
                out = ( out < 0 ) ? 0 : (( out > this.length ) ? this.length : out);
                inn = ( inn < 0 ) ? 0 : (( inn > out ) ? out : inn );
                for(let i=inn; i<out; i++) a( this[i], i );
            }
            /**/
            
            // ---------------------------------------------------------------------
            // 
            // updateFoldersTab
            // Update folders' tab with title as well as its page with text

            function updateFoldersTab( folders ) {
            /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('folders :',nl,folders);};/*#*/
                
                $("#folders-tab").html( (folders.length > 0 ? plural(t.Folder, folders.length, '0,0', W.cV) : t.noFolders) );
                $("#folders-tab").data( "display" ).total = folders.length;
                
                showMoreFolders( folders, true );
                
            /*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/
            }
            
            $(window).scroll(function() {
                
                if( $(window).scrollTop() == ( $(document).height() - $(window).height() ) ) {
                    if( $("#folders-tab").parent().hasClass("active") )
                        showMoreFolders( bigData_Folders );
                    else if( $("#files-tab").parent().hasClass("active") )
                        showMoreFiles( bigData_Files );
                }
            });

            // ---------------------------------------------------------------------
            //
            // _init_data_tabs
            // Use data object to store information about folders/files to display
            
            function _init_data_tabs(nbFolders=0, nbFiles=0) {
                
                resetDataDisplay("#folders-tab", nbFolders);
                resetDataDisplay("#files-tab",   nbFiles);
            }
            
            function resetDataDisplay( obj, total=0, shown=0, lines=1000 ) {
//                let DEBUG = true;
            /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('obj['+obj+'] total=['+total+'], shown=['+shown+'], lines['+lines+']');};/*#*/
                lines = total > 1000 ? 1000 : total;
                $(obj).data("display", { total:total,shown:shown,lines:lines });
            /*#*/if( DEBUG ){ console.timeEnd( "   " ); logMe('-','-'); console.groupEnd();};/*#*/
            }

            function setLogger( obj, nbFolders, nbFiles ) {
//                let DEBUG = true;
                /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('obj['+obj+'] nbFolders['+nbFolders+'] nbFiles=['+nbFiles+']');};/*#*/
                $(obj).data("display", { total:total,shown:shown,lines:lines });
                /*#*/if( DEBUG ){ console.timeEnd( "   " ); logMe('-','-'); console.groupEnd();};/*#*/
            }
            
            // ---------------------------------------------------------------------
            //
            // showMoreFolders
            // Add more content to the container
                
            function showMoreFolders( folders, replace=false ) {
                let DEBUG = false;
            /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('folders :',nl,folders);};/*#*/
                
                if( replace ) $("#folders-tab").data("display").shown = 0;

                let display = $("#folders-tab").data("display");
                if( display.shown < display.total ) {

                    let lines = "", de = display.shown, a = de + display.lines;

                    // build content & update container
                    folders.forEachFromTo( (folder) => { lines += '<li>'+ folder.dir +'</li>'; }, de, a );
                    ( replace ) ? $("#folders .tree").html( lines ) : $("#folders .tree").append( lines );
                    
                    display.shown += display.lines;
                    $("#folders-tab").data("display",display);                                   // update next starting point
             
            /*#*/if( DEBUG ){ console.log(me(),'>>>>>>> FOLDER > de['+de+'] a['+a+'] lines[\n'+lines+'\n]folders :\n',folders);};/*#*/
                }
            /*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/
            }
            
            // ---------------------------------------------------------------------
            //
            // showMoreFiles
            // Add more content to the container
                
            function showMoreFiles( files, replace=false ) {
//                 let DEBUG = true;
            /*#*/if( DEBUG ){ console.group(me()); console.time( "   " ); console.log('files :',nl,files);};/*#*/
                
                if( replace ) $("#files-tab").data("display").shown = 0;

                let display = $("#files-tab").data("display");
                if( display.shown < display.total || replace !== false ) {
                    
                    let lines = "", de = display.shown, a = de + display.lines;

                    // build content & update container
                    files.forEachFromTo( (file) => { lines += file.size.toString().padStart(11) +" "+ file.path +nl; }, de, a);
//                     ( replace ) ? $("#files pre").html( lines ) : $("#files pre").append( lines );
                    $("#files pre").append( lines );
                    
                    display.shown += display.lines;
                    $("#files-tab").data("display",display);                                   // update next starting point
             
            /*#*/if( DEBUG ){ console.log(me(),'>>>>>>> FILES > de['+de+'] a['+a+'] files :',nl,files,'\nbigData_Files :',nl,bigData_Files);};/*#*/
                }
            /*#*/if( DEBUG ){ console.timeEnd( "   " ); console.groupEnd(); logMe('-','-');};/*#*/
            }
            
            // ---------------------------------------------------------------------
            // 
            // updateFilesTab
            // Update files' tab with title as well as its page with text

            function updateFilesTab( filesInFolders, withAcceptRejectFilters = false ) {
//                 let DEBUG = true;
            /*#*/if( DEBUG ){ console.group('in -> '+me()); console.time( "   " ); console.log('>>> filesInFolders wFilters['+withAcceptRejectFilters+']',nl,filesInFolders,nl,'>>> bigData_Files :',nl,bigData_Files); };/*#*/
                
                if( filesInFolders.matched ) {

                    let tabTag  = "",
                        header  = nl+nl+ t.FileSize +nl,
                        files   = "",
                        totSize = 0,
                        nbFiles = 0;
                        
                    if( withAcceptRejectFilters ) {
                        filesInFolders.matched.forEach( file => { 
                            files   += file.size.toString().padStart(11) +" "+ file.path +nl;
                            totSize += file.size;
                            nbFiles ++;
                        });
                        
                        tabTag = nbFiles   > 0 ? plural(t.File,   nbFiles,   '0,0', W.cR) : nbFiles == 0 ? t.noFiles : "";
                        header = t.totalSize +t.comma+ totSize +" "+ t.bytes + (totSize > 1024 ? ' ('+ numeral(totSize).format('0.00 b') +')' : '' ) + header;
                        
                        bigData_Files = buildBigDataFiles(filesInFolders, withAcceptRejectFilters);
                        
                    }
                    else {

                        tabTag = filesInFolders.stats.matched.nbFiles > 0 ? plural(t.File, filesInFolders.stats.matched.nbFiles, '0,0', W.cR) : filesInFolders.stats.matched.nbFiles == 0 ? t.noFiles : "";
                        header = t.totalSize +t.comma+ filesInFolders.stats.matched.totSize +" "+ t.bytes + (filesInFolders.stats.matched.totSize > 1024 ? ' ('+ numeral(filesInFolders.stats.matched.totSize).format('0.00 b') +')' : '' ) + header;
                        
                    }
                    
                    updateResultsStatistics( nbFiles, totSize );
                    updateResultsTab();
                    
                    $("#files-tab").html( tabTag );
                    $("#files pre").html( header );

                    showMoreFiles( bigData_Files, true );
            /*#*/if( DEBUG ){ console.log('>>> filesInFolders wFilters['+withAcceptRejectFilters+']',nl,filesInFolders,nl,'>>> bigData_Files :',nl,bigData_Files); console.groupEnd(); };/*#*/
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
                        
                        $("#btnSearch").removeClass('disabled');
                        $("#btnSearchReset").removeClass('disabled');
                    break;
                    case "disable" :
                        
                        $("#btnSearch").html(t.g_search + t.search).addClass('disabled');
                        $("#btnSearchReset").addClass('disabled');
                    break;
                    case "reset" :
                        
                        resetDataDisplay( "#folders-tab", bigData_Folders.length );
                        $("#folders-tab").data("display").shown = 0;
                        $("#files-tab").data("display").shown = 0;
                        setFilterSubtopic( "disable" );
                        setGUIstate(GUI.STATE_RESET);
                        updateFoldersTab( bigData_Folders );
                        if( $('#input-subtopic').val() == "" ) {
                            $("#files-tab").addClass('hidden');
                            $("#stats-tab").addClass('hidden');
                        }
                        setGUIstate(GUI.STATE_READY);
                    break;
                    default : // what happened here ?
                        console.log(t.err_subtopicState +" ["+ state +"]")
                }
                
            }
            

            // ---------------------------------------------------------------------
            // 
            // setGUIstate
            // 

            function setGUIstate( thisState = GUI.STATE_READY ) {
                
                if( GUIstate != thisState ) {
                
                    GUIstate = thisState;
                    switch (thisState) {
                        
                        case GUI.STATE_FOUND: 
                            document.body.style.cursor = 'default';                           
                            $("#btnCopy").removeClass("hidden");
                            $("#btnSearch").html(t.g_search + t.search);
                            $("#files-tab").removeClass('hidden');
                            $("#stats-tab").removeClass('hidden');
                            $("#files-tab").trigger('click');
                            break;
                            
                        case GUI.STATE_LOADING: 
                            document.body.style.cursor = 'wait';
                            $("#tabs .nav-tabs").show();
                            $("#msg").hide();
                            $("#sarra-formula").removeClass('hidden');
                            $("ui.tree").show();
                            $(".input-subtopic").val("");
                            $("#folders-tab").trigger('click');
                            break;
                            
                        case GUI.STATE_RESET: 
                            document.body.style.cursor = 'wait';
                            $(".input-subtopic").val("");
                            $("#files-tab").html(wrap( t.noFiles, W.cG ));
                            $("#folders-tab").trigger('click');
                            $("#files pre").html( "" );
                            break;
                            
                        case GUI.STATE_SEARCHING: 
                            document.body.style.cursor = 'wait';
                            $("#folders-tab").trigger('click');
                            $("#btnSearch").html(t.f_superp + t.cancel);
                            break;
                            
                        case GUI.STATE_READY: 
                        default:
                            document.body.style.cursor = 'default';                           
                    }
                }
            }


            // ---------------------------------------------------------------------
            // 
            // setCookie
            // 

            function setCookie() {
                
                lang = ( lang == "fr" ? "en":"fr" );
                $.cookie( "lang",lang );
                
            }

            
            // ---------------------------------------------------------------------
            // 
            // switch language
            // 
            
            function switchLangue() {
                
                lang = ( lang == "fr" ? "en":"fr" );
                $.cookie( "lang",lang );
                location.reload(); //_initialize_();
                
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
                            text  += ( msg ) ? ( pad.repeat(n-text.length) + nl +" ".repeat(pad.length + 2) + "- "+msg ) : pad.repeat(n - text.length);
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
