var GParts = {
    lastEditingQuotationTabUrl: null,
    lastEditingQuotationId: null
};

function getDomain(url) {
    return url.split(/\/+/g)[1];
}

chrome.browserAction.onClicked.addListener((tab) => {
    var currentDomain = getDomain(tab.url);
    chrome.tabs.getAllInWindow(null, function (tabs) {
        for (var i = 0; i < tabs.length; i++) {
            var domain = getDomain(tabs[i].url);
            if (currentDomain === domain && tabs[i].index != tab.index) {
                chrome.tabs.remove(tabs[i].id, null);
            }
        }
    });
});

// Listening to messages in Context Script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    var that = this;
    switch (message.id) {
        case 'GPartsEventOpenCatalogFromQuotation':
            GParts.lastEditingQuotationTabUrl = message.tabUrl;
            GParts.lastEditingQuotationId = message.quotationId;
            break;
        case 'GPartsEventCloseCatalog':
            chrome.windows.getCurrent(w => {
                chrome.tabs.query({ active: true, windowId: w.id }, tabs => {
                    var activeTab = tabs[0];
                    var activeTabId = activeTab.id; // or do whatever you need
                    chrome.tabs.getAllInWindow(null, function (tabs) {
                        for (var i = 0; i < tabs.length; i++) {
                            if (tabs[i].url == GParts.lastEditingQuotationTabUrl) {
                                //Update the url here.
                                var domain = getDomain(tabs[i].url);
                                console.dir(domain + '/Api/Service/VHIPRetrieveToQuotation/' + GParts.lastEditingQuotationId);
                                chrome.tabs.update(tabs[i].id, { highlighted: true, url: domain + '/Api/Service/VHIPRetrieveToQuotation/' + GParts.lastEditingQuotationId });
                                chrome.tabs.remove(activeTabId, null);
                                //GParts.lastEditingQuotationTabUrl = null;
                                //GParts.lastEditingQuotationId = null;
                                break;
                            }
                        }
                    });
                });
            });
            break;
    }
});