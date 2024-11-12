function getDomain(url) {
    return url.split(/\/+/g)[1];
}

hotkeys.filter = function (event) {
    var tagName = (event.target || event.srcElement).tagName;
    hotkeys.setScope(/^(INPUT|TEXTAREA|SELECT)$/.test(tagName) ? 'input' : 'other');
    return true;
}

document.addEventListener('GPartsEventOpenCatalogFromQuotation', function (e) {
    chrome.runtime.sendMessage({
        id: 'GPartsEventOpenCatalogFromQuotation',
        quotationId: e.detail.quotationId,
        tabUrl: location.href
    });
});

if (window.location.href.includes('staging.fr.carsys.online')) {
    hotkeys('f1', function (event, handler) {
        event.preventDefault();
        try {
            switch (handler.key) {
                case 'f1':
                    chrome.runtime.sendMessage({ id: 'GPartsEventCloseCatalog' });
                    break;
            }
        }
        catch (error) { }
    });
}