var curSearchingTerm = null;

// Set up the context menus
chrome.contextMenus.create({
    "id": CONST_SearchRequestFromContextMenu,
    "title": "Rechercher %s sur tous les catalogues",
    "contexts": ["selection"]
});

chrome.contextMenus.onClicked.addListener(function (e, tab) {
    if (e.menuItemId === CONST_SearchRequestFromContextMenu) {

        //get searching term
        curSearchingTerm = e.selectionText;

        openTabResult(curSearchingTerm);
    }
});

// Listening to messages in Context Script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    var that = this;
    switch (message.id) {
        case CONST_SearchRequestFromShortcut:
            openTabResult(message.searchTerm);
            break;
    }
});

function openTabResult(curSearchingTerm) {
    //open result page
    chrome.tabs.create({ url: chrome.runtime.getURL("product-search-result.html") }, function (newTab) {
        localStorage.setItem(CONST_LastSearchTerm + newTab.id, curSearchingTerm);
    });
}

setInterval(function () {
    syncWebAppSupplierList();
}, 1000 * 60);
syncWebAppSupplierList();