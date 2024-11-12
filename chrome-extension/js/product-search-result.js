
function compareTwoStrings(first, second) {
    first = first.replace(/\s+/g, '')
    second = second.replace(/\s+/g, '')

    if (first === second) return 1; // identical or empty
    if (first.length < 2 || second.length < 2) return 0; // if either is a 0-letter or 1-letter string

    let firstBigrams = new Map();
    for (let i = 0; i < first.length - 1; i++) {
        const bigram = first.substring(i, i + 2);
        const count = firstBigrams.has(bigram)
            ? firstBigrams.get(bigram) + 1
            : 1;

        firstBigrams.set(bigram, count);
    };

    let intersectionSize = 0;
    for (let i = 0; i < second.length - 1; i++) {
        const bigram = second.substring(i, i + 2);
        const count = firstBigrams.has(bigram)
            ? firstBigrams.get(bigram)
            : 0;

        if (count > 0) {
            firstBigrams.set(bigram, count - 1);
            intersectionSize++;
        }
    }

    return (2.0 * intersectionSize) / (first.length + second.length - 2);
}

function findBestMatch(mainString, targetStrings) {
    if (!areArgsValid(mainString, targetStrings)) throw new Error('Bad arguments: First argument should be a string, second should be an array of strings');

    const ratings = [];
    let bestMatchIndex = 0;

    for (let i = 0; i < targetStrings.length; i++) {
        const currentTargetString = targetStrings[i];
        const currentRating = compareTwoStrings(mainString, currentTargetString)
        ratings.push({ target: currentTargetString, rating: currentRating })
        if (currentRating > ratings[bestMatchIndex].rating) {
            bestMatchIndex = i
        }
    }


    const bestMatch = ratings[bestMatchIndex]

    return { ratings: ratings, bestMatch: bestMatch, bestMatchIndex: bestMatchIndex };
}

function areArgsValid(mainString, targetStrings) {
    if (typeof mainString !== 'string') return false;
    if (!Array.isArray(targetStrings)) return false;
    if (!targetStrings.length) return false;
    if (targetStrings.find(function (s) { return typeof s !== 'string' })) return false;
    return true;
}


$(document).ready(function () {

    $("#grid").kendoGrid({
        filterable: true,
        dataSource: {
            schema: {
                model: {
                    fields: {
                        make: { type: "string" },
                        code: { type: "string" }
                    }
                }
            }
        },
        columns: buildColumns(),
        dataBound: function () {
            $('[data-toggle="tooltip"]').tooltip();

            $('.image-wrapper').magnificPopup({
                type: 'image'
            });
        }
    });

    var grid = $("#grid");
    function resizeGrid() {
        grid.data("kendoGrid").resize();
    }

    $(window).resize(function () {
        resizeGrid();
    });
});

function buildColumns() {
    var result = [{
        locked: true,
        field: "make",
        title: "Fabriquant",
        width: 200,
        filterable: {
            multi: true
        }
    }, {
        locked: true,
        field: "code",
        title: "Code",
            width: 200
    }];

    for (var i = 0; i < CONST_SessionCatalog.length; i++) {
        var catalogConfig = CONST_SessionCatalog[i];
        result.push({
            title: catalogConfig.name,
            width: 350,
            template: '#=formatCell(data.' + catalogConfig.id + ')#'
        });
    }

    return result;
}

function formatCell(data) {
    var $root = $('<div class="product"/>');

    if (data.image) {
        var $imgWrap = $('<a href="' + data.image + '" class="image-wrapper"><img src="' + data.image + '"/></a>');
        $root.append($imgWrap);
    }

    if (data.code || data.priceBase || data.pricePurchase) {
        var $info = $('<div class="product-info"/>');
        $root.append($info);
        if (data.available)
            $info.append($('<div class="availability">Dispo /' + data.quantity + 'u.: <span class="availability-state available">' + (data.deliveryInfo ? data.deliveryInfo : 'OUI') + '</span></div>'));
        else
            $info.append($('<div class="availability">Dispo /' + data.quantity + 'u.: <span class="availability-state not-available">NON</span></div>'));
        if (data.priceBase)
            $info.append($('<div class="price-base">Prix de base: <span class="price price-base">' + kendo.format("{0:n2}", data.priceBase) + ' €</span></div>'));
        if (data.pricePurchase)
            $info.append($('<div class="price-base">Prix d\'achat: <span class="price price-purchase">' + kendo.format("{0:n2}", data.pricePurchase) + ' €</span></div>'));
        if (data.description) {
            var description = data.description.truncate(150).replace('&hellip;', '<span data-toggle="tooltip" data-placement="bottom" title="' + data.description + '">&hellip;</span>');
            $info.append($('<div class="description">' + description + '</div>'));
        }
    }

    return $root.html();
}

// Listening to messages in Context Script
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
    switch (message.id) {
        //search Product
        case CONST_ProductSearchResponse:
            //document.title = 'Résultats de recherche sur ' + message.term;
            console.dir(message);

            var grid = $('#grid').data('kendoGrid');
            for (var i = 0; i < message.results.length; i++) {
                var result = message.results[i];
                var affectedItem = null;
                for (var j = 0; j < grid.dataItems().length; j++) {
                    var item = grid.dataItems()[j];
                    if (result.code.formatProductCode() == item.code.formatProductCode() &&
                        (result.make.cleanText().includes(item.make.cleanText()) || item.make.cleanText().includes(result.make.cleanText()) || compareTwoStrings(result.make, item.make) >= 0.50)) {
                        affectedItem = item;
                        break;
                    }
                }
                if (!affectedItem) {

                    var defaultData = {
                        make: result.make,
                        code: result.code
                    };
                    for (var j = 0; j < CONST_SessionCatalog.length; j++) {
                        var catalogConfig = CONST_SessionCatalog[j];
                        defaultData[catalogConfig.id] = {
                            make: null,
                            code: null,
                            description: null,
                            quantity: 0,
                            available: false,
                            deliveryInfo: null,
                            priceBase: 0,
                            pricePurchase: 0,
                            image: null
                        };
                    }
                    affectedItem = grid.dataSource.add(defaultData);
                }
                affectedItem.set(result.vendor + '.make', result.make);
                affectedItem.set(result.vendor + '.code', result.code);
                affectedItem.set(result.vendor + '.description', result.description);
                affectedItem.set(result.vendor + '.quantity', result.quantity);
                affectedItem.set(result.vendor + '.available', result.available);
                affectedItem.set(result.vendor + '.deliveryInfo', result.deliveryInfo);
                affectedItem.set(result.vendor + '.priceBase', result.priceBase);
                affectedItem.set(result.vendor + '.pricePurchase', result.pricePurchase);
                affectedItem.set(result.vendor + '.image', result.image ? result.image : '');
            }
            break;
    }
});