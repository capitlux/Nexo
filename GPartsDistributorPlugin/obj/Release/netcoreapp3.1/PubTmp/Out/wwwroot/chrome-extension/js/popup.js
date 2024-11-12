// injected and returned its results
function onPageDetailsReceived(pageDetails) {
    document.getElementById('code').focus().select();
}

// POST the data to the server using XMLHttpRequest
function addBookmark() {
    // Cancel the form submit
    event.preventDefault();

    // Prepare the data to be POSTed by URLEncoding each field's contents
    var code = encodeURIComponent(document.getElementById('code').value);
    alert(code);

    var message = {
        type: 'SearchRequest',
        term: code,
        contextMenuUrl: ''
    };
    chrome.tabs.query({}, function (tabs) {
        for (var i = 0; i < tabs.length; ++i) {
            chrome.tabs.sendMessage(tabs[i].id, message);
        }
    });
    window.setTimeout(window.close, 100);
}