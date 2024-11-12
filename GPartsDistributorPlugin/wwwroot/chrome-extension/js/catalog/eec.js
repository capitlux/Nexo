
//used to listen cross results
if (window.location.href.indexOf('http://web.est-entrepot.fr/') != -1) {
    var actualCode = '(' + function () {
        addXMLRequestCallback(function (xhr) {
            if (xhr.responseURL.includes('inwcgi?WSYD_EVENT=CCBASK22')) {
                document.dispatchEvent(new CustomEvent('onValidateCart', { detail: { response: xhr.response } }));
            }
        });
    } + ')();';
    plugJsCodeToDocument(addXMLRequestCallback, true);
    plugJsCodeToDocument(actualCode, true);
}


class EECCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        that.listeningRegExp = /web\.est-entrepot\.fr\/inwcgi/m;
        that.loginRegExp = /web\.est-entrepot\.fr/m;

        if (that.listeningRegExp.test(window.location.href)) {

            var actualCode = '(' + function () {

                //avoid blocking alert
                window.alert = function (message) {
                    return true;
                };

                //avoid blocking confirm
                window.confirm = function (message) {
                    return true;
                };

                var finrechercheOld = window.finrecherche;
                window.finrecherche = function () {
                    finrechercheOld();
                    document.dispatchEvent(new CustomEvent('onSearchResult'));
                }
                addXMLRequestCallback(function (xhr) {
                    console.log(xhr.responseURL);

                    //map each event id to our CustomEvents
                    if (xhr.responseURL.includes('inwcgi?WSYD_EVENT=VGRAC539')) {
                        document.dispatchEvent(new CustomEvent('onQuantityResult', { detail: { response: xhr.response } }));
                    } else if (xhr.responseURL.includes('inwcgi?WSYD_EVENT=VGRAC531')) {
                        document.dispatchEvent(new CustomEvent('onCartClear', { detail: { response: xhr.response } }));
                    } else if (xhr.responseURL.includes('inwcgi?WSYD_EVENT=VGRAC534')) {
                        document.dispatchEvent(new CustomEvent('onAddProductToCart', { detail: { response: xhr.response } }));
                    }
                });

            } + ')();';
            plugJsCodeToDocument(addXMLRequestCallback);
            plugJsCodeToDocument(actualCode);

            //occurs after search result
            document.addEventListener('onSearchResult', function (e) {

                that.getStorageDataAsync(function (storage) {

                    //detect when we are ordering
                    if (storage.status == CONST_CatalogStatusOrdering) {

                        //find single corresponding product
                        var selection = that.selectOrderingProduct(storage);
                        //set requested quantity
                        selection.closest('table').nextAll(':has(#RA_description)').first().find('input[id^="QTEX"]').val(storage.request.pendingItemList[0].quantity).get(0).dispatchEvent(new Event("keyup"));
                    }
                    else {
                        that.loadResult();
                    }
                });
            }, false);

            //occurs after product was added to cart
            document.addEventListener('onAddProductToCart', function (e) {

                that.getStorageDataAsync(function (storage) {

                    //detect when we are ordering
                    if (storage.status == CONST_CatalogStatusOrdering) {

                        //shift current item to continue
                        storage.request.pendingItemList.shift();
                        that.setStorageDataAsync(storage, function () {
                            //more items to order ?
                            if (storage.request.pendingItemList.length > 0) {
                                that.getSearchInput().val(storage.request.pendingItemList[0].code);
                                that.getSearchButton().click();
                            }
                            //otherwise validate current cart
                            else {
                                $('input[value="Panier"]').click();
                            }
                        });
                    }
                });
            }, false);

            //occurs after cart was validated
            document.addEventListener('onValidateCart', function (e) {

                //run after DOM update involved by XHR !!!
                setTimeout(function () {

                    that.getStorageDataAsync(function (storage) {

                        //set order note
                        $('textarea[id="comm"]').val(storage.request.reference + " " + (storage.request.note ? storage.request.note : ''));

                        //control all product in the grid lines match order request items (make + code + quantity)
                        var errorMessageList = [];
                        $('#dojox_grid__View_1 .dojoxGridRowTable > tbody > tr').has('table img[title^="Retrait"]').each(function (index, listItem) {
                            var make = $(this).find('td:eq(3)').text().cleanText();
                            var code = $(this).find('td:eq(2)').text().cleanText().substring(3);
                            var quantity = $(this).find('td:eq(6)').text().toNumber();
                            var match = storage.request.items.filter(item => item.make == make && item.code == code && item.processed != true);
                            if (match.length == 1) {
                                if (match[0].quantity == quantity)
                                    match[0].processed = true;
                                else
                                    errorMessageList.push(make + " " + code + ": LA QUANTITE COMMANDEE (" + quantity + ") NE CORRESPOND PAS A LA QUANTITE DEMANDEE (" + match[0].quantity + ")");
                            }
                            else
                                errorMessageList.push("ARTICLE MANQUANT SUR LE BON DE COMMANDE: " + make + " " + code);
                        });

                        //check error exists
                        if (errorMessageList.length > 0) {
                            //close request immediatelly with error
                            that.closeOrderRequest(storage, errorMessageList.join('\r\n'));
                        }
                        else {
                            that.setStorageDataAsync(storage, function () {
                                //validate order form !!!
                                //$('#tab-info .form-actions button.validate-form').trigger('click');
                                alert('Commandez !!!')
                            });
                        }

                    });
                }, 200);
            }, false);

            //occurs after change product quantity
            document.addEventListener('onQuantityResult', function (e) {
                that.getStorageDataAsync(function (storage) {

                    //detect when we are ordering
                    if (storage.status == CONST_CatalogStatusOrdering) {

                        //find single corresponding product
                        var selection = that.selectOrderingProduct(storage);
                        //add product to cart
                        selection.closest('table').nextAll(':has(#RA_description)').first().find('img[title^="Ajouter"]').click();
                    }
                    else {

                        var $response = $('<div>' + e.detail.response + '</div>');
                        $response.find('script').remove();

                        var availableQuantity = 0;
                        var $firstValidLine = $('[id="RA_detailarticle"].soustitre').filter(function () {
                            return $(this).text().includes('DISPO SUR COMMANDE') == false;
                        });
                        if ($firstValidLine.length > 0)
                            availableQuantity = getRegexFirstGroup(/Pour\s+([0-9,]+)/gm, $firstValidLine.first().text()).toNumber();

                        storage.request.available = storage.request.quantity <= availableQuantity;
                        storage.request.deliveryInfo = $response.find('b').text();

                        //prepare message
                        var message = {
                            id: CONST_QuantityResponse,
                            request: storage.request
                        };

                        //send message to bg
                        chrome.runtime.sendMessage(message);
                    }
                });
            }, false);

            //process product image result
            document.addEventListener('onCartClear', function (e) {
                that.getStorageDataAsync(function (storage) {

                    //we consider initialization completed and start to process each order item
                    storage.request.initializing = false;
                    storage.request.pendingItemList = storage.request.items.slice();
                    that.setStorageDataAsync(storage, function () {
                        //start to search first item
                        that.getSearchInput().val(storage.request.pendingItemList[0].code);
                        that.getSearchButton().click();
                    });
                });
            }, false);
        }
        else if (that.loginRegExp.test(window.location.href)) {


            if ($('h1').text() == 'Not Found') {
                window.top.location.reload();
                return;
            }
            else {
                chrome.runtime.sendMessage({ id: CONST_GetCatalogConfig, catalogId: that.id }, (response) => {
                    if (response) {
                        $('[name="UTCUTI"]').val(response.Login);
                        $('[name="pwd"]').val(response.Password);
                        $('[name="Login"]').click();
                    }
                });
            }
        }


        window.onmessage = function (e) {
            //clear the current cart
            if (e.data.id == 'clearCart') {
                $('img[title^="Vider"]').click();
            }
            //make a new product search action
            else if (e.data.id == 'searchProduct') {
                that.getSearchInput().val(e.data.term);
                that.getSearchButton().click();
            }
            //go to Order edition action
            else if (e.data.id == 'navigateToCustomerOrder') {
                $('a.gpart-cart .fa-shopping-cart').trigger('click');
            }
        };
    }

    loadResult() {
        var that = this;
        that.getStorageDataAsync(function (storage) {
            var results = [];
            $('[id="RA_detailarticle"].soustitre').each(function () {
                var make = $(this).closest('table').prevAll(':has(#RA_entetearticle)').first().find('th').text().cleanText();
                var code = $(this).find('td:eq(1)').text().cleanText();
                var description = $(this).find('td:eq(2)').text().cleanText();
                var $detail = $(this).closest('table').next(':has(#RA_detailarticle)');
                if ($detail.length == 1)
                    description += ' ' + $detail.text().cleanText();

                if (code.formatProductCode() != storage.request.term.formatProductCode()
                    && !description.formatProductCode().endsWith(storage.request.term.formatProductCode()))
                    return;

                var details = $(this).closest('table').nextAll(':has(#RA_description)').first().find('td:eq(2)').text();
                var deliveryInfo = $(this).closest('table').nextAll(':has(#RA_description)').first().find('td:eq(2) div[id^="DispX"] b').text().cleanText();
                var available = $(this).closest('table').nextAll(':has(#RA_description)').first().find('td:eq(2) div[id^="DispX"] b').css('color') == 'rgb(0, 128, 0)';
                results.push({
                    vendor: that.id,
                    make: make,
                    code: code,
                    description: description,
                    image: null,
                    priceBase: getRegexFirstGroup(/PV base :[^0-9,]+([0-9,]+)/gm ,details).toNumber(),
                    pricePurchase: getRegexFirstGroup(/PV net :[^0-9,]+([0-9,]+)/gm, details).toNumber(),
                    quantity: $(this).closest('table').nextAll(':has(#RA_description)').first().find('input[cond]').val().toNumber(),
                    available: available,
                    deliveryInfo: deliveryInfo
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
        });
    }

    selectOrderingProduct(storage) {
        var that = this;

        //find single corresponding product
        var selection = $('[id="RA_detailarticle"].soustitre').filter(function () {
            var make = $(this).closest('table').prevAll(':has(#RA_entetearticle)').first().find('th').text().cleanText();
            var code = $(this).find('td:eq(1)').text().cleanText();
            return make == storage.request.pendingItemList[0].make && code == storage.request.pendingItemList[0].code;
        });

        if (selection.length != 1)
            that.closeOrderRequest(storage, "ARTICLE NON-IDENTIFIABLE SUR LE CATALOGUE: " + storage.request.pendingItemList[0].make + " " + storage.request.pendingItemList[0].code);
        else
            return selection;
    }

    //finish order request with/without errors
    closeOrderRequest(storage, errorMessage) {
        var that = this;

        //set request status depending error exists
        storage.request.status = errorMessage == undefined ? CONST_ProductOrderStatusSuccess : CONST_ProductOrderStatusFailed

        //set request response
        storage.request.response = '';
        if (storage.request.successMessage)
            storage.request.response = storage.request.successMessage;
        if (errorMessage)
            storage.request.response += '\r\n' + errorMessage;

        //prepare message
        var message = {
            id: CONST_ProductOrderResponse,
            request: storage.request
        };

        //send message to bg
        chrome.runtime.sendMessage(message);

        //change state
        that.updateStatusAsync(CONST_CatalogStatusIdle);

        //trace error locally if need be
        throw new Error(errorMessage);
    }

    getSearchInput() {
        return $('#REREFE0000000001');
    }
    getSearchButton() {
        return $('#bouton3');
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
    orderProduct(request) {
        var that = this;
        that.setStorageDataAsync({ status: CONST_CatalogStatusOrdering, request: request }, function () {
            //access to order to clear all items if need be
            window.postMessage({ id: 'clearCart' }, '*');
        });
    }
}
