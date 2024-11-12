
if (/drivecat\.atelio-iam\.com[\/]+RecherchePiece/m.test(window.location.href)) {
    var actualCode = '(' + function () {
        addXMLRequestCallback(function (xhr) {
            if (xhr.responseURL.includes('RechercheRefEquivalente')) {
                document.dispatchEvent(new CustomEvent('RechercheRefEquivalente'));
            }
        }, null, 1000);

        window.xat2PriceAndStockConfig = function (make, model) {
        }

        //avoid blocking alert
        window.alert = function () { return true; };
        //avoid internal process
        window.initRechercheDMS = function () { };
    } + ')();';
    plugJsCallFuncByNameW2P();
    plugJsCodeToDocument(addXMLRequestCallback, true);
    plugJsCodeToDocument(actualCode, true);

    var readyStateCheckInterval = setInterval(function () {
        console.log(new Date().getTime() + ' doc = ' + document.readyState + ', body ready = ' + document.getElementsByTagName('body').length == 1);
        if (document.readyState === "complete") {
            clearInterval(readyStateCheckInterval);
        }
    }, 100);
}

class DrivecatCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        that.listeningRegExp = /drivecat\.atelio-iam\.com[\/]+RecherchePiece/m;
        that.homeRegExp = /drivecat\.atelio-iam\.com[\/]+Accueil/m;
        that.loginRegExp = /drivecat\.atelio-iam\.com[\/]+Authentification/m;
        that.searchLocation = '/RecherchePiece';

        that.pendingSearchCross = 0;
        that.processedProducts = [];

        if (that.loginRegExp.test(window.location.href)) {

            chrome.runtime.sendMessage({ id: CONST_GetCatalogConfig, catalogId: that.id }, (response) => {
                if (response) {
                    $('[name="txtlog"]').val(response.Login);
                    $('[name="txtpwd"]').val(response.Password);
                    setTimeout(function () {
                        $('[type="submit"]').click();
                    }, 100);
                }
            });
        }
        else if (that.homeRegExp.test(window.location.href)) {
            window.location = that.searchLocation;
        }
        else if (that.listeningRegExp.test(window.location.href)) {
            var actualCode = '(' + function () {
                window.initRechercheDMS = function () { };
            } + ')();';
            plugJsCodeToDocument(actualCode);

            //re-launch process result when "RechercheRefEquivalente" is fired
            document.addEventListener('RechercheRefEquivalente', function (e) {
                that.pendingSearchCross--;
                that.processSearchResult($('.ref-equivalentes a.loading').closest('.affichage-ref-equivalentes').prev());
                that.searchNextRechercheRefEquivalente();
            });
            that.pendingSearchCross = $('.ref-equivalentes a').length;
            that.searchNextRechercheRefEquivalente();
            that.processSearchResult();
        }
    }
    searchNextRechercheRefEquivalente() {
        //launch cross search directly
        $('.ref-equivalentes a.loading').removeClass('loading').addClass('loaded');
        $('.ref-equivalentes a').not('.loaded').first().each(function () {
            $(this).addClass('loading');

            var paramList = $(this).attr('href').match(/getListRefEquivalentes\('(.+)','(.*)'\)/s);
            document.dispatchEvent(new CustomEvent('callFuncByNameW2P', { detail: { funcName: 'getListRefEquivalentes', p1: paramList[1], p2: paramList[2] } }));
        });
    }
    getSearchInput() {
        return $('#refRch');
    }
    getSearchButton() {
        return $('.btn-rech-ref');
    }
    searchProduct(request) {
        var that = this;
        that.setStorageDataAsync({ status: CONST_CatalogStatusSearching, request: request, pendingSearchList: [{ code: request.term }] }, function () {
            that.getSearchInput().val(request.term);
            that.getSearchButton().click();
        });
    }
    processSearchResult($referer) {
        var that = this;

        that.getStorageDataAsync(function (storage) {

            var results = [];

            //process direct results
            var $container = $referer ? $referer.parent().find('[id^="zoneDeplieCross"] .cartouche-row') : $('.cartouche-row');
            $container.not('.cartouche-composante').has('.refPieceAM').each(function () {

                var make = $(this).find('.fournisseur input[name="pieceToDisplay"]').val();
                var code = $(this).find('.refPieceAM').text().cleanText();
                var makeReferer = null;
                var codeReferer = null;

                if (!$referer && $(this).closest('[id^="zoneDeplieCrossAM"]').length == 1) {
                    $referer = $(this).closest('[id^="zoneDeplieCrossAM"]').parent().find('.cartouche-row').first();
                }
                if ($referer) {
                    makeReferer = $referer.find('.fournisseur input[name="pieceToDisplay"]').val();
                    codeReferer = $referer.find('.refPieceAM, .refPieceOE').text().cleanText();
                }

                var imageUrl = null;
                if ($(this).find('.bloc_image img').length == 1)
                    imageUrl = window.location.origin + '/' + $(this).find('.bloc_image img').attr('src');

                if (that.processedProducts.findIndex(x => x.make === make && x.code === code) === -1) {

                    that.processedProducts.push({ make: make, code: code });
                    results.push({
                        vendor: that.id,
                        make: make,
                        code: code,
                        description: $(this).find('.description').text().cleanText(),
                        image: imageUrl,
                        priceBase: 0,
                        pricePurchase: 0,
                        quantity: 0,
                        available: false,
                        deliveryInfo: null,
                        makeReferer: makeReferer,
                        codeReferer: codeReferer
                    });
                }
            });

            //prepare message
            var message = {
                id: CONST_SearchResponse,
                vendorId: that.id,
                request: storage.request,
                results: results,
                searchStatus: that.pendingSearchCross == 0 ? CONST_SearchStatusCompleted : CONST_SearchStatusSearching
            };

            //send message to bg
            chrome.runtime.sendMessage(message);
        });
    }
}
