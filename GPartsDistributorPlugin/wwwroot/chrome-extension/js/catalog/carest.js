
//used to listen cross results
if (window.location.href.indexOf('bo.demo.gparts.eu') != -1) {
    var actualCode = '(' + function () {
        addXMLRequestCallback(function (xhr) {
            if (xhr.responseURL.includes('WebSearchCrossRef')) {
                //dispatch data through Event
                var data = JSON.parse(xhr.response);
                document.dispatchEvent(new CustomEvent('WebSearchCrossRef', { detail: data }));
            } else {
                //dispatch data through Event
                var data = xhr.responseURL;
                document.dispatchEvent(new CustomEvent('XHRResponse', { detail: data }));
            }
        });

        if (window.location.href.indexOf('CustomerOrder/AddProduct') != -1 ||
            window.location.href.indexOf('PreOrder/AddProduct') != -1) {
            window.setAndValidateLastOrderProductQuantity = function (quantity) {
                $('.k-grid-cell-input.quantity').first().val(quantity).trigger('change');
            };
        }

    } + ')();';
    plugJsCodeToDocument(addXMLRequestCallback, true);
    plugJsCodeToDocument(actualCode, true);
    plugJsCallFuncByName();
    plugJsCallFuncByNameW2P();
} 

class CarestCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        /*that.listeningRegExp = /www\.carest\.eu/m;
        that.resultRegExp = /gparts\.carest\.eu\/Base\/Product\/webSearch/m;
        that.loginRegExp = /gparts\.carest\.eu\/Home\/Login/m;
        that.urlCustomerOrderReadLineRegExp = /gparts\.carest\.eu\/Base\/CustomerOrder\/ReadLine/m;
        that.urlCustomerOrderChangeLineQuantityRegExp = /gparts\.carest\.eu\/Base\/CustomerOrder\/ChangeLineQuantity/m;*/
        that.listeningRegExp = /front.demo.gparts.eu/m;
        that.resultRegExp = /bo.demo.gparts.eu\/Base\/Product\/webSearch/m;
        that.loginRegExp = /bo.demo.gparts.eu\/Home\/Login/m;

        that.urlCustomerOrderIndexRegExp = /bo.demo.gparts.eu\/Base\/CustomerOrder/m;
        that.urlCustomerOrderCreateCARegExp = /bo.demo.gparts.eu\/Base\/CustomerOrder\/CreateCA/m;
        that.urlCustomerOrderAddProductRegExp = /bo.demo.gparts.eu\/Base\/CustomerOrder\/AddProduct/m;

        that.urlPreOrderCreateCARegExp = /bo.demo.gparts.eu\/Base\/PreOrder\/CreateCA/m;
        that.urlPreOrderAddProductRegExp = /bo.demo.gparts.eu\/Base\/PreOrder\/AddProduct/m;
        that.urlPreOrderIndexRegExp = /bo.demo.gparts.eu\/Base\/PreOrder/m;

        //step for login
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

        //step for search form
        else if (that.resultRegExp.test(window.location.href)) {

            that.getStorageDataAsync(function (storage) {

                //detect when we are ordering
                if (storage.status == CONST_CatalogStatusOrdering) {

                    //find single corresponding product, then click to order
                    var selection = $('table tbody tr.product').not('.cross-ref').filter(function () {
                        var code = $(this).attr('data-product-code');
                        var $make = $(this).find('span.code').clone();
                        $make.find('b').remove();
                        var make = $make.text().cleanText();
                        return make == storage.request.pendingItemList[0].make && code == storage.request.pendingItemList[0].code;
                    });
                    if (selection.length == 1) {
                        //click to add to cart
                        selection.find('td:eq(2)').click();
                    }
                    else {
                        that.closeOrderRequest(storage, "ARTICLE NON-IDENTIFIABLE SUR LE CATALOGUE: " + storage.request.pendingItemList[0].make + " " + storage.request.pendingItemList[0].code);
                    }
                    return;
                }

                //attach event listener to process product cross result
                document.addEventListener('WebSearchCrossRef', function (e) {
                    var results = [];

                    //iterate each result
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

                var results = [];

                //process current showed results
                $('table tbody tr.product').not('.cross-ref').each(function () {
                    var code = $(this).attr('data-product-code');
                    var $make = $(this).find('span.code');
                    $make.find('b').remove().clone();;
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

        //step event occurs on when user edit CustomerOrder or PreOrder
        else if (that.urlCustomerOrderCreateCARegExp.test(window.location.href) || that.urlCustomerOrderAddProductRegExp.test(window.location.href) ||
            that.urlPreOrderCreateCARegExp.test(window.location.href) || that.urlPreOrderAddProductRegExp.test(window.location.href)) {

            //we work with XHR only
            document.addEventListener('XHRResponse', function (e) {

                //run after DOM update involved by XHR !!!
                setTimeout(function () {

                    that.getStorageDataAsync(function (storage) {

                        //only when order processing
                        if (storage.status != CONST_CatalogStatusOrdering)
                            return;

                        //after load or add lines
                        if (e.detail.includes('ReadLine') || e.detail.includes('AddLine')) {

                            // check we are still processing product item
                            if (storage.request.pendingItemList && storage.request.pendingItemList.length > 0) {

                                //getproduct code on the top
                                var currentCode = $('.k-grid tbody tr:eq(0) td:eq(1) b').text().cleanText();

                                //check last added line corrsponding to our item
                                if (currentCode == storage.request.pendingItemList[0].code) {

                                    //flag hasCustomerOrder or hasPreOrder
                                    if (that.urlCustomerOrderAddProductRegExp.test(window.location.href))
                                        storage.request.hasCustomerOrder = true;
                                    else
                                        storage.request.hasPreOrder = true;

                                    that.setStorageDataAsync(storage, function () {
                                        //set item quantity for the current product
                                        document.dispatchEvent(new CustomEvent('callFuncByNameW2P', { detail: { funcName: 'setAndValidateLastOrderProductQuantity', p1: storage.request.pendingItemList[0].quantity } }));
                                    });
                                }
                            }
                            else {

                                //check if we are not in initializing phase
                                if (storage.request.initializing == false) {
                                    //check we need to validate displayed CustomerOrder or PreOrder
                                    if (that.needToValidateOrderForm(storage, e.detail.includes('CustomerOrder'), e.detail.includes('PreOrder')))
                                        that.validateOrder(storage, e.detail.includes('CustomerOrder'));
                                }
                                //otherwise that means we are starting new order process ...
                                else {

                                    //clear all existing order lines and initialize all flags
                                    storage.request.pendingItemList = [];
                                    storage.request.initializing = true;
                                    storage.request.hasCustomerOrder = false;
                                    storage.request.isCustomerOrderValidated = false;
                                    storage.request.hasPreOrder = false;
                                    storage.request.isPreOrderValidated = false;
                                    storage.request.successMessage = '';

                                    that.setStorageDataAsync(storage, function () {
                                        //cancel existing CustomerOrder & PreOrder
                                        //CustomerOrder case
                                        if (that.urlCustomerOrderCreateCARegExp.test(window.location.href))
                                            $('button.cancel-form').trigger('click');
                                        //PreOrder case
                                        else
                                            document.dispatchEvent(new CustomEvent('callFuncByName', { detail: { funcName: 'cancelForm' } }));

                                        //confirm cancel popup 
                                        setTimeout(function () { $('.bootbox [data-bb-handler="confirm"]').trigger('click'); }, 200);
                                    });
                                }
                            }
                        }
                        //after change quantity
                        else if (e.detail.includes('ChangeLineQuantity')) {
                            //shift current item to continue
                            storage.request.pendingItemList.shift();
                            that.setStorageDataAsync(storage, function () {
                                //more items to order ?
                                if (storage.request.pendingItemList.length > 0) {
                                    window.top.postMessage({ id: 'searchProduct', term: storage.request.pendingItemList[0].code }, '*');
                                }
                                //otherwise validate current order
                                else {
                                    that.validateOrder(storage, e.detail.includes('CustomerOrder'));
                                }
                            });
                        }
                    });
                }, 200);
            });
        }

        //when list lastest orders
        else if (that.urlCustomerOrderIndexRegExp.test(window.location.href)) {

            //we work with XHR only
            document.addEventListener('XHRResponse', function (e) {

                //run after DOM update invloved by XHR !!!
                setTimeout(function () {
                    that.getStorageDataAsync(function (storage) {

                        //only when order processing
                        if (storage.status != CONST_CatalogStatusOrdering)
                            return;

                        //after order listing load
                        if (e.detail.includes('CustomerOrder/Read')) {

                            //check if we are not in initializing phase
                            if (storage.request.initializing == false) {

                                //read generated CustomerOrder: it shall perfectly match request reference to be satisfy unicity
                                var match = $('.k-grid tbody tr[data-uid] td:eq(4)').filter(function () {
                                    return $(this).text().includes(storage.request.reference);
                                });
                                if (match.length == 1) {
                                    storage.request.successMessage += "COMMANDE #" + match.closest('tr').find('td:eq(1)').text().cleanText() + '\r\n';
                                }
                                else {
                                    that.closeOrderRequest(storage, "IMPOSSIBLE DE LIRE LE NUMERO DE COMMANDE GENERE");
                                    return;
                                }
                            }

                            //check order processing is completed, then close it
                            if (storage.request.initializing == false && !that.needToValidateOrderForm(storage)) {
                                that.closeOrderRequest(storage);
                                return;
                            }
                            else {
                                //navigate from CustomerOrder to PreOrder
                                that.setStorageDataAsync(storage, function () {
                                    window.top.postMessage({ id: 'navigateToPreOrder' }, '*');
                                });
                            }
                        }
                    });
                }, 0);
            });
        }

        //when list lastest preorders
        else if (that.urlPreOrderIndexRegExp.test(window.location.href)) {

            //we work with XHR only
            document.addEventListener('XHRResponse', function (e) {

                //run after DOM update invloved by XHR !!!
                setTimeout(function () {
                    that.getStorageDataAsync(function (storage) {

                        //only when order processing
                        if (storage.status != CONST_CatalogStatusOrdering)
                            return;

                        //after order listing load
                        if (e.detail.includes('PreOrder/Read')) {

                            //check if we are not in initializing phase
                            if (storage.request.initializing == false) {

                                //read generated PreOrder: it shall perfectly match request reference to be satisfy unicity
                                var match = $('.k-grid tbody tr[data-uid] td:eq(5)').filter(function () {
                                    return $(this).text().includes(storage.request.reference);
                                });
                                if (match.length == 1) {
                                    storage.request.successMessage += "PRECO #" + match.closest('tr').find('td:eq(1)').text().cleanText() + '\r\n';
                                }
                                else {
                                    that.closeOrderRequest(storage, "IMPOSSIBLE DE LIRE LE NUMERO DE PRE-COMMANDE GENERE");
                                    return;
                                }
                            }

                            //check order processing is completed
                            if (storage.request.initializing == false && !that.needToValidateOrderForm(storage)) {
                                that.closeOrderRequest(storage);
                                return;
                            }
                            else {
                                that.setStorageDataAsync(storage, function () {
                                    //navigate from PreOrder to CustomerOrder if need be
                                    if (storage.request.hasCustomerOrder)
                                        window.top.postMessage({ id: 'navigateToCustomerOrder' }, '*');
                                    //otherwise we just finished to cancel both CustomerOrder and PreOrder, 
                                    else {
                                        //we consider initialization completed and start to process each order item
                                        storage.request.initializing = false;
                                        storage.request.pendingItemList = storage.request.items.slice();
                                        that.setStorageDataAsync(storage, function () {
                                            //start to search first item
                                            window.top.postMessage({ id: 'searchProduct', term: storage.request.pendingItemList[0].code }, '*');
                                        });
                                    }
                                });
                            }
                        }
                    });
                }, 0);
            });
        }

        window.onmessage = function (e) {
            //make a new product search action
            if (e.data.id == 'searchProduct') {
                $('.input-product-search').val(e.data.term);
                $('.button-product-search').click();
            }
            //go to PreOrder edition action
            else if (e.data.id == 'navigateToPreOrder') {
                $('a.gpart-cart .fa-asterisk').trigger('click');
            }
            //go to Order edition action
            else if (e.data.id == 'navigateToCustomerOrder') {
                $('a.gpart-cart .fa-shopping-cart').trigger('click');
            }
        };
    }

    //returns true if current order request needs CustomerOrder/PreOrder form validation ,depending of request state
    needToValidateOrderForm(storage, checkCustomerOrder, checkPreOrder) {
        var that = this;

        //flag to test CustomerOrder state too
        checkCustomerOrder = checkCustomerOrder == undefined ? true : checkCustomerOrder;
        //flag to test PreOrder state too
        checkPreOrder = checkPreOrder == undefined ? true : checkPreOrder;
        //is CustomerOrder form needs to be validated ?
        if (checkCustomerOrder && storage.request.hasCustomerOrder && !storage.request.isCustomerOrderValidated)
            return true;
        //is PreOrder form needs to be validated ?
        if (checkPreOrder && storage.request.hasPreOrder && !storage.request.isPreOrderValidated)
            return true;
        //no validation at this point
        return false;
    }

    //validate current Order form
    validateOrder(storage, isCustomerOrder) {
        var that = this;

        //set order note
        $('textarea[id="Note"]').text(storage.request.reference + " " + (storage.request.note ? storage.request.note : ''));

        //check we finish CustomerOrder, then update hasCustomerOrder flag
        if (isCustomerOrder)
            storage.request.isCustomerOrderValidated = true;
        //check we finish PreOrder, then update hasPreOrder flag
        else
            storage.request.isPreOrderValidated = true;

        //control all product in the grid lines match order request items (make + code + quantity)
        var errorMessageList = [];
        $('.k-grid tbody tr[data-uid]').has('.btn-trash').each(function (index, listItem) {
            var make = $(this).find('td:eq(1) div:eq(0)').clone();
            make.find('b').remove();
            make = make.text().cleanText();
            var code = $(this).find('td:eq(1) div:eq(0) b').text().cleanText();
            var quantity = parseInt($('.k-grid tbody tr[data-uid]').has('.btn-trash').find('td:eq(' + (isCustomerOrder ? '5' : '4') + ') input.quantity').val());
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
                $('#tab-info .form-actions button.validate-form').trigger('click');
            });
        }
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
        if (errorMessage)
            console.error(errorMessage);
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
    orderProduct(request) {
        var that = this;
        that.setStorageDataAsync({ status: CONST_CatalogStatusOrdering, request: request }, function () {
            //access to order to clear all items if need be
            window.top.postMessage({ id: 'navigateToCustomerOrder' }, '*');
        });
    }
}
