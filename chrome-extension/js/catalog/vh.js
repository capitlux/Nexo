const CONST_VH_SearchCross = 'searchCross';


class VanHeckCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        that.listeningUrl = 'https://www.partsnet.fr/cross/default.aspx';
        that.productInfoUrl = 'https://www.partsnet.fr/instantorder/instantorder.aspx';

        //assert we are on listening page
        if (window.location.href.indexOf(that.listeningUrl) != -1) {

            //assert we are searching cross
            if (that.getStorageData().state == CONST_VH_SearchCross) {

                //prepare next state
                that.updateState("getCodeInfo");
                //for each cross result
                $('#tblMain .Hoofdschermkader .Scrollable td:first-child').each(function () {
                    if ($(this).text().formatProductCode() === that.getStorageData().searchTerm.formatProductCode()) {
                        that.addPendingSearch({ code: $(this).next().text() });
                    }
                });
                //go to next step to search each cross result
                window.location.href = that.productInfoUrl;
            }
        }
        //assert we are on get product info page
        else if (window.location.href.indexOf(that.productInfoUrl) != -1) {
            //.............................................................
            //...SSSSSSS....TTTTTTTTTTT..AAAA.....ARRRRRRRRRR..RTTTTTTTTT..
            //..SSSSSSSSS...TTTTTTTTTTT.AAAAAA....ARRRRRRRRRRR.RTTTTTTTTT..
            //..SSSSSSSSSS..TTTTTTTTTTT.AAAAAA....ARRRRRRRRRRR.RTTTTTTTTT..
            //.SSSSS..SSSS.....TTTT.....AAAAAAA...ARRR....RRRR.....TTTT....
            //.SSSSS...........TTTT....AAAAAAAA...ARRR....RRRR.....TTTT....
            //..SSSSSSS........TTTT....AAAAAAAA...ARRRRRRRRRRR.....TTTT....
            //...SSSSSSSSS.....TTTT....AAAA.AAAA..ARRRRRRRRRR......TTTT....
            //.....SSSSSSS.....TTTT...TAAAAAAAAA..ARRRRRRRR........TTTT....
            //........SSSSS....TTTT...TAAAAAAAAAA.ARRR.RRRRR.......TTTT....
            //.SSSS....SSSS....TTTT..TTAAAAAAAAAA.ARRR..RRRRR......TTTT....
            //.SSSSSSSSSSSS....TTTT..TTAA....AAAA.ARRR...RRRRR.....TTTT....
            //..SSSSSSSSSS.....TTTT..TTAA....AAAAAARRR....RRRR.....TTTT....
            //...SSSSSSSS......TTTT.TTTAA.....AAAAARRR.....RRRR....TTTT....
            //.............................................................
            var actualCode = '(' + function () {

                //avoid blocking alert
                window.alert = function () { return true; };

                //CheckArtikelCallBack
                var oldCheckArtikelCallBack = window.CheckArtikelCallBack;
                window.CheckArtikelCallBack = function (result) {
                    oldCheckArtikelCallBack(result);
                    var sOutput = result.split('~');
                    switch (sOutput[0]) {
                        case 'N':
                        case 'V':
                            //No result, go to next
                            window.location.reload();
                            break;
                        case 'M':
                            //Multiple result
                            var sArtikelen = sOutput[2].split('`');
                            document.pendingMultiProducts = [];
                            for (var i = sArtikelen.length - 2; i >= 0  ; i--) {
                                var productInfo = sArtikelen[i].split('^');
                                //Search each multiple but with group
                                document.dispatchEvent(new CustomEvent('addPendingSearch', { detail: { code: productInfo[0], grp: productInfo[1] } }));
                            }
                            //Continue
                            window.location.reload();
                            break;
                        default:
                            //set quantity
                            $('#numAantal').val(1);
                            //get product info !!!
                            window.StuurA01();
                            break;
                    }
                };

                //OntvangA02
                var oldOntvangA02 = window.OntvangA02;
                window.OntvangA02 = function (result) {
                    oldOntvangA02(result);
                    document.dispatchEvent(new CustomEvent('OntvangA02'));
                };

                addXMLRequestCallback(function (xhr) {
                    if (xhr.responseURL.includes('ArtikelZoekenAutocompleteMetCross')) {
                        $('#numAantal').focus();
                    }
                }, true);

            } + ')();';
            //........................................
            //.EEEEEEEEEEE.ENNN...NNNN..NDDDDDDDD.....
            //.EEEEEEEEEEE.ENNNN..NNNN..NDDDDDDDDD....
            //.EEEEEEEEEEE.ENNNN..NNNN..NDDDDDDDDDD...
            //.EEEE........ENNNNN.NNNN..NDDD...DDDD...
            //.EEEE........ENNNNN.NNNN..NDDD....DDDD..
            //.EEEEEEEEEE..ENNNNNNNNNN..NDDD....DDDD..
            //.EEEEEEEEEE..ENNNNNNNNNN..NDDD....DDDD..
            //.EEEEEEEEEE..ENNNNNNNNNN..NDDD....DDDD..
            //.EEEE........ENNNNNNNNNN..NDDD....DDDD..
            //.EEEE........ENNN.NNNNNN..NDDD...DDDDD..
            //.EEEEEEEEEEE.ENNN..NNNNN..NDDDDDDDDDD...
            //.EEEEEEEEEEE.ENNN..NNNNN..NDDDDDDDDD....
            //.EEEEEEEEEEE.ENNN...NNNN..NDDDDDDDD.....
            //........................................

            plugJsCallFuncByName();
            plugJsCodeToDocument(addXMLRequestCallback);
            plugJsCodeToDocument(actualCode);

            // When jQuery is ready, then ...
            plugJQuerytoDocument(function () {
                var nextItem = that.getNextPendingSearch();
                if (nextItem) {
                    //set code
                    that.getSearchInput().val(nextItem.code);

                    if (!nextItem.grp) {
                        //check product group
                        document.dispatchEvent(new CustomEvent('callFuncByName', { detail: { funcName: 'CheckArtikel' } }));
                    }
                    else {
                        //set product grp
                        that.getSearchInputGroup().val(nextItem.grp);
                        //set quantity
                        that.getSearchInputQty().val(1);
                        //directly get product info !!!
                        document.dispatchEvent(new CustomEvent('callFuncByName', { detail: { funcName: 'StuurA01' } }));
                    }
                }
                else {
                    that.resetStorageData();
                    window.location.href = that.listeningUrl;
                }
            });

            document.addEventListener('addPendingSearch', function (e) {
                that.addPendingSearch(e.detail, true);
            });

            document.addEventListener('OntvangA02', function (e) {

                imgLoad($('#imgPlaatje').attr('src')).then(function (base64Image) {
                    var results = [];

                    results.push({
                        vendor: that.id,
                        make: $.trim($('#txtFabrikant').text()),
                        code: $('#txtArtikel').val(),
                        description: [$.trim($('#txtOmschrijving').text()), $.trim($('#txtSysteem').text()), $.trim($('#txtOpmerking').text())].filter(Boolean).join(' ').cleanText(),
                        image: base64Image,
                        priceBase: $('#txtBrutoN').text().toNumber(),
                        pricePurchase: $('#txtNettoN').text().toNumber(),
                        quantity: $('#txtResponseNA').text().toNumber(),
                        available: $('#txtResponseNA').text().toNumber() > 0,
                        deliveryInfo: $('#txtLevertijdNA').text(),
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
                    chrome.runtime.sendMessage(message);

                    window.location.reload();
                });
                
            }, false);
        }
    }
    getSearchInput() {
        return $('#txtArtikel');
    }
    getSearchButton() {
        return $('#T_Info');
    }
    getSearchInputQty() {
        return $('#numAantal');
    }
    getSearchInputGroup() {
        return $('#txtArtgroepN');
    }
    getSearchCrossInput() {
        return $('#ctl11');
    }
    getSearchCrossButton() {
        return $('#B_Zoek');
    }
    searchProduct(term) {
        var that = this;
        that.setStorageData({ state: CONST_VH_SearchCross, searchTerm: term, pendingSearchList: [{ code: term }] });
        that.getSearchCrossInput().val(term);
        that.getSearchCrossButton().click();
    }
}
