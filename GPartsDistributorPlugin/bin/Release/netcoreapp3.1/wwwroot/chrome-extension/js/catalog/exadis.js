

if (window.location.href.indexOf('exadis') != -1) {
    var actualCode = '(' + function () {
        addXMLRequestCallback(function (xhr) {
            if (xhr.responseURL.includes('ecatASvc') && xhr.lastSendArguments && xhr.lastSendArguments.length > 0 && xhr.lastSendArguments[0].includes('|getArticleDispoPrix|')) {
                document.dispatchEvent(new CustomEvent('ecatASvc'));
            }
        });

    } + ')();';
    plugJsCodeToDocument(addXMLRequestCallback, false);
    plugJsCodeToDocument(actualCode, false);
}

class ExadisCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        that.listeningRegExp = /ecat\.exadis\.fr\/ecatvl/m;
        that.loginRegExp = /ecat\.exadis\.fr\/index\.html/m;

        if (that.loginRegExp.test(window.location.href)) {
            // When jQuery is ready, then ...
            plugJQuerytoDocument(function () {
                setTimeout(function () {
                    if ($('#LoginView').length > 0) {
                        chrome.runtime.sendMessage({ id: CONST_GetCatalogConfig, catalogId: that.id }, (response) => {
                            if (response) {
                                $('#LoginView .gwt-TextBox').val(response.Login);
                                $('#LoginView .gwt-PasswordTextBox').val(response.Password);
                                $('.boutonBleuSousMenu').click();
                                setTimeout(function () { window.location.reload(); }, 1000);
                            }
                        });
                    }
                    else if ($('.boutonCatalogue').length > 0) {
                        $('.boutonCatalogue').click();
                    }
                }, 1000);
            });
        }
        else if (that.listeningRegExp.test(window.location.href)) {

            // When jQuery is ready, then ...
            plugJQuerytoDocument(function () {
                //process product query result
                document.addEventListener('ecatASvc', function (e) {

                    that.getStorageDataAsync(function (storage) {

                        if (storage.status == CONST_CatalogQueryingQuantity) {

                            //find corresponding UI element
                            var $codeElem = $('.gridZone .ArticleResultGrid tbody tr').has('.StyleCheckBox').filter(function () {
                                return $(this).find('td').eq(4).text().formatProductCode() == storage.request.code.formatProductCode()
                                    && $(this).find('td').eq(2).text().cleanText() == storage.request.make.cleanText()
                            });
                            var availability = that.getAvailability($codeElem);

                            storage.request.available = availability.available;
                            storage.request.deliveryInfo = availability.deliveryInfo;

                            //prepare message
                            var message = {
                                id: CONST_QuantityResponse,
                                request: storage.request
                            };

                            //send message to bg
                            chrome.runtime.sendMessage(message);

                        } else {

                            var results = [];

                            //process direct results
                            $('.gridZone .ArticleResultGrid tbody tr').has('.StyleCheckBox').each(function () {

                                var priceList = $(this).find('td').eq(10).find('p').html().split('<br>');
                                var descrFull = '';
                                var $articleResultRestTD = $(this).next('tr').has('.articleResultRestTD');
                                if ($articleResultRestTD.length > 0)
                                    descrFull = $articleResultRestTD.text().cleanText();

                                var availability = that.getAvailability($(this));

                                var image = $(this).find('td').eq(1).find('img').attr('src');
                                if (image.includes('noPhoto'))
                                    image = null;

                                results.push({
                                    vendor: that.id,
                                    make: $(this).find('td').eq(2).text().cleanText(),
                                    code: $(this).find('td').eq(4).text().cleanText(),
                                    description: $(this).find('td').eq(3).text().cleanText() + (descrFull != '' ? ' ' + descrFull : ''),
                                    image: image,
                                    priceBase: priceList.length == 4 ? priceList[0].toNumber() : 0,
                                    pricePurchase: priceList.length == 4 ? priceList[2].toNumber() : 0,
                                    quantity: 1,
                                    available: availability.available,
                                    deliveryInfo: availability.deliveryInfo
                                });
                            });

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
                        }
                    });
                });
            });
        }
    }
    getAvailability($rowData) {
        var available = false;
        var deliveryInfo = '';
        var $availableIcon = $rowData.find('td').eq(11).find('img').attr('src');
        if ($availableIcon.includes('DispoEnJPlus1')) {
            available = true;
            deliveryInfo = "DISPO EN J+1";
        } else if ($availableIcon.includes('DispoImmediate')) {
            available = true;
            deliveryInfo = "DISPO";
        }
        return {
            available: available,
            deliveryInfo: deliveryInfo
        };
    }
    getSearchInput() {
        return $('.searchZone.PiecesZone .EcatTextBox input');
    }
    getSearchButton() {
        return $('.searchZone.PiecesZone .SearchButton');
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
            var $codeElem = $('.gridZone .ArticleResultGrid tbody tr').has('.StyleCheckBox').filter(function () {
                return $(this).find('td').eq(4).text().formatProductCode() == request.code.formatProductCode()
                    && $(this).find('td').eq(2).text().cleanText() == request.make.cleanText()
            });
            var inputElem = $codeElem.find('td').eq(14).find('input').get(0);
            inputElem.value = request.quantity;
            inputElem.dispatchEvent(new CustomEvent("change", {
                altKey: false,
                bubbles: true,
                cancelBubble: false,
                cancelable: true,
                composed: true,
            }));
        });
    }
}
