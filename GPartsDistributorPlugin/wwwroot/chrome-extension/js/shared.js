const CONST_SearchRequestFromContextMenu = 'SearchRequestFromContextMenu';
const CONST_SearchRequest = 'SearchRequest';
const CONST_SearchRequestFromServer = 'SearchRequestFromServer';
const CONST_SearchResponse = 'SearchResponse';
const CONST_QuantityRequest = 'QuantityRequest';
const CONST_QuantityRequestFromServer = 'QuantityRequestFromServer';
const CONST_QuantityResponse = 'QuantityResponse';
const CONST_ProductOrderRequestFromServer = 'ProductOrderRequestFromServer';
const CONST_ProductOrderResponse = 'ProductOrderResponse';
const CONST_ProductOrderRequest = 'ProductOrderRequest';

const CONST_CatalogStatusIdle = 'Idle';
const CONST_CatalogStatusSearching = 'Searching';
const CONST_CatalogStatusSearchingCross = 'SearchingCross';
const CONST_CatalogQueryingQuantity = 'QueryingQuantity';
const CONST_CatalogStatusOrdering = 'Ordering';

const CONST_SetCatalogLocalStorage = 'SetCatalogLocalStorage';
const CONST_GetCatalogLocalStorage = 'GetCatalogLocalStorage';

const CONST_DotNetToBackground = 'DotNetToBackground';
const CONST_CatalogConfig = 'CatalogConfig';
const CONST_GetCatalogConfig = 'GetCatalogConfig';
const CONST_GetAllCatalogConfig = 'GetAllCatalogConfig';

const CONST_StorageKey = 'Plugin';

const CONST_SearchStatusSearching = 0;
const CONST_SearchStatusSearchIdNotFound = 1;
const CONST_SearchStatusCompleted = 2;

const CONST_QuantityRequestStatusProcessing = 0;
const CONST_QuantityRequestStatusSearchIdNotFound = 1;
const CONST_QuantityRequestStatusRequestIdNotFound = 2;
const CONST_QuantityRequestStatusCompleted = 3;

const CONST_ProductOrderStatusSessionIdNotFound = 0;
const CONST_ProductOrderStatusProcessing = 1;
const CONST_ProductOrderStatusFailed = 2;
const CONST_ProductOrderStatusSuccess = 3;

class ICatalog {
    constructor(id) {
        var that = this;
        //Catalog Id
        that.id = id;
        //Url able to catch the product search
        that.listeningRegExp = null;
    }

    //load data from storage
    getStorageData() {
        return JSON.parse(localStorage.getItem(CONST_StorageKey));
    }

    //set data from storage
    setStorageData(data) {
        return localStorage.setItem(CONST_StorageKey, JSON.stringify(data));
    }

    //load data from storage
    getStorageDataAsync(callBack) {
        chrome.runtime.sendMessage({ id: CONST_GetCatalogLocalStorage, catalogId: this.id }, callBack);
    }

    //set data from storage
    setStorageDataAsync(data, callBack) {
        chrome.runtime.sendMessage({ id: CONST_SetCatalogLocalStorage, catalogId: this.id, data: data }, callBack);
    }

    //update state
    updateStatusAsync(status, callBack) {
        var that = this;
        var data = that.getStorageDataAsync(function (data) {
            data.status = status;
            that.setStorageDataAsync(data, callBack)
        });
    }

    //reset storage
    resetStorageDataAsync(callBack) {
        var that = this;
        that.setStorageDataAsync(null, callBack);
    }

    //add product search code to pending list
    addPendingSearchAsync(items, callBack, unshift) {
        var that = this;
        that.getStorageDataAsync(function (data) {
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if (data.pendingSearchList.findIndex(x => x.code === item.code) === -1) {
                    if (unshift)
                        data.pendingSearchList.unshift(item);
                    else
                        data.pendingSearchList.push(item);
                }
            }
            that.setStorageDataAsync(data, callBack);
        });
    }

    //take product search code from pending list
    getNextPendingSearchAsync(callBack) {
        var that = this;
        that.getStorageDataAsync(function (data) {
            var item = data.pendingSearchList.shift();
            that.setStorageDataAsync(data, function () {
                callBack(item);
            });
        });
    }

    //reset storage
    resetStorageData() {
        var that = this;
        that.setStorageData({ state: "idle", searchTerm: null, pendingSearchList: [] });
    }

    //add product search code to pending list
    addPendingSearch(item, unshift) {
        var that = this;
        var data = that.getStorageData();
        if (data.pendingSearchList.findIndex(x => x.code === item.code) === -1) {
            if (unshift)
                data.pendingSearchList.unshift(item);
            else
                data.pendingSearchList.push(item);
            that.setStorageData(data);
        }
    }

    //take product search code from pending list
    getNextPendingSearch(codeInfo) {
        var that = this;
        var data = that.getStorageData();
        var item = data.pendingSearchList.shift();
        that.setStorageData(data);
        return item;
    }

    //update state
    updateState(state) {
        var that = this;
        var data = that.getStorageData();
        data.state = state;
        that.setStorageData(data);
    }
}

String.prototype.formatProductCode = function formatProductCode() {
    return this.toUpperCase().replace(/[^0-9a-z\/]/gi, '');
};

String.prototype.toNumber = function toNumber() {
    var cleanedStr = this.replace(/[^0-9\.,]/gi, '').replace(',', '.');
    return parseFloat(cleanedStr);
};

String.prototype.cleanText = function cleanText() {
    return this.replace(/\s+/g, ' ').trim();

};

String.prototype.truncate = function truncate(n) {
    return (this.length > n) ? this.substr(0, n - 1) + '&hellip;' : this;
};

function addXMLRequestCallback(callback, onSend, timeout) {
    this.callBackOnSend = onSend;
    var oldSend, i;
    if (XMLHttpRequest.callbacks) {
        // we've already overridden send() so just add the callback
        XMLHttpRequest.callbacks.push(callback);
    } else {
        // create a callback queue
        XMLHttpRequest.callbacks = [callback];
        // store the native send()
        oldSend = XMLHttpRequest.prototype.send;
        // override the native send()
        XMLHttpRequest.prototype.send = function () {

            if (timeout)
                this.timeout = timeout;  

            // process the callback queue
            // the xhr instance is passed into each callback but seems pretty useless
            // you can't tell what its destination is or call abort() without an error
            // so only really good for logging that a request has happened
            // I could be wrong, I hope so...
            // EDIT: I suppose you could override the onreadystatechange handler though
            this.lastSendArguments = arguments;
            if (callBackOnSend) {
                for (i = 0; i < XMLHttpRequest.callbacks.length; i++) {
                    XMLHttpRequest.callbacks[i](this);
                }
            }
            else {
                this.addEventListener('readystatechange', function () {
                    if (this.readyState === 4 && this.status === 200) {
                        for (i = 0; i < XMLHttpRequest.callbacks.length; i++) {
                            XMLHttpRequest.callbacks[i](this);
                        }
                    }
                }, false);
            }
            // call the native send()
            oldSend.apply(this, arguments);
        }
    }
}

function plugJsCodeToDocument(textContent, beforeLoad) {
    executeJS(function () {
        var script = document.createElement('script');
        script.textContent = textContent;
        (document.head || document.documentElement).appendChild(script);
        script.parentNode.removeChild(script);
    }, beforeLoad);
}

function plugJQuerytoDocument(readyCallback, beforeLoad) {
    executeJS(function () {
        var script = document.createElement("script");
    script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js';
    script.type = 'text/javascript';
    script.onload = function () {
        $(document).ready(readyCallback);
    };
    (document.head || document.documentElement).appendChild(script);
        script.parentNode.removeChild(script);
    }, beforeLoad);
}

function plugJsCallFuncByName() {
    plugJsCodeToDocument('(' + function () {
        document.addEventListener('callFuncByName', function (e) {
            var data = e.detail;
            window[data.funcName]();
        });
    } + ')();');
}

function plugJsCallFuncByNameW2P() {
    plugJsCodeToDocument('(' + function () {
        document.addEventListener('callFuncByNameW2P', function (e) {
            var data = e.detail;
            window[data.funcName](data.p1, data.p2);
        });
    } + ')();');
}

function executeJS(fn, beforeLoad) {
    if (!beforeLoad) {
        // see if DOM is already available
        if (document.readyState === "complete" || document.readyState === "interactive") {
            // call on next available tick
            setTimeout(fn, 1);
        } else {
            document.addEventListener("DOMContentLoaded", fn);
        }
    }
    else
        fn();
}

function imgLoad(url) {
    'use strict';
    // Create new promise with the Promise() constructor;
    // This has as its argument a function with two parameters, resolve and reject
    return new Promise(function (resolve, reject) {
        // Standard XHR to load an image
        var request = new XMLHttpRequest();
        request.open('GET', url);
        request.responseType = 'blob';

        // When the request loads, check whether it was successful
        request.onload = function () {
            if (request.status === 200) {
                // If successful, resolve the promise by passing back the request response
                request.response.arrayBuffer().then(function (buffer) {
                    //resolve('data:image/png;base64,' + btoa(String.fromCharCode.apply(null, new Uint8Array(buffer))));
                    resolve('data:image/png;base64,' + btoa(new Uint8Array(buffer).reduce(function (data, byte) {
                        return data + String.fromCharCode(byte);
                    }, '')));
                });
            } else {
                // If it fails, reject the promise with a error message
                reject(new Error('Image didn\'t load successfully; error code:' + request.statusText));
            }
        };

        request.onerror = function () {
            // Also deal with the case when the entire request fails to begin with
            // This is probably a network error, so reject the promise with an appropriate message
            reject(new Error('There was a network error.'));
        };

        // Send the request
        request.send();
    });
}

function _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function sleep(ms) {
    await _sleep(ms);
}

function getRegexFirstGroup(regex, str) {
    let m;
    let result = null;
    while ((m = regex.exec(str)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }

        // The result can be accessed through the `m`-variable.
        m.forEach((match, groupIndex) => {
            if (groupIndex == 1)
                result = match;
        });
    }
    return result;
}