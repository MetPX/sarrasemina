<?php /*
===============================================================================
-[ sarrasemina.ca/index.php ]--------------------------------------------------
===============================================================================

    +------------------------------------------------------+
    | IMPORTANT NOTE:                                      |
    +------------------------------------------------------+
    | This index.php file is for development purpose only. |
    | The goal is to deploy a completely static website.   |
    | Thus, in PROD, the final index file is index.html    |
    +------------------------------------------------------+

Created  - 2017-08-24
Modified - 2018-04-24

Daniel Léveillé 

*/ 

$v = '?v'.date("YmdHis"); // TODO remove this DEV snippet used to clear cache

// ============================================================================
?>
<!DOCTYPE html>
<html>
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
    </head>
    <body>
<?php /*
        
        HELPERS
        
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
<?php /*

        TOP
        -------------------------------------------------------------------- */ ?>
        <div id="docs" class="row page">
            <div class="row">
                <div class="col-sm-5 title-logo">
                    <img height="26" src="/img/sig-blk-fr.svg"/>
                </div>
                <div class="col-sm-4 title-text"></div>
                <div class="col-sm-3 title-btns text-right">
                    <span style="white-space: nowrap">
                        <button type="button" class="btn btn-default btn-sm help" id="about" data-toggle="tooltip" data-placement="bottom" title="" data-original-title="" data-help="about"></button>                    
                        <button type="button" class="btn btn-default btn-sm" id="switchLang" data-toggle="tooltip" data-placement="bottom" title="" data-original-title=""></button>
                    </span>
                </div>
            </div>
        </div>
<?php /*

        BOT
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
                <li><a class="hidden" id="editor-tab" href="#editor" data-toggle="tab"></a></li>
                <li><a class="hidden" id="stats-tab"  href="#stats"  data-toggle="tab"></a></li>
                <li><a class="hidden" id="topics-tab" href="#topics" data-toggle="tab"></a></li>
                <li><a class="hidden" id="files-tab"  href="#files"  data-toggle="tab"></a></li>
            </ul>
            <div class="tab-content clearfix">
                <div id="editor" class="tab-pane">
<?php /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------*/ ?>
<?php /*

        BUILDER
        
        User create its Sarra Config here
        -------------------------------------------------------------------- */ ?>
                    <div id="sarra-formula">
                        <div class="row">
                            <div class="sarra-configs col-xm-12 accepts-rejects">
                                <table>
                                    <tr>
                                        <td>
                                            <label class="label-catalogue" for="selectCatalogue">Catalogue : </label>
                                            <span id="catalogues"></span>
                                        </td>
                                    </tr>
                                </table>
                                <hr>
                                <table>
                                    <tr>
                                        <td width="90"><label class="label-topic" data-label="v02.post">Topic: </label></td>
                                        <td>
                                            <div class="input-group input-group-sm disabled">
                                                <span id="help-topic" class="help topic input-group-addon glyphicon glyphicon-question-sign" data-help="topic" data-toggle="tooltip" data-placement="right"></span>
                                                <div class="btn-group btn-group-sm disabled" data-toggle="buttons">
                                                    <label class="btn btn-primary btn-topic active" data-label="v02.post" style="border-radius: 0;">
                                                        <input type="radio" name="options" id="option1" autocomplete="off" checked>
                                                        <i class="fa fa-circle-thin unchecked" aria-hidden="true"></i>
                                                        <i class="fa fa-check-circle checked" aria-hidden="true"></i>
                                                        post
                                                    </label>
                                                    <label class="btn btn-primary btn-topic" data-label="v02.report">
                                                        <input type="radio" name="options" id="option2" autocomplete="off">
                                                        <i class="fa fa-circle-thin unchecked" aria-hidden="true"></i>
                                                        <i class="fa fa-check-circle checked" aria-hidden="true"></i>
                                                        report
                                                    </label>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
<?php /** / ?>
                                    Selectize
                                    --------------------------------------------------------------------
<?php /**/ ?>
                                    <tr id="err-subtopic"><td> </td><td class="err"> </td></tr>
                                    <tr>
                                        <td><label class="label-subtopic" for="input-subtopic">Subtopic2: </label></td>
                                        <td>
                                            <div class="subtopic filter input-group input-group-sm disabled">
                                                <span  id="help-subtopic" class="help subtopic input-group-addon glyphicon glyphicon-question-sign" data-help="subtopic" data-toggle="tooltip" data-placement="right"></span>
                                                <input id="input-subtopics" class="subtopic" placeholder="Sélectionner un catalogue pour procéder..." value="" disabled />
                                                <span class="input-group-addon"><button id="btnSearchReset" class="input-group-addon" disabled><span class="glyphicon glyphicon-remove"></span></button></span>
                                            </div>
                                        </td>
                                    </tr>
<?php /** / ?>
                                    --------------------------------------------------------------------
                                    Selectize
<?php /**/ ?>
                                </table>
                                <hr>
                                <table class="accept_reject filters">
                                    <tr class="entry">
                                        <td width="90"><label class="label-accept_reject" for="input-accept_reject__1">Accept/Reject: </label></td>
                                        <td>
                                            <div class="input-group input-group-sm disabled">
                                                <span class="help accept_reject input-group-addon glyphicon glyphicon-question-sign" data-help="accept_reject" data-toggle="tooltip" data-placement="right"></span>
                                                <div class="filter input-group input-group-sm">
                                                    <span class="input-group-btn btn-group-sm" data-toggle="buttons">
                                                        <button class="btn btn-accept-regex btn-success active" type="btn btn-success" tabindex="-1">
                                                            <input type="radio" name="options" id="option1" autocomplete="off">
                                                            <i aria-hidden="true" class="fa fa-circle-thin unchecked"></i>
                                                            <i aria-hidden="true" class="fa fa-check-circle checked"></i>
                                                        </button>
                                                        <button class="btn btn-reject-regex btn-danger" tabindex="-1">
                                                            <input type="radio" name="options" id="option2" autocomplete="off">
                                                            <i aria-hidden="true" class="fa fa-circle-thin unchecked"></i>
                                                            <i aria-hidden="true" class="fa fa-check-circle checked"></i>
                                                        </button>
                                                    </span>
                                                    <input class="text form-control input-accept_reject" id="input-accept_reject__1" type="text" data-ar="accept" placeholder="..." aria-label="..." />
                                                    <span class="input-group-btn"><button class="btn btn-secondary btn-add" type="button" tabindex="-1"><span class="glyphicon glyphicon-plus c-vert"></span></button></span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                                <hr>
                                <table class="accept_unmatch filter">
                                    <tr>
                                        <td width="90">
                                            <label class="label-accept_unmatch" style="padding:0;">Accept: </label>&nbsp; 
                                        </td>
                                        <td style="vertical-align: top;">
                                            <div class="input-group input-group-sm disabled" style="display:inline-table; width: 100px;">
                                                <span class="help accept_unmatch input-group-addon glyphicon glyphicon-question-sign" data-help="accept_unmatch" data-toggle="tooltip" data-placement="right"></span>
                                                <div class="btn-group btn-group-sm" data-toggle="buttons" id="btn-accept_unmatch" data-accept_unmatch="False">
                                                    <label class="btn btn-accept-unmatch btn-success" tabindex="-1">
                                                        <input type="radio" name="options" id="option1" autocomplete="off">
                                                        <i aria-hidden="true" class="fa fa-circle-thin unchecked"></i>
                                                        <i aria-hidden="true" class="fa fa-check-circle checked"></i>
                                                    </label>
                                                    <label class="btn btn-reject-unmatch btn-danger active" tabindex="-1">
                                                        <input type="radio" name="options" id="option2" autocomplete="off">
                                                        <i aria-hidden="true" class="fa fa-circle-thin unchecked"></i>
                                                        <i aria-hidden="true" class="fa fa-check-circle checked"></i>
                                                    </label>
                                                </div>
                                            </div>
                                            <button class="btn btn-default btn-sm pull-right" id="btnSearch" disabled><span class="glyphicon glyphicon-search"></span> Chercher</button>
                                        </td>
                                    </tr>
                                </table>
                            <div class="progress">
                                <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                                <br>
                                <span class="info pull-left"></span>
                            </div>
                            </div>
                        </div>
                    </div>
                    
                    <div id="folders" class="tab-pane cluster-ol"></div>
<?php /* -----------------------------------------------------------------------------------------------------------------------------------------------------------------*/ ?>
                </div>
                <div id="stats"   class="tab-pane"></div>
                <div id="topics"  class="tab-pane cluster-ol"></div>
                <div id="files"   class="tab-pane cluster-ol"></div>
            </div>
        </div>
        <a id="back-to-top" href="#" class="btn btn-primary back-to-top" role="button" title="Click to return on the top page" data-toggle="tooltip" data-placement="left"><span class="glyphicon glyphicon-chevron-up"></span></a>
<?php /*

        SCRIPTS
        
        <script src="/js/plugins/boomerang/boomerang.js"></script>
        <script src="/js/plugins/boomerang/plugins/auto-xhr.js"></script>
        <script src="/js/plugins/boomerang/plugins/bw.js"></script>
        <script src="/js/plugins/boomerang/plugins/rt.js"></script>
        <script src="/js/plugins/boomerang/plugins/spa.js"></script>
        <script src="/js/plugins/boomerang/plugins/zzz-last-plugin.js"></script>
        -------------------------------------------------------------------- */ ?>
        <script src="//code.jquery.com/jquery-3.2.1.min.js"        integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
        <script src="//code.jquery.com/ui/1.12.1/jquery-ui.min.js" integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU=" crossorigin="anonymous"></script>
        
        <script src="//cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.4/js/bootstrap.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.4/js/bootstrap-select.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.4/js/i18n/defaults-fr_FR.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/numeral.js/2.0.6/numeral.min.js"></script>
        <script src="//cdnjs.cloudflare.com/ajax/libs/js-polyfills/0.1.41/polyfill.min.js"></script>

        <script src="/js/plugins/bootstrap3-dialog/js/bootstrap-dialog.min.js"></script>
        <script src="/js/plugins/ua-parser.min.js"></script>
        <script src="/js/plugins/cookie/jquery.cookie.min.js"></script>
        <script src="/js/plugins/clusterize/clusterize.min.js"></script>

        <script src="/js/plugins/selectize/js/selectize.js"></script>
<?php /** / ?>
        <script>
            BOOMR.init({
                beacon_url: window.location.href + 'data',
                instrument_xhr: true
            });
        </script>
<?php /**/ ?>
        <script>
            var jsonURLs = ['/data/', '/json/ui-texts.json<?= $v ?>', '/json/ui-docs.json<?= $v ?>', '/json/brokers.json<?= $v ?>'];
        </script>
        <script src="/js/main.js<?= $v ?>"></script>
    </body>
</html> 
