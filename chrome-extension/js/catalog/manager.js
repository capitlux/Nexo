// Use ES6 Object Literal Property Value Shorthand to maintain a map
// where the keys share the same names as the classes themselves
const CatalogCollection = {
    HessCatalog,
    VanHeckCatalog,
    CarestCatalog,
    ExadisCatalog
};

class DynamicCatalogCollection {
    constructor(className, opts) {
        return new CatalogCollection[className](opts);
    }
}

class CatalogManager {
    constructor() {

        var that = this;

        //register all catalog instances
        this.catalogList = [];

        for (var i = 0; i < CONST_SessionCatalog.length; i++) {
            var catalogConfig = CONST_SessionCatalog[i];
            that.catalogList.push(new DynamicCatalogCollection(catalogConfig.className, catalogConfig.id));
        }

        // Listening to messages in Context Script
        chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
            switch (message.id) {
                //notify catalog to search product
                case CONST_ContextMenuProductSearch:
                    for (var i = 0; i < that.catalogList.length; i++) {
                        if (window.location.href.indexOf(that.catalogList[i].listeningUrl) != -1) {
                            that.catalogList[i].searchProduct(message.term);
                        }
                    }
                    break;
            }
        });
    }
}

if (window.location.href.indexOf('https://www.partsnet.fr') != -1) {

    plugJsCodeToDocument('(' + function () {
        //avoid blocking alert
        window.alert = function () { return true; };
    } + ')();', true);
}

if (window.location.href.indexOf('http://gparts.carest.eu/Base/Product/webSearch') != -1) {
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

executeJS(function () {
    new CatalogManager();
});

document.addEventListener('coco', function (e) {
    //send message to bg
    chrome.runtime.sendMessage({
        id: '',
        term: '',
        results: ''
    });
});