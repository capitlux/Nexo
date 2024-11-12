if (window.location.href.indexOf('web2.carparts-cat.com') != -1) {
    var actualCode = '(' + function () {
        addXMLRequestCallback(function (xhr) {
            console.log(xhr.responseURL);
            //assert is product search query result
            if (xhr.responseURL.includes('ERP.aspx/GetErpInfosAL')) {

                setTimeout(function () {
                    //return data to content script
                    document.dispatchEvent(new CustomEvent('GetErpInfosAL', { detail: xhr.response }));

                    //load product images
                    $('.articleThumbNail').not('.processed').each(function () {
                        $(this).addClass('processed');
                        if ($(this).next().hasClass('al_pic_lupe')) {
                            $(this).click();
                        }
                        else {
                            var code = $(this).closest('tr.main_artikel_panel_tr_artikel').find('.pnl_link_eartnr nobr').text();
                            document.dispatchEvent(new CustomEvent('GetImgUrls', { detail: { code: code, imageUrl: null } }));
                        }
                    });
                }, 50);
            }
        });
    } + ')();';
    plugJsCodeToDocument(addXMLRequestCallback, true);
    plugJsCodeToDocument(actualCode, true);
}

class HessCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        that.listeningRegExp = /web2\.carparts-cat\.com/m;
        that.loginRegExp = /hess-autoteile-shop\.de\/login/m;
        that.homeRegExp = /hess-autoteile-shop\.de\/hessonline/m;
        if (that.homeRegExp.test(window.location.href)) {
            if ($('#spracheAktiv img').attr('data-isocode') != 'fr')
                $('a.changeLanguage [data-isocode="fr"]').click();
        }
        else if (that.loginRegExp.test(window.location.href)) {

            chrome.runtime.sendMessage({ id: CONST_GetCatalogConfig, catalogId: that.id }, (response) => {
                if (response) {
                    $('[name="_username"]').val(response.Login);
                    $('[name="_password"]').val(response.Password);
                    $('.login-submit').click();
                }
            });
        }
        else if (that.listeningRegExp.test(window.location.href)) {

            that.lastLoadedProducts = [];
            that.pendingProductCount = 0;

            var actualCode = '(' + function () {

                if ($('.erp_status_pnl').length == 0) {
                    document.dispatchEvent(new CustomEvent('GetImgUrls', { detail: { code: null, imageUrl: null } }));
                }

                addXMLRequestCallback(function (xhr) {
                    if (xhr.responseURL.includes('GetImgUrls')) {
                        var code = JSON.parse(xhr.lastSendArguments[0]).wholesalerArtNumber;
                        var imageUrl = JSON.parse(xhr.response).d[0].url;
                        document.dispatchEvent(new CustomEvent('GetImgUrls', { detail: { code: code, imageUrl: imageUrl } }));
                    }
                });

            } + ')();';
            plugJsCodeToDocument(addXMLRequestCallback);
            plugJsCodeToDocument(actualCode);
        }

        //process product query result
        document.addEventListener('GetErpInfosAL', function (e) {
            that.getStorageDataAsync(function (storage) {
                if (storage.request.id == CONST_SearchRequest) {
                    that.lastLoadedProducts = JSON.parse(e.detail);
                    that.pendingProductCount = that.lastLoadedProducts.length;
                }
                else if (storage.request.id == CONST_QuantityRequest) {

                    var product = JSON.parse(e.detail)[0];
                    storage.request.available = product.AvailState == 1 || product.AvailState == 4;
                    storage.request.deliveryInfo = product.AvailState == 1 ? 'Disponible' : (product.AvailState == 4 ? 'Disponible en 24H' : '');

                    //prepare message
                    var message = {
                        id: CONST_QuantityResponse,
                        request: storage.request
                    };

                    //send message to bg
                    chrome.runtime.sendMessage(message);
                }
            });
        });

        //process product image result
        document.addEventListener('GetImgUrls', function (e) {
            that.onLoadImage(e.detail.code, e.detail.imageUrl);
        }, false);
    }

    onLoadImage(imageProductCode, imageUrl) {

        var that = this;

        that.getStorageDataAsync(function (storage) {

            var results = [];
            //for each product
            var code = null;
            for (var i = 0; i < that.lastLoadedProducts.length; i++) {
                var product = that.lastLoadedProducts[i];
                //get code from JSON
                var code = product.KArtNr;

                //find corresponding product
                if (code != imageProductCode) {
                    code = product.EArtNr;
                    if (code != imageProductCode) {
                        continue;
                    }
                };

                //find corresponding UI element
                var $codeElem = null;
                if (code != null) {
                    $codeElem = $('.pnl_link_haendlernr nobr:contains("' + code + '")').first();
                    if ($codeElem.length != 1) {
                        $codeElem = $('.pnl_link_eartnr nobr:contains("' + code + '")').first();
                    }
                }

                if ($codeElem.length == 1) {
                    $('#main_artikel_panel_maintable').find('.al_infolink, .tooltiptext').remove();
                    results.push({
                        vendor: that.id,
                        make: $.trim($codeElem.closest('.main_artikel_panel_tr_artikel').prevAll('.main_artikel_panel_tr_einspeiser').eq(0).text()),
                        code: product.EArtNr,
                        description: $codeElem.closest('.main_artikel_panel_tr_artikel').prevAll('.main_artikel_panel_tr_genart').eq(0).text().cleanText() + ' ' + $codeElem.closest('.main_artikel_panel_tr_artikel').next().find('.tc_prop').text().cleanText(),
                        image: imageUrl,
                        priceBase: product.Preisdaten.Gesamtpreis.toNumber(),
                        pricePurchase: product.Preisdaten.GesamtEKpreis.toNumber(),
                        quantity: product.Menge.toNumber(),
                        available: product.AvailState == 1 || product.AvailState == 4,
                        deliveryInfo: product.AvailState == 1 ? 'Disponible' : (product.AvailState == 4 ? 'Disponible en 24H' : '')
                    });
                }

                that.pendingProductCount--;
            }

            //prepare message
            var message = {
                id: CONST_SearchResponse,
                vendorId: that.id,
                request: storage.request,
                results: results,
                searchStatus: that.pendingProductCount > 0 ? CONST_SearchStatusSearching : CONST_SearchStatusCompleted
            };

            //send message to bg
            chrome.runtime.sendMessage(message);
            //if (that.pendingProductCount <= 0)
                //that.resetStorageDataAsync();
        });
    }

    getSearchInput() {
        return $('#tp_articlesearch_txt_articleSearch');
    }
    getSearchButton() {
        return $('#tp_articlesearch_articleSearch_imgBtn');
    }
    searchProduct(request) {
        var that = this;
        that.setStorageDataAsync({ status: CONST_CatalogStatusSearching, request: request, pendingSearchList: [{ code: request.term }] }, function () {
            that.getSearchInput().val(request.term);
            that.getSearchButton().click();
        });
    }
    requestQuantity(request) {
        var that = this;
        that.setStorageDataAsync({ status: CONST_CatalogQueryingQuantity, request: request }, function () {
            //find corresponding UI element
            var $codeElem = $('nobr').filter(function () {
                return $(this).text().formatProductCode() == request.code.formatProductCode()
                    && $(this).closest('.main_artikel_panel_tr_artikel').prevAll('.main_artikel_panel_tr_einspeiser').eq(0).text().cleanText() == request.make.cleanText()
            });
            $codeElem.closest('.main_artikel_panel_tr_artikel').find('.tc_menge input.numeric_textbox').val(request.quantity).get(0).dispatchEvent(new Event("change"));
        });
    }
}
