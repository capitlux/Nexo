var searchTerm = null;
var searchResultIntervalId = null;
var searchResultRawData = [];
var searchResultLastUpdate = new Date();


$(document).ready(function () {

    //retrive searchTerm in localStorage
    var initSearchTermIntervalId = setInterval(function () {
        chrome.tabs.getCurrent(function (tab) {
            searchTerm = localStorage.getItem(CONST_LastSearchTerm + tab.id);
            if (searchTerm && settings) {
                clearInterval(initSearchTermIntervalId);
                init(searchTerm);
            }
        })
    }, 100);

    setInterval(function () {
        syncSettings();
    }, 1000 * 60);
    syncSettings();

});

function init(searchTerm) {

    //update Title
    document.title = "Résultats sur " + searchTerm;
    $('.page-title').html('<span>Résultats de recherche sur <b class="text-primary">' + searchTerm + '</b><span>');
    $('.progress.title').width($('.page-title span').width());
    //call server
    searchTermByAjax();
}