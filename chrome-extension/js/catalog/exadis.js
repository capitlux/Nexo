

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
        that.listeningUrl = 'http://ecat.exadis.fr/ecatvl';

        if (window.location.href.indexOf(that.listeningUrl) != -1) {

            // When jQuery is ready, then ...
            plugJQuerytoDocument(function () {
                //process product query result
                document.addEventListener('ecatASvc', function (e) {

                    var results = [];

                    //process direct results
                    $('.gridZone .ArticleResultGrid tbody tr').has('.StyleCheckBox').each(function () {

                        var priceList = $(this).find('td').eq(10).find('p').html().split('<br>');
                        var descrFull = '';
                        var $articleResultRestTD = $(this).next('tr').has('.articleResultRestTD');
                        if ($articleResultRestTD.length > 0)
                            descrFull = $articleResultRestTD.text().cleanText();

                        var available = false;
                        var deliveryInfo = '';
                        var $availableIcon = $(this).find('td').eq(11).find('img').attr('src');
                        if ($availableIcon.includes('DispoEnJPlus1')) {
                            available = true;
                            deliveryInfo = "DISPO EN J+1";
                        } else if ($availableIcon.includes('DispoImmediate')) {
                            available = true;
                            deliveryInfo = "DISPO";
                        }

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
                            available: available,
                            deliveryInfo: deliveryInfo
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
                });
            });
        }
    }
    getSearchInput() {
        return $('.searchZone.PiecesZone .EcatTextBox input');
    }
    getSearchButton() {
        return $('.searchZone.PiecesZone .SearchButton');
    }
    searchProduct(term) {
        var that = this;
        that.getSearchInput().val(term);
        that.getSearchButton().click();
    }
}
