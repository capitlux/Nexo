const CONST_LastSearchTerm = 'LastSearchTerm';
const CONST_SearchRequestFromContextMenu = 'SearchRequestFromContextMenu';
const CONST_SearchRequestFromShortcut = 'SearchRequestFromShortcut';

const CONST_SearchStatusSearching = 0;
const CONST_SearchStatusSearchIdNotFound = 1;
const CONST_SearchStatusCompleted = 2;

const CONST_QuantityRequestStatusProcessing = 0;
const CONST_QuantityRequestStatusSearchIdNotFound = 1;
const CONST_QuantityRequestStatusRequestIdNotFound = 2;
const CONST_QuantityRequestStatusCompleted = 3;

String.prototype.formatProductCode = function formatProductCode() {
    return this.replace(/[^0-9a-z\/]/gi, '').toUpperCase();
};

String.prototype.toNumber = function toNumber() {
    var cleanedStr = this.replace(/[^0-9\.,]/gi, '').replace(',', '.');
    return parseFloat(cleanedStr);
};

String.prototype.cleanText = function cleanText() {
    return this.replace(/\s+/g, ' ').trim().toUpperCase();

};

String.prototype.truncate = function truncate(n) {
    return (this.length > n) ? this.substr(0, n - 1) + '&hellip;' : this;
};

function syncWebAppSupplierList() {
    //Post results
    $.ajax({
        type: "GET",
        contentType: "application/json",
        url: CONST_WebAppBaseUrl + "/api/service/GetSupplierList",
        dataType: 'json',
        success: function (data) {
            localStorage.setItem('WebAppSupplierList', JSON.stringify(data));
        }
    });
}

stringSimilarity = function (str1, str2, substringLength, caseSensitive) {
    if (substringLength === void 0) { substringLength = 2; }
    if (caseSensitive === void 0) { caseSensitive = false; }
    if (!caseSensitive) {
        str1 = str1.toLowerCase();
        str2 = str2.toLowerCase();
    }
    if (str1.length < substringLength || str2.length < substringLength)
        return 0;
    var map = new Map();
    for (var i = 0; i < str1.length - (substringLength - 1); i++) {
        var substr1 = str1.substr(i, substringLength);
        map.set(substr1, map.has(substr1) ? map.get(substr1) + 1 : 1);
    }
    var match = 0;
    for (var j = 0; j < str2.length - (substringLength - 1); j++) {
        var substr2 = str2.substr(j, substringLength);
        var count = map.has(substr2) ? map.get(substr2) : 0;
        if (count > 0) {
            map.set(substr2, count - 1);
            match++;
        }
    }
    return (match * 2) / (str1.length + str2.length - ((substringLength - 1) * 2));
};