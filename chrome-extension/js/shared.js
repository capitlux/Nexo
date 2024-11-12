
const CAREST_CAT_URL = 'http://www.carest.eu';
const HESS_CAT_URL = 'https://web2.carparts-cat.com';
const VH_CAT_URL = 'https://www.partsnet.fr/instantorder/instantorder.aspx';
const EXADIS_CAT_URL = 'http://ecat.exadis.fr';
const SAFA_CAT_URL = 'http://safaplus.inoshop.net';

const CONST_ContextMenuProductSearch = 'ProductSearchRequest';
const CONST_ProductSearchResponse = 'ProductSearchResponse';
const CONST_StorageKey = 'Plugin';


class ICatalog {
    constructor(id) {
        var that = this;
        //Catalog Id
        that.id = id;
        //Url able to catch the product search
        that.listeningUrl = null;

        if (!that.getStorageData())
            that.resetStorageData();
    }

    //load data from storage
    getStorageData() {
        return JSON.parse(localStorage.getItem(CONST_StorageKey));
    }

    //set data from storage
    setStorageData(data) {
        return localStorage.setItem(CONST_StorageKey, JSON.stringify(data));
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

    getSearchInput() {
    }
    getSearchButton() {
    }
    searchProduct(term) {
    }
}

String.prototype.formatProductCode = function formatProductCode() {
    return this.replace(/[^0-9a-z\/]/gi, '');
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

function addXMLRequestCallback(callback, onSend) {
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