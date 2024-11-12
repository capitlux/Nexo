
class HessCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        that.listeningUrl = 'https://web2.carparts-cat.com';

        if (window.location.href.indexOf(that.listeningUrl) != -1) {

            var actualCode = '(' + function () {
                //catch Ajax query success
                $(document).ajaxSuccess(function (event, request, settings, data) {
                    //assert is product search query result
                    if (settings.url.startsWith('./ERP.aspx/GetErpInfosAL')) {
                        //return data to content script
                        document.dispatchEvent(new CustomEvent('GetErpInfosAL', { detail: data }));
                        //load product images
                        $('.articleThumbNail').click();
                    }
                });

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

            //process product query result
            document.addEventListener('GetErpInfosAL', function (e) {
                that.lastLoadedProducts = JSON.parse(e.detail);
            });

            //process product image result
            document.addEventListener('GetImgUrls', function (e) {
                //load base64 image
                imgLoad(e.detail.imageUrl).then(function (base64Image) {
                    var results = [];
                    //for each product
                    for (var i = 0; i < that.lastLoadedProducts.length; i++) {
                        var product = that.lastLoadedProducts[i];
                        //get code from JSON
                        var code = product.KArtNr;

                        //find corresponding product
                        if (code != e.detail.code)
                            continue;

                        //find corresponding UI element
                        var $codeElem = $('.pnl_link_haendlernr nobr:contains("' + code + '")');
                        $('#main_artikel_panel_maintable').find('.al_infolink, .tooltiptext').remove();
                        results.push({
                            vendor: that.id,
                            make: $.trim($codeElem.closest('.main_artikel_panel_tr_artikel').prevAll('.main_artikel_panel_tr_einspeiser').eq(0).text()),
                            code: product.EArtNr,
                            description: $codeElem.closest('.main_artikel_panel_tr_artikel').next().find('.tc_prop').text().cleanText(),
                            image: base64Image,
                            priceBase: product.Preisdaten.Gesamtpreis.toNumber(),
                            pricePurchase: product.Preisdaten.GesamtEKpreis.toNumber(),
                            quantity: product.Menge.toNumber(),
                            available: product.AvailState == 1 || product.AvailState == 4,
                            deliveryInfo: product.AvailState == 1 ? 'Disponible' : (product.AvailState == 4 ? 'Disponible en 24H' : '')
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

            }, false);
        }
    }
    getSearchInput() {
        return $('#tp_articlesearch_txt_articleSearch');
    }
    getSearchButton() {
        return $('#tp_articlesearch_articleSearch_imgBtn');
    }
    searchProduct(term) {
        var that = this;
        that.getSearchInput().val(term);
        that.getSearchButton().click();
    }
}
