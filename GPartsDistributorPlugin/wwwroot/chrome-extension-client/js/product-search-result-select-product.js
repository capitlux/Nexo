var selectedProduct = null;

$(document).ready(function () {
    $('.create-web-app-supplier, .select-web-app-supplier').click(function () {
        $('#modalWebAppSupplier').modal('hide');
        if ($(this).hasClass('select-web-app-supplier')) {
            var selectedMake = $('#modalWebAppSupplier .badge-primary').text().cleanText();
            selectedProduct.makeList = [selectedMake];

            var selectedMakeList = $('#modalWebAppSupplier .modal-title .badge').map(function () {
                return $(this).text().cleanText();
            }).get();

            var makeAssoList = getMakeAssoList();
            if (!makeAssoList)
                makeAssoList = [];

            var foundAsso = null;
            for (var i = 0; i < makeAssoList.length && !foundAsso; i++) {
                var curAsso = makeAssoList[i];

                if (curAsso.items.filter(value => selectedMakeList.includes(value)).length > 0) {
                    for (var k = 0; k < selectedMakeList.length; k++) {
                        if (!curAsso.items.includes(selectedMakeList[k]))
                            curAsso.items.push(selectedMakeList[k]);
                    }
                    foundAsso = curAsso;
                }
            }

            selectedMakeList.push(selectedMake);
            if (!foundAsso) {
                makeAssoList.push({ title: selectedMake, items: selectedMakeList });
            }
            else
                foundAsso.title = selectedMake;
            setMakeAssoList(makeAssoList);
        }
        openWebAppTab();
    });
    $('.input-modal-filter-supplier').keyup(function () {
        showModalSupplierScore();
    });
});

function selectProduct(dataItem, catalogConfig) {

    var makeList = [dataItem.make];
    var makeAsso = getMakeAsso(dataItem.make);
    if (makeAsso)
        makeList = makeList.concat(makeAsso.items);

    selectedProduct = {
        vendorId: catalogConfig.vendorId,
        makeList: makeList.filter((x, i, a) => a.indexOf(x) == i),
        code: dataItem.code,
        description: dataItem[catalogConfig.id].description,
        quantity: 1,
        pricePurchase: dataItem[catalogConfig.id].pricePurchase,
        priceBase: dataItem[catalogConfig.id].priceBase,
        priceFinal: (dataItem[catalogConfig.id].pricePurchase * pricingCoef).toFixed(2),
        internalData: 'GFL|' + catalogConfig.id + '|' + dataItem[catalogConfig.id].make + '|' + dataItem[catalogConfig.id].code
    };

    var supplierList = getWebAppSupplierList();
    if (supplierList.filter(value => selectedProduct.makeList.includes(value.cleanText())).length > 0)
        openWebAppTab();
    else {
        selectedProduct.supplierScoreList = supplierList.map(supplier => { return { name: supplier, score: 0 } });
        selectedProduct.supplierScoreList.forEach(supplierScore => {
            selectedProduct.makeList.forEach(make => {
                supplierScore.score += stringSimilarity(supplierScore.name, make);
            });
        });
        selectedProduct.supplierScoreList.sort(function (x, y) {
            if (x.score < y.score) {
                return 1;
            }
            if (x.score > y.score) {
                return -1;
            }
            return 0;
        });
        showModalSupplierScore();
    }
}

function showModalSupplierScore() {

    $('#modalWebAppSupplier .modal-title').html('Associer <span class="badge badge-pill badge-warning">' + selectedProduct.makeList.join('/') + '</span> avec ...');
    $('#modalWebAppSupplier .modal-body').children().not('input').remove();
    $('#modalWebAppSupplier .select-web-app-supplier').addClass('d-none');

    var filterMake = $('.input-modal-filter-supplier').val().toUpperCase();
    var result = '';

    var items = selectedProduct.supplierScoreList;
    if (filterMake && filterMake.length > 0)
        items = items.filter(item => item.name.toUpperCase().includes(filterMake));

    for (var i = 0; i < items.length && i < 10; i++)
        result += ' <span style="cursor:pointer" class="badge badge-pill badge-warning">' + items[i].name + '</span>';

    $('#modalWebAppSupplier .modal-body').append($(result));
    $('#modalWebAppSupplier .modal-body .badge').off().click(function (e) {
        $(this).closest('div').find('.badge').removeClass('badge-primary badge-warning').not($(this)).addClass('badge-warning');
        $(this).addClass('badge-primary');
        $('#modalWebAppSupplier .select-web-app-supplier').removeClass('d-none');
    });
    $('#modalWebAppSupplier').modal();
}

function openWebAppTab() {
    var params = new URLSearchParams(selectedProduct);
    var urlBase = CONST_WebAppBaseUrl + '/Base/Quotation/CreateThenAddProduct';
    var url = urlBase + '?' + params;

    chrome.tabs.query({}, function (tabs) {
        var hasExistingTab = false;

        for (var i = 0; i < tabs.length; ++i) {
            if (tabs[i].url.includes(urlBase)) {
                hasExistingTab = true;
                //Update the url here.
                chrome.tabs.update(tabs[i].id, { url: url, selected: true });
                break;
            }
        }

        if (!hasExistingTab)
            window.open(url, 'WebAppTab');
    });
}

function testOrderProduct() {

    var message = {
        reference: Date.now().toString(),
        note: "COMMANDE VOISIN ",
        catalogOrderList: [{
            catalogId: 'EEC',
            items: [{
                make: "KNECHT-MAHLE FILTRES",
                code: "OC100",
                quantity: 2
            }, {
                make: "LUCAS",
                code: "LFOS101",
                quantity: 4
            }]
        }]
    };

    $.ajax({
        type: "POST",
        contentType: "application/json",
        url: CONST_ServerBaseUrl + "/CatalogService/OrderProduct",
        dataType: 'json',
        data: JSON.stringify(message),
        success: function (message) {

        }
    });
}