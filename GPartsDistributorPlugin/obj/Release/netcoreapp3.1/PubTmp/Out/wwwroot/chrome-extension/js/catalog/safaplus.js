
class SafaPlusCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        that.listeningRegExp = /safaplus\.inoshop\.net\/index\.php/m;
        that.loginRegExp = /safaplus\.inoshop\.net\/connect\/index\.php/m;

        if (that.listeningRegExp.test(window.location.href)) {

            var actualCode = '(' + function () {

                //catch Ajax query success
                $(document).ajaxSuccess(function (event, request, settings, data) {
                    //assert is product search query result
                    if (settings.url.startsWith('include_client/wpp_safaplus/ajax/recherche.php')) {

                        //return data to content script
                        document.dispatchEvent(new CustomEvent('HasResult', { detail: { isWaitingCrossResult: data.includes('$("#EquivalenceAutomatique").show().load("include_client/wpp_safaplus/ajax/recherche.php'), data: data } }));
                    }
                });

            } + ')();';
            plugJsCodeToDocument(actualCode);

            //process product image result
            document.addEventListener('HasResult', function (e) {
                that.getStorageDataAsync(function (storage) {
                    var results = [];

                    //process direct results
                    $('<div>' + e.detail.data + '</div>').find('.piece').each(function () {

                        results.push({
                            vendor: that.id,
                            make: $(this).find('td:eq(5)').text().cleanText(),
                            code: $(this).find('td:eq(7)').text().cleanText(),
                            description: $(this).find('td:eq(9)').text().cleanText(),
                            image: null,
                            priceBase: $(this).find('td:eq(10)').text().toNumber(),
                            pricePurchase: $(this).find('td:eq(14)').text().toNumber(),
                            quantity: $(this).find('td:eq(16)').text().toNumber(),
                            available: $(this).find('td:eq(16)').text().toNumber() > 0,
                            deliveryInfo: $(this).find('td:eq(1) img').attr('title').cleanText().split(' - ')[0]
                        });
                    });

                    //prepare message
                    var message = {
                        id: CONST_SearchResponse,
                        vendorId: that.id,
                        request: storage.request,
                        results: results,
                        searchStatus: !e.detail.isWaitingCrossResult || results.length == 0 ? CONST_SearchStatusCompleted : CONST_SearchStatusSearching
                    };

                    //send message to bg
                    chrome.runtime.sendMessage(message);
                });

            }, false);
        }
        else if (that.loginRegExp.test(window.location.href)) {
            chrome.runtime.sendMessage({ id: CONST_GetCatalogConfig, catalogId: that.id }, (response) => {
                if (response) {
                    $('[name="login"]').val(response.Login);
                    $('[name="password"]').val(response.Password);
                    $('#form_valid').click();
                }
            });
        }
    }

    getSearchInput() {
        return $('#code_article_input');
    }
    getSearchButton() {
        return $('#envoie_formulaire');
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
            var $codeElem = $('[id="RA_detailarticle"].soustitre').filter(function () {
                return $(this).find('td:eq(1)').text().formatProductCode() == request.code.formatProductCode()
                    && $(this).closest('table').prevAll(':has(#RA_entetearticle)').first().find('th').text().cleanText() == request.make.cleanText()
            });
            $codeElem.closest('table').nextAll(':has(#RA_description)').first().find('input[id^="QTEX"]').val(request.quantity).get(0).dispatchEvent(new Event("keyup"));
        });
    }
}
