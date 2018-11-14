<?php /* PHP STUFF
    ========================================================
    -[ index.php ]------------------------------------------
    ========================================================

    Author        : Daniel Léveillé
                    SSC-SPC - Gouvernement du Canada
    created       : 2017-08-24 08:00:00
    last-modified : 2018-11-13 12:44:58

    +------------------------------------------------------+
    | IMPORTANT NOTE:                                      |
    +------------------------------------------------------+
    | This index.php file is for development purpose only. |
    | The goal is to deploy a completely static website.   |
    | Thus, in PROD, the final index file is index.html    |
    +------------------------------------------------------+
    */

    $v = '?v'.date("YmdHis"); /* TODO remove this DEV snippet used to clear cache */
    ?>
<!DOCTYPE html>
<html>
<?php /* HEAD
        -------------------------------------------------------------------- */ ?>
    <head>
        <title>Sarracenia Semina</title>
        <meta charset="utf-8">

        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=BenchNine:700|Teko:500|Open+Sans|Open+Sans+Condensed:300|Ubuntu+Mono">
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.4/css/bootstrap-select.min.css">
        
        <link rel="stylesheet" href="/js/plugins/bootstrap3-dialog/css/bootstrap-dialog.min.css">
        <link rel="stylesheet" href="/js/plugins/clusterize/clusterize.css<?= $v ?>">
        <link rel="stylesheet" href="/js/plugins/selectize/css/selectize.default.css<?= $v ?>">

        <link rel="stylesheet" href="/css/style.css<?= $v ?>">
        <script>
            // if we have less than IE Edge, redirect to incompatible page
            var unSupported_IE = (/msie\ [0-9]{1}|Trident\/[7]{1}/i.test(navigator.userAgent));
            if( unSupported_IE ) { window.location.href = 'incompatible-ie.html'; }
        </script>
    </head>
<?php /* BODY
        -------------------------------------------------------------------- */ ?>
    <body>
<?php /*    HELPERS
            Modal Dialog - https://nakupanda.github.io/bootstrap3-dialog/#available-options
            -------------------------------------------------------------------- */ ?>
        <div class="modal fade">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
                        <h4 class="modal-title"></h4>
                    </div>
                    <div class="modal-body">
                        <p>One fine body…</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-default" data-dismiss="modal"></button>
                        <button type="button" class="btn btn-primary"></button>
                    </div>
                </div>
            </div>
        </div>
        <div class="notif-cookies">
          <span class="msg"></span> &nbsp; <a><i class="fa fa-times-circle" aria-hidden="true"></i></a>
        </div>
<?php /*    TOP LOGO
            -------------------------------------------------------------------- */ ?>
        <div id="docs" class="row page">
            <div class="row">
                <div class="col-sm-4 top-logo">
                    <img height="26" src="/img/sig-blk-fr.svg"/>
                </div>
                <div class="col-sm-4 top-text"></div>
                <div class="col-sm-4 top-btns text-right">
                    <span style="white-space: nowrap">
                        <button type="button" class="btn btn-default btn-sm help" id="about" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="" data-help="about" tabindex="-1">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</button>                    
                        <button type="button" class="btn btn-default btn-sm" id="switchLang" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="" tabindex="-1">&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;</button>
                    </span>
                </div>
            </div>
        </div>
<?php /*    PANE TABS
            -------------------------------------------------------------------- */ ?>
        <div id="tabs" class="row page">
            <div id="logs" class="col-sm-12">
                <div id="msg">
                    <noscript>
                        <h2>Your browser does not support JavaScript!<br><small>You need to enable JavaScript to use this website!</small></h2>
                        <h2>JavaScript n'est pas activé sur votre navigateur !<br><small>Vous devez l'activer pour utiliser les fonctions de ce site web!</small></h2>
                    </noscript>
                </div>
                <p id="logger"></p>
            </div>
            <ul class="nav nav-tabs">
                <li><a class="hidden" id="editor-tab" href="#editor" data-toggle="tab" tabindex="-1"></a></li>
                <li><a class="hidden" id="stats-tab"  href="#stats"  data-toggle="tab" tabindex="-1"></a></li>
                <li><a class="hidden" id="topics-tab" href="#topics" data-toggle="tab" tabindex="-1"></a></li>
                <li><a class="hidden" id="files-tab"  href="#files"  data-toggle="tab" tabindex="-1"></a></li>
            </ul>

<?php /*        BUILDER PANE
                User creates its Sarra Config here
                -------------------------------------------------------------------- */ ?>
            <div class="tab-content clearfix">
                <div id="editor" class="tab-pane">
                    <div id="sarra-formula">
                        <div class="row">
                            <div class="sarra-configs col-xm-12 accepts-rejects">
                                <table>
<?php /*            CATALOGUE
                    -------------------------------------------------------------------- */ ?>
                                    <tr class="line catalogue">
                                        <td class="tag"><label class="catalogue">Catalogue : </label></td>
                                        <td>
                                            <div>
                                                <div class="selects input-group input-group-sm">
                                                    <span class="help catalogues input-group-addon" data-help="catalogues" data-toggle="tooltip" data-placement="right"><i class="fa fa-question-circle" aria-hidden="true"></i></span>
                                                    <div id="catalogues"></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
<?php /*            CONFIGURATIONS
                    -------------------------------------------------------------------- */ ?>
                                    <tr class="line filters">
                                        <td class="tag"><label class="configuration" data-label="unchecked">Config: </label></td>
                                        <td>
                                            <div class="btns input-group pull-left">
                                                <div class="input-group input-group-sm">
                                                    <span class="help case-insensitive input-group-addon" data-help="case-insensitive" data-toggle="tooltip" data-placement="bottom"><i class="fa fa-question-circle" aria-hidden="true"></i></span>
                                                    <div class="btn-group btn-group-sm" data-toggle="buttons">
                                                        <div class="include">
                                                            <div class="btns input-group input-group-sm">
                                                                <span class="input-group-addon"><i class="fa fa-check text-primary"></i></span>
                                                                <button id="btn-case-insensitive" type="checkbox" class="btn-default btn-sm" tabindex="-1">Case insensitive</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <div class="btns input-group input-group-sm">
                                                    <span   class="help load_example input-group-addon" data-help="load_example" data-toggle="tooltip" data-placement="bottom"><i class="fa fa-question-circle" aria-hidden="true"></i></span>
                                                    <button id="btn-load_example" class="btn-default btn-sm">Configurations... <i class="fa fa-file-text-o" aria-hidden="true"></i></button>
                                                </div>
                                            </div>
                                            <div>
                                                <div class="btns input-group input-group-sm">
                                                    <span   class="help reset input-group-addon" data-help="reset_configs" data-toggle="tooltip" data-placement="bottom"><i class="fa fa-question-circle" aria-hidden="true"></i></span>
                                                    <button id="btn-reset"          class="btn-default btn-sm">Reset...</button>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                <hr>
                                <table>
<?php /*            TOPIC
                    -------------------------------------------------------------------- */ ?>
                                    <tr class="line topic">
                                        <td class="tag"><label class="label-topic" data-label="v02.post">Topic: </label></td>
                                        <td>
                                            <div>
                                                <div class="input-group input-group-sm">
                                                    <span id="help-topic" class="help topic input-group-addon" data-help="topic" data-toggle="tooltip" data-placement="right"><i class="fa fa-question-circle" aria-hidden="true"></i></span>
                                                    <div class="btn-group btn-group-sm" data-toggle="buttons">
                                                        <span id="btn-topic" class="input-group-btn btn-group-sm" data-selected="post" data-toggle="buttons">
                                                            <button class="btn btn-default btn-topic post active" data-selected="post" checked tabindex="-1">
                                                                <input type="radio" name="options">
                                                                <i aria-hidden="true" class="fa fa-circle-thin unchecked"></i>
                                                                <i aria-hidden="true" class="fa fa-check-circle-o checked"></i>
                                                                post
                                                            </button>
                                                            <button class="btn btn-default btn-topic report" data-selected="report" tabindex="-1">
                                                                <input type="radio" name="options">
                                                                <i aria-hidden="true" class="fa fa-circle-thin unchecked"></i>
                                                                <i aria-hidden="true" class="fa fa-check-circle-o checked"></i>
                                                                report
                                                            </button>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
<?php /*            SUBTOPIC FILTERS - AMQP RULES
                    -------------------------------------------------------------------- */ ?>
                                    <?php /** / ?>
                                    Selectize
                                    --------------------------------------------------------------------
                                    <?php /**/ ?>
                                    <tr id="err-subtopic"><td> </td><td class="err"> </td></tr>
                                    <tr class="line subtopic">
                                        <td><label class="label-subtopic" for="input-subtopic">Subtopic2: </label></td>
                                        <td>
                                            <div>
                                                <div class="subtopic filter input-group input-group-sm">
                                                    <span  id="help-subtopic" class="help subtopic input-group-addon" data-help="subtopic" data-toggle="tooltip" data-placement="right"><i class="fa fa-question-circle" aria-hidden="true"></i></span>
                                                    <input id="subtopics-input" class="subtopic" placeholder="Sélectionner un catalogue pour procéder..." value="" disabled />
                                                    <span class="input-group-addon"><button id="btnResetSubtopic" class="input-group-addon" disabled tabindex="-1"><span class="glyphicon glyphicon-remove"></span></button></span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <?php /** / ?>
                                    --------------------------------------------------------------------
                                    Selectize
                                    <?php /**/ ?>
                                </table>
                                <hr>
<?php /*            MATCHED  FILTERS - REGEX RULES NEW
                    -------------------------------------------------------------------- */ ?>
                                <table id="match-filters">
                                    <tr class="match entry">
                                        <td class="tag">[Auto]</td>
                                        <td>
                                            <div class="input-group input-group-sm">
                                                <span class="help match input-group-addon" data-help="match" data-toggle="tooltip" data-placement="right"><i class="fa fa-question-circle" aria-hidden="true"></i></span>
                                                <div class="filter">
                                                    <span class="input-group-btn btn-group-sm" id="match-btn__1" data-toggle="buttons">
                                                        <button class="match status accept btn btn-success active" data-status="accept" tabindex="-1">
                                                            <input type="radio" data-toggle="button" name="match" tabindex="-1">
                                                            <i aria-hidden="true" class="fa fa-thumbs-o-up"></i>
                                                        </button>
                                                        <button class="match status reject btn btn-default" data-status="reject" tabindex="-1">
                                                            <input type="radio" data-toggle="button" name="match" tabindex="-1">
                                                            <i aria-hidden="true" class="fa fa-thumbs-o-down"></i>
                                                        </button>
                                                    </span>
                                                    <input class="match input text form-control" id="match-input__1" type="text" data-status="accept" placeholder="..." aria-label="..." />
                                                    <span class="add-remove input-group-btn">
                                                        <button class="btn btn-default btn-remove" tabindex="-1" type="button"><span class="glyphicon glyphicon-minus c-rouge"></span></button>
                                                        <button class="btn btn-default btn-add"    tabindex="-1" type="button"><span class="glyphicon glyphicon-plus  c-vert"></span></button>
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                <hr>
<?php /*            UNMATCH  FILTERS - NEW
                    -------------------------------------------------------------------- */ ?>
                                <table>
                                    <tr class="unmatch entry">
                                        <td class="tag">[Auto]</td>
                                        <td>
                                            <div class="input-group input-group-sm">
                                                <span class="help unmatch input-group-addon" data-help="accept_unmatch" data-toggle="tooltip" data-placement="right"><i class="fa fa-question-circle" aria-hidden="true"></i></span>
                                                <div id="unmatch-status" data-status="reject" class="btn-group btn-group-sm" data-toggle="buttons">
                                                    <button class="unmatch status btn accept btn-default" data-status="accept" data-value="True" tabindex="-1">
                                                        <input type="radio" data-toggle="button" name="unmatch">
                                                        <i aria-hidden="true" class="fa fa-thumbs-o-up"></i>
                                                    </button>
                                                    <button class="unmatch status btn reject btn-danger active" data-status="reject" data-value="False" tabindex="-1">
                                                        <input type="radio" data-toggle="button" name="unmatch">
                                                        <i aria-hidden="true" class="fa fa-thumbs-o-down"></i>
                                                    </button>
                                                </div>
                                            </div>
                                            <button id="btnSearch" class="btn btn-default btn-sm pull-right" disabled><span class="glyphicon glyphicon-search"></span> Chercher</button>
                                        </td>
                                    </tr>
                                </table>
<?php /*            PROGRESS BAR
                    -------------------------------------------------------------------- */ ?>
                                <div class="progress">
                                    <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                    <br>
                                    <span class="info pull-left"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="folders" class="tab-pane cluster-ol"></div>
                </div>
<?php /*        RESULT PANES
                    -------------------------------------------------------------------- */ ?>
                <div id="stats"   class="tab-pane"></div>
                <div id="topics"  class="tab-pane cluster-ol"></div>
                <div id="files"   class="tab-pane cluster-ol"></div>
            </div>
        </div>
        <a id="back-to-top" href="#" class="btn btn-primary back-to-top" role="button" title="Click to return on the top page" data-toggle="tooltip" data-placement="left"><span class="glyphicon glyphicon-chevron-up"></span></a>
<?php /* SCRIPTS
        -------------------------------------------------------------------- */ ?>
        <script>
            if( unSupported_IE ) {
                document.getElementById( "unSupported_IE" ).style.display = "block";
            } else {
                document.getElementById( "docs" ).style.display = "block";
                document.getElementById( "tabs" ).style.display = "block";
            }
        </script>

        <script src="//code.jquery.com/jquery-3.2.1.min.js"        integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
        <script src="//code.jquery.com/ui/1.12.1/jquery-ui.min.js" integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU=" crossorigin="anonymous"></script>
        
        <script src="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.4/js/bootstrap.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.4/js/bootstrap-select.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.4/js/i18n/defaults-fr_FR.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/numeral.js/2.0.6/numeral.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/js-polyfills/0.1.41/polyfill.min.js"></script>

        <script src="/js/plugins/bootstrap3-dialog/js/bootstrap-dialog.min.js"></script>
        <script src="/js/plugins/ua-parser.min.js"></script>
        <script src="/js/plugins/download.js"></script>
        <script src="/js/plugins/cookie/jquery.cookie.min.js"></script>
        <script src="/js/plugins/clusterize/clusterize.min.js"></script>
        <script src="/js/plugins/selectize/js/selectize.js<?= $v ?>"></script>
        <script>
            var jsonURLs = [
                '/data/', 
                '/json/ui-texts.json<?= $v ?>', 
                '/json/ui-docs.json<?= $v ?>', 
                '/json/brokers.json<?= $v ?>',
                '/json/configs.json<?= $v ?>'
                ];
        </script>
        <script src="/js/main.js<?= $v ?>"></script>
    </body>
</html> 
<?php /* EOF
        -------------------------------------------------------------------- */ ?>
