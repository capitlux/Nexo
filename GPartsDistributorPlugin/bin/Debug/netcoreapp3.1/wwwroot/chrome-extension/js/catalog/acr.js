
class ACRCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;

        that.listeningRegExp = /(83\.206\.253\.1\/CCDISP\.HTM\?WSYD_EVENT=CCCOMM01|83\.206\.253\.1\/inwcgi\?WSYD_EVENT=CCRECA00)/m;
        that.loginRegExp = /83\.206\.253\.1\//m;

        if (that.listeningRegExp.test(window.location.href)) {

            var actualCode = '(' + function () {

                //avoid blocking alert
                window.alert = function (message) {
                    return true;
                };

                var finrechercheOld = window.finrecherche;
                window.finrecherche = function () {
                    finrechercheOld();
                    document.dispatchEvent(new CustomEvent('HasResult'));
                }
                addXMLRequestCallback(function (xhr) {
                    console.log(xhr.responseURL);

                    if (xhr.responseURL.includes('inwcgi?WSYD_EVENT=VGRAC539')) {
                        document.dispatchEvent(new CustomEvent('HasQuantityResult', { detail: { response: xhr.response } }));
                    }
                });

            } + ')();';
            plugJsCodeToDocument(addXMLRequestCallback);
            plugJsCodeToDocument(actualCode);

            //process product image result
            document.addEventListener('HasResult', function (e) {
                that.loadResult();
            }, false);

            //process product image result
            document.addEventListener('HasQuantityResult', function (e) {
                that.getStorageDataAsync(function (storage) {

                    var $response = $('<div>' + e.detail.response + '</div>');
                    $response.find('script').remove();

                    var availableQuantity = 0;
                    var $firstValidLine = $response.find('b').filter(function () {
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
    }

    loadResult() {
        var that = this;
        that.getStorageDataAsync(function (storage) {
            var results = [];
            $('[id="RA_detailarticle"].soustitre').each(function () {
                var code = $(this).find('td:eq(1)').text().cleanText();
                var description = $(this).find('td:eq(2)').text().cleanText();
                var $detail = $(this).closest('table').next(':has(#RA_detailarticle)');
                if ($detail.length == 1)
                    description += ' ' + $detail.text().cleanText();

                if (code.formatProductCode() != storage.request.term.formatProductCode()
                    && !description.formatProductCode().endsWith(storage.request.term.formatProductCode()))
                    return;

                var details = $(this).closest('table').nextAll(':has(#RA_description)').first().find('td:eq(2)').text();
                var make = getRegexFirstGroup(/Nom du fournisseur\s([A-Z\s]+) /gm, details).cleanText();
                var deliveryInfo = $(this).closest('table').nextAll(':has(#RA_description)').first().find('td:eq(2) div[id^="DispX"] b').text().cleanText();
                var available = $(this).closest('table').nextAll(':has(#RA_description)').first().find('td:eq(2) div[id^="DispX"] b').css('color') == 'rgb(0, 128, 0)';
                results.push({
                    vendor: that.id,
                    make: make,
                    code: code,
                    description: description,
                    image: null,
                    priceBase: getRegexFirstGroup(/Prix de vente :[^0-9,]+([0-9,]+)/gm ,details).toNumber(),
                    pricePurchase: getRegexFirstGroup(/Prix net HT :[^0-9,]+([0-9,]+)/gm, details).toNumber(),
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

    getSearchInput() {
        return $('#REREFE0000000001');
    }
    getSearchButton() {
        return $('#REREFE0000000001').closest('tr').nextAll('tr').find('#bouton3');
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
                    && getRegexFirstGroup(/Nom du fournisseur\s([A-Z\s]+) /gm, $(this).closest('table').nextAll(':has(#RA_description)').first().find('td:eq(2)').text()).cleanText() == request.make.cleanText()
            });
            $codeElem.closest('table').nextAll(':has(#RA_description)').first().find('input[id^="QTEX"]').val(request.quantity).get(0).dispatchEvent(new Event("keyup"));
        });
    }
}
