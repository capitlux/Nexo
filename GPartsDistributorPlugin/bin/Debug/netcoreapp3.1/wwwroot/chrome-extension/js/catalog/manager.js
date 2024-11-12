// Use ES6 Object Literal Property Value Shorthand to maintain a map
// where the keys share the same names as the classes themselves
const CatalogCollection = {
    HessCatalog,
    VanHeckCatalog,
    LocalCatalog,
    CarestCatalog,
    ExadisCatalog,
    DrivecatCatalog,
    EECCatalog,
    ACRCatalog,
    SafaPlusCatalog,
    DasirCatalog,
    LeroyCatalog
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
        chrome.runtime.sendMessage({ id: CONST_GetAllCatalogConfig }, (configList) => {
            for (var i = 0; i < configList.length; i++) {
                var catalogConfig = configList[i];
                that.catalogList.push(new DynamicCatalogCollection(catalogConfig.ClassName, catalogConfig.Id));
            }
        });

        // Listening to messages in Context Script
        chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
            switch (message.id) {
                //notify catalog to search product
                case CONST_SearchRequest:
                case CONST_QuantityRequest:
                case CONST_ProductOrderRequest:
                    for (var i = 0; i < that.catalogList.length; i++) {
                        if (that.catalogList[i].listeningRegExp && that.catalogList[i].listeningRegExp.test(window.location.href)) {
                            if (message.id == CONST_SearchRequest)
                                that.catalogList[i].searchProduct(message);
                            else if (message.id == CONST_QuantityRequest && message.catalogId == that.catalogList[i].id)
                                that.catalogList[i].requestQuantity(message);
                            else if (message.id == CONST_ProductOrderRequest && message.catalogId == that.catalogList[i].id)
                                that.catalogList[i].orderProduct(message);
                        }
                    }
                    break;
            }
        });
    }
}

executeJS(function () {
    new CatalogManager();
});

document.addEventListener(CONST_DotNetToBackground, function (e) {
    //send message to bg
    chrome.runtime.sendMessage(e.detail);
});