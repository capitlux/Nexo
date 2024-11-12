
if (window.location.href.indexOf('http://pesw.gparts.eu/Base/Product/webSearch') != -1) {
    var actualCode = '(' + function () {
        addXMLRequestCallback(function (xhr) {
            if (xhr.responseURL.includes('WebSearchCrossRef')) {
                var data = JSON.parse(xhr.response);
                document.dispatchEvent(new CustomEvent('WebSearchCrossRef', { detail: data }));
            }
        });

    } + ')();';
    plugJsCodeToDocument(addXMLRequestCallback, true);
    plugJsCodeToDocument(actualCode, true);
} 

class LocalCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        that.listeningRegExp = /shop\.pesw\.gparts\.eu/m;
        that.resultRegExp = /pesw\.gparts\.eu\/Base\/Product\/webSearch/m;
        that.loginRegExp = /pesw\.gparts\.eu\/Home\/Login/m;

        if (that.loginRegExp.test(window.location.href)) {

            chrome.runtime.sendMessage({ id: CONST_GetCatalogConfig, catalogId: that.id }, (response) => {
                if (response) {
                    $('[name="username"]').val(response.Login);
                    $('[name="password"]').val(response.Password);
                    $('.rememberme').click();
                    $('[type="submit"]').click();
                }
            });
        }
        else if (that.resultRegExp.test(window.location.href)) {

            that.getStorageDataAsync(function (storage) {
                //process product query result
                document.addEventListener('WebSearchCrossRef', function (e) {
                    var results = [];

                    for (var i = 0; i < e.detail.length; i++) {
                        var product = e.detail[i];
                        var availableQty = 0;
                        var stockInfo = '';
                        for (var j = 0; j < product.StockList.length; j++) {
                            var stockLine = product.StockList[j];
                            if (stockLine.IsVirtual || !stockLine.StockAvailable)
                                continue;
                            availableQty += stockLine.StockAvailable;
                            if (stockInfo != '')
                                stockInfo += '\r\n';
                            stockInfo += stockLine.StockAvailable + ' pcs. ' + stockLine.DepotName;
                        }

                        results.push({
                            vendor: that.id,
                            make: product.MakerName,
                            code: product.Code,
                            description: product.Description,
                            image: null,
                            priceBase: product.PriceBaseA,
                            pricePurchase: product.PriceFinal,
                            quantity: availableQty,
                            available: availableQty > 0,
                            deliveryInfo: stockInfo
                        });
                    }

                    //prepare message
                    var message = {
                        id: CONST_SearchResponse,
                        vendorId: that.id,
                        request: storage.request,
                        results: results,
                        searchStatus: CONST_SearchStatusCompleted
                    };

                    //send message to bg
                    chrome.runtime.sendMessage(message);

                    //that.resetStorageDataAsync();
                });

                var results = [];

                //process direct results
                $('table tbody tr.product').not('.cross-ref').each(function () {
                    var code = $(this).attr('data-product-code');
                    var $make = $(this).find('span.code');
                    $make.find('b').remove();
                    var make = $make.text().cleanText();
                    var availableQty = 0;
                    var stockInfo = '';
                    $(this).find('.stock-line').each(function () {
                        var curStock = $(this).attr('data-stock').toNumber();
                        if (curStock < 1)
                            return;
                        availableQty += curStock;
                        if (stockInfo != '')
                            stockInfo += '\r\n';
                        stockInfo += $(this).text().cleanText();
                    });

                    results.push({
                        vendor: that.id,
                        make: make,
                        code: code,
                        description: $(this).find('.description').text().cleanText(),
                        image: null,
                        priceBase: $(this).find('.public-price').text().toNumber(),
                        pricePurchase: $(this).find('.final-price').text().toNumber(),
                        quantity: availableQty,
                        available: availableQty > 0,
                        deliveryInfo: stockInfo
                    });
                });

                //prepare message
                var message = {
                    id: CONST_SearchResponse,
                    vendorId: that.id,
                    request: storage.request,
                    results: results,
                    searchStatus: CONST_SearchStatusSearching
                };

                //send message to bg
                chrome.runtime.sendMessage(message);

                that.updateStatusAsync(CONST_CatalogStatusSearchingCross);
            });
        }
    }
    getSearchInput() {
        return $('.input-product-search');
    }
    getSearchButton() {
        return $('.button-product-search');
    }
    searchProduct(request) {
        var that = this;
        that.setStorageDataAsync({ status: CONST_CatalogStatusSearching, request: request, pendingSearchList: [{ code: request.term }] }, function () {
            that.getSearchInput().val(request.term);
            that.getSearchButton().click();
        });
    }
}
