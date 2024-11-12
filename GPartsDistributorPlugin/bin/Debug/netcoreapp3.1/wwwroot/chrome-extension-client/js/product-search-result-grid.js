var selectedMakeList = [];
var bookmarkedMakeList = null;
var $buttonCreateMakeAsso = null;
var $buttonBookmarkMake = null;
var hasGridFullLoaded = false;
var hasScrollDuringDataLoad = false;

function initializeGrid() {

    bookmarkedMakeList = getMakePrivilegedList();
    if (!bookmarkedMakeList)
        bookmarkedMakeList = [];

    $buttonCreateMakeAsso = $('.btn.make-asso');
    $buttonBookmarkMake = $('.btn.make-bookmark');

    /*$('.update-data-grid').click(function () {
        hasScrollDuringDataLoad = false;
        updateGridData();
    }).tooltip();*/

    for (var i = 0; i < lastSearchResponse.configCatalogList.length; i++) {
        var catalog = lastSearchResponse.configCatalogList[i];
        $('.cat-state-list').append($('<span class="badge badge-pill badge-light" data-id="' + catalog.id + '">' + catalog.name +'</span>'));
    }

    $("#grid").kendoGrid({
        columns: buildColumns(),
        dataSource: {
            filter: buildFilters(),
            sort: buildSorts(),
        },
        dataBound: function () {

            //update make-asso selection & button state 
            updateMakeAssoState();
            //onclick input.make-asso, update selectionMakeAsso
            $('input.make-asso').off().click(function () {
                var make = $(this).parent().text().cleanText();
                var checked = $(this).is(":checked");
                if (checked) {
                    if (!selectedMakeList.includes(make))
                        selectedMakeList.push(make);
                }
                else {
                    var index = selectedMakeList.indexOf(make);
                    if (index !== -1) {
                        selectedMakeList.splice(index, 1);
                    }
                }
                //update make-asso selection & button state
                updateMakeAssoState();
            });

            //init tooltips
            $('#grid [data-toggle="tooltip"]').tooltip();

            //init product image magnificPopup
            $('#grid .image-wrapper').magnificPopup({
                type: 'image'
            });

            //onclick product
            $('#grid .product-info').off().click(function () {
                var dataItem = $("#grid").data("kendoGrid").dataSource.getByUid($(this).closest('tr').attr('data-uid'));
                var catalogConfig = lastSearchResponse.configCatalogList[$(this).closest('td').index()];
                selectProduct(dataItem, catalogConfig);
            });

             //onclick quantity button
            $('.btn.availability').off().click(function (e) {
                e.stopImmediatePropagation();
                var dataItem = $("#grid").data("kendoGrid").dataSource.getByUid($(this).closest('tr').attr('data-uid'));
                var catalogConfig = lastSearchResponse.configCatalogList[$(this).closest('td').index()];
                requestQuantity($(this).closest('.product-info'), dataItem, catalogConfig);
            });

            $('#grid .k-grid-content').scroll(function (e) {
                if (!hasGridFullLoaded && !hasScrollDuringDataLoad && $('#grid .k-grid-content').scrollTop() > 0 || $('#grid .k-grid-content').scrollLeft() > 0)
                    hasScrollDuringDataLoad = true;
            });
        }
    });
}

function buildColumns() {
    var result = [
        {
            locked: true,
            field: "make",
            template: '<input class="k-checkbox make-asso" data-role="checkbox" type="checkbox"><span class="#=isPerfectMatching ? "font-weight-bold text-primary" : "" #">#=make#</span><span class="k-icon k-i-bookmark text-warning#=bookmarkedMakeList.includes(make) ? "" : " d-none"#"></span>',
            headerTemplate: 'Marque',
            width: 300
        }, {
            locked: true,
            field: "code",
            title: "Code",
            template: '<span class="#=isPerfectMatching ? "font-weight-bold text-primary" : "" #">#=code#</span>&nbsp;<a class="k-icon k-i-search search-google" href="https://www.google.fr/search?q=#=data.make#+#=data.code#" target="_blank"></a>',
            width: 175
        }];

    lastSearchResponse.configCatalogList.forEach(function (config) {
        result.push({
            title: config.name,
            headerTemplate: '<span>' + config.name + '</span><div class="progress d-none" data-id="' + config.id + '" style="float:right"><div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%;padding: 0 20px;">EN COURS ...</div></div>',
            width: 0,
            template: '#=formatCell("' + config.id + '", data.' + config.id + ')#'
        });
    });

    return result;
}

function buildFilters() {
    var filterRules = [];
    var filterOnlyAvaliable = $('.filterAvailable input:radio:checked').val() == 'available';
    //if (filterOnlyAvaliable) {
        filterRules.push({
            operator: function (item, value) {
                for (var i = 0; i < lastSearchResponse.configCatalogList.length; i++) {
                    var config = lastSearchResponse.configCatalogList[i];
                    var isFilteredByCatalog = hasGridFullLoaded && !$('.cat-state-list .badge-pill[data-id="' + config.id + '"]').hasClass('badge-primary') ? true : false;
                    if ((!filterOnlyAvaliable || item[config.id].available == true) && !isFilteredByCatalog && item[config.id].code)
                        return true;
                }
                return false;
            }
        });
    //}
    return filterRules;
}

function buildSorts() {
    return [
        { field: "isPerfectMatching", dir: "desc" },
        { field: "isPrivilegied", dir: "desc" },
        { field: "make", dir: "asc" },
        { field: "code", dir: "asc" }
    ];
}

function updateMakeAssoState() {

    var grid = $('#grid').data('kendoGrid');

    //uncheck all input.make-asso checkbox
    $('input.make-asso').prop('checked', false);

    //check all selected input.make-asso checkbox
    selectedMakeList.forEach(function (make) {
        grid.dataSource.data().forEach(function (item) {
            if (item.make == make)
                $('tr[data-uid="' + item.uid + '"] input.make-asso').prop('checked', true);
        });
    });

    if (selectedMakeList.length > 1)
        $('.btn.make-asso').removeClass('d-none');
    else
        $('.btn.make-asso').addClass('d-none');
    if (selectedMakeList.length > 0)
        $('.btn.make-bookmark').removeClass('d-none');
    else
        $('.btn.make-bookmark').addClass('d-none');
}

function updateGridData(results) {

    var grid = $('#grid').data('kendoGrid');
    var needGridRefresh = false;

    //no args means replave all data using searchResultRawData
    if (!results) {
        grid.dataSource.data([]);
        results = searchResultRawData;
    }
    else if (results.length > 0)
        searchResultRawData = searchResultRawData.concat(results);

    //update grid column headers
    updateGridHeader();

    results.forEach(function (result) {

        var affectedItem = null;

        //avoid empty make
        var make = result.make.cleanText();
        if (make.length == 0)
            return;

        //try to find Make Asso, then get title
        var makeAsso = getMakeAsso(make);
        if (makeAsso)
            make = makeAsso.title;

        //check grid already contains current code
        var gridData = grid.dataSource.data();
        for (var i = 0; i < gridData.length; i++) {
            var item = gridData[i];
            //check make and code
            if (make == item.make.cleanText()
                && result.code.formatProductCode() == item.code.formatProductCode()) {
                affectedItem = item;
                break;
            }
        }

        //if doen't exists then create it !
        if (!affectedItem) {

            if (!hasGridFullLoaded && hasScrollDuringDataLoad) {
                //$('.update-data-grid').removeClass('d-none');
                $('.filterAvailable label.active').tooltip('show');
                return;
            }

            var defaultData = {
                isPerfectMatching: result.code.formatProductCode() == searchTerm.formatProductCode(),
                isPrivilegied: bookmarkedMakeList.includes(make),
                make: make,
                code: result.code.cleanText()
            };

            lastSearchResponse.configCatalogList.forEach(function (config) {
                defaultData[config.id] = {
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
            });

            affectedItem = grid.dataSource.add(defaultData);
        }

        //affect values
        affectedItem[result.vendor] = {
            make: result.make,
            code: result.code,
            description: result.description,
            quantity: result.quantity,
            available: result.available,
            deliveryInfo: result.deliveryInfo,
            priceBase: result.priceBase,
            pricePurchase: result.pricePurchase,
            image: result.image ? result.image : ''
        };

        needGridRefresh = true;
    });

    if (needGridRefresh) {
        if (hasGridFullLoaded || (!hasGridFullLoaded && !hasScrollDuringDataLoad))
            filterDataGrid();
    }

    var allRowsCount = grid.dataSource.data().length;
    if ($('.filterAvailable .badge.all').text() != allRowsCount) {
        $('.filterAvailable .badge.all').removeClass('animate__animated animate__rubberBand');
        setTimeout(function () {
            $('.filterAvailable .badge.all').addClass('animate__animated animate__rubberBand').text(allRowsCount);
        }, 0);
    }

    var inStockRowCount = grid.dataSource.data().filter(function (item) {
        for (var i = 0; i < lastSearchResponse.configCatalogList.length; i++) {
            if (item[lastSearchResponse.configCatalogList[i].id].available)
                return true;
        }
        return false;
    }).length;
    if ($('.filterAvailable .badge.available-only').text() != inStockRowCount) {
        $('.filterAvailable .badge.available-only').removeClass('animate__animated animate__rubberBand');
        setTimeout(function () {
            $('.filterAvailable .badge.available-only').addClass('animate__animated animate__rubberBand').text(inStockRowCount);
        }, 0);
    }
}

function filterDataGrid() {
    var grid = $('#grid').data('kendoGrid');
    grid.dataSource.filter(buildFilters());
    var showOnlyAvailable = $('.filterAvailable input:radio:checked').val() == 'available';
    for (var i = 0; i < lastSearchResponse.configCatalogList.length; i++) {
        var config = lastSearchResponse.configCatalogList[i];
        var curRowCount = grid.dataSource.data().filter(function (item) {
            if (showOnlyAvailable)
                return item[config.id].available;
            else
                return item[config.id].code != null;
        }).length;

        var isCatalogFiltered = hasGridFullLoaded && !$('.cat-state-list .badge-pill[data-id="' + config.id + '"]').hasClass('badge-primary') ? true : false;
        if (curRowCount > 0 && !isCatalogFiltered) {
            grid.columns[i + 2].width = 350;
        }
        else
            grid.columns[i + 2].width = 0;
    }
    grid.setOptions({
        columns: grid.columns
    });
    grid.refresh();
    setTimeout(function () {
        updateGridHeader();
    }, 0);
}

function updateGridHeader() {
    var grid = $('#grid').data('kendoGrid');
    for (var i = 0; i < lastSearchResponse.configCatalogList.length; i++) {
        var config = lastSearchResponse.configCatalogList[i];
        var $header = $('th .progress[data-id="' + config.id + '"]');
        if ((!config.searchStatus || config.searchStatus == CONST_SearchStatusSearching) && grid.columns[i + 2].width > 0) {
            $header.removeClass('d-none');
        } else {
            $header.addClass('d-none');
        }
    }

    for (var i = 0; i < lastSearchResponse.configCatalogList.length; i++) {
        var catalog = lastSearchResponse.configCatalogList[i];
        if (catalog.searchStatus && catalog.searchStatus != CONST_SearchStatusSearching) {
            $('.cat-state-list .badge-light[data-id="' + catalog.id + '"]').removeClass('badge-light').addClass('badge-primary');
        }
    }

    //Main Loader
    var percentComplete = lastSearchResponse.configCatalogList.filter(function (config) { return config.searchStatus && config.searchStatus != CONST_SearchStatusSearching; }).length / lastSearchResponse.configCatalogList.length * 100;
    $('.progress.title .progress-bar').css('width', percentComplete + '%');
    if (percentComplete == 100) {
        $('.progress.title').css('opacity', 0);

        //Catalog State
        updateCatalogBadge();
        $('.cat-state-list .badge-pill').not('.badge-inactive').off().click(function (e) {

            var badgeCount = $('.cat-state-list .badge-pill').not('.badge-inactive').length;
            var badgeCountActive = $('.cat-state-list .badge-pill.badge-primary').not('.badge-inactive').length;

            if (e.ctrlKey) {
                $('.cat-state-list .badge-pill').not('.badge-inactive').removeClass('badge-primary').addClass('badge-secondary');
                $(this).removeClass('badge-secondary').addClass('badge-primary');
            }
            else {
                if ($(this).hasClass('badge-secondary'))
                    $(this).removeClass('badge-secondary').addClass('badge-primary');
                else if ($(this).hasClass('badge-primary'))
                    $(this).removeClass('badge-primary').addClass('badge-secondary');
            }
            filterDataGrid();
        });

        hasGridFullLoaded = true;
    }
    else
        $('.progress.title').css('opacity', 1);
}

function updateCatalogBadge() {

    setTimeout(function () {
        var grid = $('#grid').data('kendoGrid');
        var configList = lastSearchResponse.configCatalogList;
        for (var i = 0; i < configList.length; i++) {
            var catalog = configList[i];
            if (catalog.searchStatus && catalog.searchStatus != CONST_SearchStatusSearching) {

                var catalogRefCount = searchResultRawData.filter(function (item) {
                    if (item.vendor == catalog.id)
                        return true;
                    return false;
                }).length;
                if (catalogRefCount == 0)
                    $('.cat-state-list .badge-pill[data-id="' + catalog.id + '"]').removeClass('badge-primary').addClass('badge-secondary badge-inactive');
                else
                    $('.cat-state-list .badge-light[data-id="' + catalog.id + '"]').removeClass('badge-light').addClass('badge-primary');
            }
        }
        $('.cat-state-list .badge-pill').not('.badge-inactive').css('cursor', 'pointer');
    }, 50);
}

function formatCell(configId, data) {
    var $root = $('<div class="product"/>');

    //check cell is displayable
    var showOnlyAvailable = $('.filterAvailable input:radio:checked').val() == 'available';
    var isFilteredByCatalog = hasGridFullLoaded && !$('.cat-state-list .badge-pill[data-id="' + configId + '"]').hasClass('badge-primary') ? true : false;
    if ((showOnlyAvailable && !data.available) || isFilteredByCatalog)
        return $root.html();

    //prepare img tag
    if (data.image) {
        var $imgWrap = $('<a href="' + data.image + '" class="image-wrapper"><img src="' + data.image + '"/></a>');
        $root.append($imgWrap);
    }

    if (data.code || data.priceBase || data.pricePurchase) {
        var $info = $('<div class="product-info"/>');
        $root.append($info);
        if (!data.quantityRequest || data.quantityRequest.hasError) {
            if (data.available)
                $info.append($('<div class="availability"><button type="button" class="btn btn-outline-' + (data.quantityRequest ? 'danger' : 'dark') + ' btn-sm availability" data-quantity="' + data.quantity + '">' + data.quantity + ' pcs ' + (data.quantityRequest ? '<span class="k-icon k-i-warning"></span> ' : '') + '</button> : <span class="availability-state available">' + (data.deliveryInfo ? data.deliveryInfo : 'OUI') + '</span></div>'));
            else
                $info.append($('<div class="availability"><button type="button" class="btn btn-outline-' + (data.quantityRequest ? 'danger' : 'dark') + ' btn-sm availability" data-quantity="' + data.quantity + '">' + data.quantity + ' pcs ' + (data.quantityRequest ? '<span class="k-icon k-i-warning"></span> ' : '') + '</button> : <span class="availability-state not-available" ' + (data.deliveryInfo ? 'data-toggle="tooltip" data-placement="bottom" title="' + data.deliveryInfo + '"' : '') + '>NON</span></div>'));
        }
        else {
            if (data.quantityRequest.status == CONST_QuantityRequestStatusCompleted) {
                if (data.quantityRequest.available)
                    $info.append($('<div class="availability"><button type="button" class="btn btn-outline-dark btn-sm availability" data-quantity="' + data.quantityRequest.quantity + '">' + data.quantityRequest.quantity + ' pcs</button> : <span class="availability-state available">' + (data.quantityRequest.deliveryInfo ? data.quantityRequest.deliveryInfo : 'OUI') + '</span></div>'));
                else
                    $info.append($('<div class="availability"><button type="button" class="btn btn-outline-dark btn-sm availability" data-quantity="' + data.quantityRequest.quantity + '">' + data.quantityRequest.quantity + ' pcs</button> : <span class="availability-state not-available" ' + (data.quantityRequest.deliveryInfo ? 'data-toggle="tooltip" data-placement="bottom" title="' + data.quantityRequest.deliveryInfo + '"' : '') + '>NON</span></div>'));
            }
            else {
                $info.append($('<div class="availability"><div class="progress"><div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100" style="width: 100%;padding: 0 20px;">DEMANDE POUR ' + data.quantityRequest.quantity + ' PCS...</div></div></div>'));
            }
        }

        if (data.pricePurchase) {
            $info.append($('<div class="price-base">Prix d\'achat: <span class="price price-purchase">' + kendo.format("{0:n2}", data.pricePurchase) + ' € <span class="tax-suffix">HT<span></span></div>'));
            $info.append($('<div class="price-base">Prix client: <span class="price price-sale">' + kendo.format("{0:n2}", data.pricePurchase * taxCoef * pricingCoef) + ' € <span class="tax-suffix">' + (taxCoef == 1 ? 'HT' : 'TTC') + '</span></span>&nbsp;<span class="price price-base">' + kendo.format("{0:n2}", data.priceBase * taxCoef) + '</span></div>'));
        }
        if (data.description) {
            var description = data.description.truncate(150).replace('&hellip;', '<span data-toggle="tooltip" data-placement="bottom" title="' + data.description + '">&hellip;</span>');
            $info.append($('<div class="description">' + description + '</div>'));
        }
    }

    return $root.html();
}