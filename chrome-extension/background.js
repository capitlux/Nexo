var curSearchingTerm = null;

// Set up the context menus
chrome.contextMenus.create({
    "id": CONST_ContextMenuProductSearch,
    "title": "Rechercher %s sur tous les catalogues",
    "contexts": ["selection"]
});

chrome.contextMenus.onClicked.addListener(function (e, tab) {
    if (e.menuItemId === CONST_ContextMenuProductSearch) {

        //get the URL of the frame or (if none) the page
        var currentURL = e.frameUrl || e.pageUrl;

        //get searching term
        curSearchingTerm = e.selectionText;

        //prepare message
        var message = {
            id: CONST_ContextMenuProductSearch,
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

// In the background script. Message being relayed to filler.js, the receiving content script.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    alert('Ok');
    return true; // Required to keep message port open
});