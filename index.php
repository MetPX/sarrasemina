<?php /*
===============================================================================
-[ sarrasemina.ca/index.php ]--------------------------------------------------
===============================================================================

        +------------------------------------------------------------+
        | IMPORTANT NOTE:                                            |
        +------------------------------------------------------------+
        | This index.php file is there for development purpose only. |
        | In PROD, the final index file must be index.html           |
        +------------------------------------------------------------+

To work properly when using ByteRange with text files,
Apache Server compression mode must be disabled.

To do so:  $ sudo a2dismod deflate
Then:      $ service apache2 restart

To enable: $ sudo a2enmod deflate
Then:      $ service apache2 restart

Created  - 2017-08-24
Modified - 2018-01-29

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

        <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Open+Sans|Open+Sans+Condensed:300|Ubuntu+Mono">
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css">
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css">
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.4/css/bootstrap-select.min.css">
        
        <link rel="stylesheet" href="/js/plugins/bootstrap3-dialog/css/bootstrap-dialog.min.css">
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
                <div class="col-sm-6 logo">
                    <img height="26" src="/img/sig-blk-fr.svg"/>
                </div>
                <div class="col-sm-6 text-right slogo">
                    <span id="title">Sarracenia</span> &nbsp;
                    <span><img height="30" src="/img/Weather-sun-clouds-rain.svg"
                    >&nbsp;<img class="currentCondImg" src="//weather.gc.ca/weathericons/10.gif" alt="Nuageux" title="Nuageux"
                    >&nbsp;<button type="button" class="btn btn-default btn-sm" id="switchLang"></button>                    
                    </span>
                </div>
            </div>
            <hr>
            <div class="row">
                <div id="catalogues" class="col-sm-12"><p></p></div>
            </div>
<?php /*
        User create its own Sarra Config here
        -------------------------------------------------------------------- */ ?>
            <div id="sarra-formula" class="hidden">
                <hr>
                <div class="row">
                    <div class="sarra-configs col-xm-12 accepts-rejects">
                        <table>
                            <tr>
                                <td width="90"><label class="label-topic" data-label="V02.post">Topic: </label></td>
                                <td>
                                    <div class="input-group input-group-sm disabled">
                                        <span id="help-topic" class="input-group-addon glyphicon glyphicon-question-sign" data-toggle="tooltip" data-placement="left"></span>
                                        <div class="btn-group btn-group-sm disabled" data-toggle="buttons">
                                            <label class="btn btn-primary btn-topic active" data-label="V02.post" style="border-radius: 0;">
                                                <input type="radio" name="options" id="option1" autocomplete="off" checked><i class="fa fa-circle-thin unchecked" aria-hidden="true"></i><i class="fa fa-check-circle checked" aria-hidden="true"></i> post
                                            </label>
                                            <label class="btn btn-primary btn-topic" data-label="V02.report">
                                                <input type="radio" name="options" id="option2" autocomplete="off"><i class="fa fa-circle-thin unchecked" aria-hidden="true"></i><i class="fa fa-check-circle checked" aria-hidden="true"></i> report
                                            </label>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td>
                                  <label class="label-subtopic" for="input-subtopic">Subtopic: </label>
                                </td>
                                <td>
                                    <div class="subtopic filter input-group input-group-sm disabled">
                                        <span id="help-subtopic" class="input-group-addon glyphicon glyphicon-question-sign" data-toggle="tooltip" data-placement="left"></span>
                                        <input id="input-subtopic" class="form-control input-subtopic" autocomplete="off" type="text" class="form-control" placeholder="..." aria-label="..." aria-describedby="btnSearchReset" />
                                        <span id="btnSearchReset" class="input-group-addon"></span>
                                    </div>
                                </td>
                            </tr>
                            <tr id="err-subtopic">
                                <td> </td>
                                <td class="err"> </td>
                            </tr>
                        </table>
                        <hr style="margin: 5px 0;">
                        <table class="accept_reject filters">
                            <tr class="entry">
                                <td width="90"><label class="label-accept_reject" for="input-accept_reject__1">Accept/Reject: </label></td>
                                <td>
                                    <div class="input-group input-group-sm disabled">
                                        <span class="help-accept_reject input-group-addon glyphicon glyphicon-question-sign" data-toggle="tooltip" data-placement="left"></span>
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
                                            <input class="form-control input-accept_reject" id="input-accept_reject__1" type="text" data-ar="accept" placeholder="..." aria-label="..." />
                                            <span class="input-group-btn"><button class="btn btn-secondary btn-add" type="button" tabindex="-1"><span class="glyphicon glyphicon-plus c-vert"></span></button></span>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </table>
                        <hr style="margin: 5px 0;">
                        <table class="accept_unmatch filter">
                            <tr>
                                <td width="90">
                                    <label class="label-accept_unmatch" style="padding:0;">Accept: </label>&nbsp; 
                                </td>
                                <td style="vertical-align: top;">
                                    <div class="input-group input-group-sm disabled" style="display:inline-table; width: 100px;">
                                        <span class="help-accept_unmatch input-group-addon glyphicon glyphicon-question-sign" data-toggle="tooltip" data-placement="left"></span>
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
                                    <span id="descr-accept_unmatch">All unmatched elements</span>
                                    <span class="btn btn-default btn-sm pull-right" id="btnSearch"><span class="glyphicon glyphicon-search"></span> Search</span>
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
            <div id="logs" class="col-sm-12">
                <hr>
                <button id="btnCopy" class="btn btn-secondary btn-sm pull-left hidden" type="button"><i class="fa fa-clipboard" aria-hidden="true"></i></button>
                <p><strong id="log_title"></strong></p>
                <p id="logger"></p>
                <pre id="config"></pre>
            </div>
        </div>
<?php /*

        BOT
        -------------------------------------------------------------------- */ ?>
            <template id="table">
                <tbody id="catalogue"></tbody>
                <tbody id="search"></tbody>
                <tbody id="results"></tbody>
            </template>
        
        <div id="tabs" class="row page">
            <div id="msg"></div>
            <ul class="nav nav-tabs" style="display: none;">
                <li><a id="folders-tab" href="#folders" data-toggle="tab"></a></li>
                <li><a id="files-tab"   href="#files"   data-toggle="tab"></a></li>
                <li><a id="stats-tab"   href="#stats"   data-toggle="tab"></a></li>
            </ul>
            <div class="tab-content clearfix">
                <div class="tab-pane" id="folders"><ul class="tree"></ul></div>
                <div class="tab-pane" id="files"><pre></pre></div>
                <div class="tab-pane" id="stats"></div>
            </div>
        </div>
        <a id="back-to-top" href="#" class="btn btn-primary back-to-top" role="button" title="Click to return on the top page" data-toggle="tooltip" data-placement="left"><span class="glyphicon glyphicon-chevron-up"></span></a>
        
<?php /*
        
        SCRIPTS
        
        https://cdnjs.cloudflare.com/ajax/libs/UAParser.js/0.7.17/ua-parser.min.js
        https://cdnjs.cloudflare.com/ajax/libs/jquery.cookieBar/0.0.3/jquery.cookieBar.min.js
        https://cdnjs.cloudflare.com/ajax/libs/jquery-cookie/1.4.1/jquery.cookie.min.js
        
        -------------------------------------------------------------------- */ ?>
        <script src="https://code.jquery.com/jquery-3.2.1.min.js"        integrity="sha256-hwg4gsxgFZhOsEEamdOYGBf13FyQuiTwlAQgxVSNgt4=" crossorigin="anonymous"></script>
        <script src="https://code.jquery.com/ui/1.12.1/jquery-ui.min.js" integrity="sha256-VazP97ZCwtekAsvgPBSUwPFKdrwD3unUfSGVYrahUqU=" crossorigin="anonymous"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.4/js/bootstrap.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.4/js/bootstrap-select.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-select/1.12.4/js/i18n/defaults-fr_FR.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/numeral.js/2.0.6/numeral.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/js-polyfills/0.1.41/polyfill.min.js"></script>
        <script src="/js/plugins/bootstrap3-dialog/js/bootstrap-dialog.min.js<?= $v ?>"></script>
        <script src="/js/plugins/ua-parser.min.js"></script>
        <script src="/js/plugins/cookie/jquery.cookie.min.js"></script>
        <script>
            var jsonURLs = ['/data/', '/json/ui-texts.json<?= $v ?>', '/json/ui-docs.json<?= $v ?>'];
        </script>
        <script src="/js/CancellationTokenSource.js<?= $v ?>"></script>
        <script src="/js/main.js<?= $v ?>"></script>
    </body>
</html> 
