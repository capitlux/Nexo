
class CarestCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        that.listeningUrl = 'http://www.carest.eu';
        that.resultUrl = 'http://gparts.carest.eu/Base/Product/webSearch';

        if (window.location.href.indexOf(that.resultUrl) != -1) {

            //process product query result
            document.addEventListener('WebSearchCrossRef', function (e) {
                var results = [];

                for (var i = 0; i < e.detail.length; i++) {
                    var product = e.detail[i];
                    var availableQty = 0;
                    var stockInfo = '';
                    for (var j = 0; j < product.StockList.length; j++) {
                        var stockLine = product.StockList[j];
                        if (!stockLine.StockAvailable)
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
                var searchTerm = that.getSearchInput().val();
                var message = {
                    id: CONST_ProductSearchResponse,
                    term: searchTerm,
                    results: results,
                    originUrl: that.listeningUrl
                };

                //send message to bg
                if (results.length > 0)
                    chrome.runtime.sendMessage(message);
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
            var searchTerm = that.getSearchInput().val();
            var message = {
                id: CONST_ProductSearchResponse,
                term: searchTerm,
                results: results,
                originUrl: that.listeningUrl
            };

            //send message to bg
            if (results.length > 0)
                chrome.runtime.sendMessage(message);
        }
    }
    getSearchInput() {
        return $('.input-product-search');
    }
    getSearchButton() {
        return $('.button-product-search');
    }
    searchProduct(term) {
        var that = this;
        that.getSearchInput().val(term);
        that.getSearchButton().click();
    }
}
