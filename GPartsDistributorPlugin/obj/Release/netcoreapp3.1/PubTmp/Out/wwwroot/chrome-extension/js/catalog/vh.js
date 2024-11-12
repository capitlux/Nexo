
if (window.location.href.indexOf('https://www.partsnet.fr') != -1) {

    plugJsCodeToDocument('(' + function () {
        //avoid blocking alert
        window.alert = function (message) {
            if (message.includes("Nous n'avons malheureusement rien"))
                window.frames[1].document.location.href = 'https://www.partsnet.fr/instantorder/instantorder.aspx';
            return true;
        };
    } + ')();', true);
}


class VanHeckCatalog extends ICatalog {
    constructor(id) {
        super(id);

        var that = this;
        that.listeningRegExp = /www\.partsnet\.fr\/cross\/default\.aspx/m;
        that.listeningUrl = 'https://www.partsnet.fr/cross/default.aspx';
        that.productInfoUrl = 'https://www.partsnet.fr/instantorder/instantorder.aspx';
        that.loginUrl = 'https://www.partsnet.fr/login.aspx';
        that.menuUrl = 'https://www.partsnet.fr/menu.aspx';
        if (window.location.href.indexOf(that.loginUrl) != -1) {

            chrome.runtime.sendMessage({ id: CONST_GetCatalogConfig, catalogId: that.id }, (response) => {
                if (response) {
                    $('[name="Usernaam"]').val(response.Login);
                    $('[name="Password"]').val(response.Password);
                    $('[type="submit"]').click();
                }
            });
        }
        else if (window.location.href.indexOf(that.menuUrl) != -1) {
            $('#btnCrossen').click();
        }
        else if (that.listeningRegExp.test(window.location.href)) {

            //assert we are searching cross
            that.getStorageDataAsync(function (data) {
                if (data && data.status == CONST_CatalogStatusSearchingCross) {

                    //prepare next state
                    that.updateStatusAsync(CONST_CatalogStatusSearching, function () {
                        //for each cross result
                        var codes = [];
                        $('#tblMain .Hoofdschermkader .Scrollable td:first-child').each(function () {
                            if ($(this).text().formatProductCode() === data.request.term.formatProductCode()) {
                                codes.push({ code: $(this).next().text() });
                            }
                        });
                        that.addPendingSearchAsync(codes, function () {
                            //go to next step to search each cross result
                            window.location.href = that.productInfoUrl;
                        });
                    });
                }
            });
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
                window.alert = function (message) {
                    return true;
                };

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
                            var codes = [];
                            for (var i = sArtikelen.length - 2; i >= 0  ; i--) {
                                var productInfo = sArtikelen[i].split('^');
                                //Search each multiple but with group
                                codes.push({ code: productInfo[0], grp: productInfo[1] });
                            }
                            document.dispatchEvent(new CustomEvent('addPendingSearch', { detail: codes }));
                            //Continue
                            //window.location.reload();
                            break;
                        default:
                            //set quantity
                            //console.log($('#numAantal').val());
                            //$('#numAantal').val(1);
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
                that.getStorageDataAsync(function (storage) {
                    that.getNextPendingSearchAsync(function (nextItem) {
                        if (nextItem) {
                            //set code
                            that.getSearchInput().val(nextItem.code);
                            if (nextItem.quantity)
                                that.getSearchInputQty().val(nextItem.quantity);
                            else
                                that.getSearchInputQty().val(1);

                            if (!nextItem.grp) {
                                //check product group
                                document.dispatchEvent(new CustomEvent('callFuncByName', { detail: { funcName: 'CheckArtikel' } }));
                            }
                            else {
                                //set product grp
                                that.getSearchInputGroup().val(nextItem.grp);
                                //set quantity
                                //that.getSearchInputQty().val(1);
                                //directly get product info !!!
                                document.dispatchEvent(new CustomEvent('callFuncByName', { detail: { funcName: 'StuurA01' } }));
                            }
                        }
                        else {
                            //prepare message
                            var message = {
                                id: CONST_SearchResponse,
                                vendorId: that.id,
                                request: storage.request,
                                results: [],
                                searchStatus: CONST_SearchStatusCompleted
                            };
                            //send message to bg
                            chrome.runtime.sendMessage(message);
                            that.resetStorageDataAsync(function () {
                                window.location.href = that.listeningUrl;
                            });
                        }
                    });
                });
            });

            window.top.document.addEventListener('noCross', function (e) {
                //prepare next state
                that.updateStatusAsync(CONST_CatalogStatusSearching, function () {
                    window.location.href = that.productInfoUrl;
                });
            });

            document.addEventListener('addPendingSearch', function (e) {
                that.addPendingSearchAsync(e.detail, function () {
                    window.location.reload();
                }, true);
            });

            document.addEventListener('OntvangA02', function (e) {
                that.getStorageDataAsync(function (storage) {

                    if (storage.status == CONST_CatalogQueryingQuantity) {

                        storage.request.available = storage.request.quantity <= $('#txtResponseNA').text().toNumber();
                        storage.request.deliveryInfo = $('#txtResponseNA').text().toNumber() + ' ' + $('#txtLevertijdNA').text();
                        if ($('#txtResponseNB').text().toNumber() > 0) {
                            storage.request.deliveryInfo += ' / ' + $('#txtResponseNB').text().toNumber() + ' ' + $('#txtLevertijdNB').text();
                        }

                        //prepare message
                        var message = {
                            id: CONST_QuantityResponse,
                            request: storage.request
                        };

                        //send message to bg
                        chrome.runtime.sendMessage(message);

                        window.location.reload();
                    } else {

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
                            var message = {
                                id: CONST_SearchResponse,
                                vendorId: that.id,
                                request: storage.request,
                                results: results,
                                searchStatus: /*storage.pendingSearchList.length > 0 ? */CONST_SearchStatusSearching /*: CONST_SearchStatusCompleted*/
                            };

                            //send message to bg
                            chrome.runtime.sendMessage(message);

                            window.location.reload();
                        });
                    }

                }, false);
            });
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
    searchProduct(request) {
        var that = this;
        that.setStorageDataAsync({ status: CONST_CatalogStatusSearchingCross, request: request, pendingSearchList: [{ code: request.term }] }, function () {
            that.getSearchCrossInput().val(request.term);
            that.getSearchCrossButton().click();
        });
    }
    requestQuantity(request) {
        var that = this;
        that.setStorageDataAsync({ status: CONST_CatalogQueryingQuantity, request: request, pendingSearchList: [{ code: request.code, quantity: request.quantity }] }, function () {
            window.location.href = that.productInfoUrl;
        });
    }
}
