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

// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    var timeout;
    return function () {
        var context = this, args = arguments;
        var later = function () {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};