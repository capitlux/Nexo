var curSearchingTerm = null;

// Set up the context menus
chrome.contextMenus.create({
    "id": CONST_SearchRequestFromContextMenu,
    "title": "Rechercher %s sur tous les catalogues",
    "contexts": ["selection"]
});

chrome.contextMenus.onClicked.addListener(function (e, tab) {
    if (e.menuItemId === CONST_SearchRequestFromContextMenu) {

        //get the URL of the frame or (if none) the page
        var currentURL = e.frameUrl || e.pageUrl;

        //get searching term
        curSearchingTerm = e.selectionText;

        //prepare message
        var message = {
            id: CONST_SearchRequestFromContextMenu,
            term: curSearchingTerm,
            contextMenuUrl: currentURL
        };

        //dispatch event on all tabs
        chrome.tabs.query({}, function (tabs) {
            for (var i = 0; i < tabs.length; ++i) {
                chrome.tabs.sendMessage(tabs[i].id, message);
            }
        });

        //open result page
        chrome.tabs.create({ url: chrome.runtime.getURL("product-search-result.html") });
    }
});

// Listening to messages in Context Script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    var that = this;
    switch (message.id) {
        case CONST_CatalogConfig:
            localStorage.setItem(CONST_StorageKey, JSON.stringify(message.configList));
            for (var i = 0; i < message.configList.length; i++) {
                var catalogConf = message.configList[i];
                chrome.tabs.create({ url: catalogConf.Url });
            }
            break;
        case CONST_GetCatalogConfig:
            var configList = JSON.parse(localStorage.getItem(CONST_StorageKey));
            var result = null;
            for (var i = 0; i < configList.length; i++) {
                var catalogConf = configList[i];
                if (catalogConf.Id == message.catalogId) {
                    result = catalogConf;
                    break;
                }
            }
            sendResponse(result);
            break;
        case CONST_GetAllCatalogConfig:
            var configList = JSON.parse(localStorage.getItem(CONST_StorageKey));
            sendResponse(configList);
            break;
        case CONST_SearchRequestFromServer:
            //prepare request
            var request = {
                id: CONST_SearchRequest,
                originType: CONST_SearchRequestFromServer,
                serverUrlBase: message.serverUrlBase,
                searchId: message.searchId,
                term: message.searchTerm
            };

            //dispatch event on all tabs
            chrome.tabs.query({}, function (tabs) {
                for (var i = 0; i < tabs.length; ++i) {
                    chrome.tabs.sendMessage(tabs[i].id, request);
                }
            });
            break;
        case CONST_QuantityRequestFromServer:
            //prepare request
            var request = {
                id: CONST_QuantityRequest,
                originType: CONST_QuantityRequestFromServer,
                serverUrlBase: message.serverUrlBase,
                requestId: message.requestId,
                catalogId: message.catalogId,
                make: message.make,
                code: message.code,
                quantity: message.quantity
            };

            //dispatch event on all tabs
            chrome.tabs.query({}, function (tabs) {
                for (var i = 0; i < tabs.length; ++i) {
                    chrome.tabs.sendMessage(tabs[i].id, request);
                }
            });
            break;
        case CONST_SearchResponse:
            console.dir(message);
            if (message.request.originType == CONST_SearchRequestFromServer) {
                //Post results
                $.ajax({
                    type: "POST",
                    contentType: "application/json",
                    url: message.request.serverUrlBase + "/CatalogService/PostSearchResponse",
                    dataType: 'json',
                    data: JSON.stringify(message),
                    success: function (ajaxResult) {
                    }
                });
            }
            break;
        case CONST_QuantityResponse:
            console.dir(message.request);
            if (message.request.originType == CONST_QuantityRequestFromServer) {
                //Post results
                $.ajax({
                    type: "POST",
                    contentType: "application/json",
                    url: message.request.serverUrlBase + "/CatalogService/PostQuantityResponse",
                    dataType: 'json',
                    data: JSON.stringify(message.request),
                    success: function (ajaxResult) {
                    }
                });
            }
            break;
        case CONST_SetCatalogLocalStorage:
            localStorage.setItem(message.catalogId, JSON.stringify(message.data));
            if (sendResponse)
                sendResponse();
            break;
        case CONST_GetCatalogLocalStorage:
            var result = JSON.parse(localStorage.getItem(message.catalogId));
            if (sendResponse)
                sendResponse(result);
            break;
    }
});