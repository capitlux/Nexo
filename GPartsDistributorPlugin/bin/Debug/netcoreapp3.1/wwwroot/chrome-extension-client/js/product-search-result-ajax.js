const CONST_ResultTimeout = 30000;
const CONST_SearchResultInterval = 500;

var lastSearchResponse = null;
var lastSearchResultDate = null;
var searchResultIntervalId = null;

var quantityResultIntervalId = null;
var lastQuantityResultDate = null;


function searchTermByAjax() {

    //Post results
    $.ajax({
        type: "POST",
        contentType: "application/json",
        url: CONST_ServerBaseUrl + "/CatalogService/Search",
        dataType: 'json',
        data: JSON.stringify({ Term: searchTerm }),
        success: function (searchResponse) {

            //store server response
            lastSearchResponse = searchResponse;

            //initialize grid since we have configCatalogList
            initializeGrid();

            //init last valid result date
            lastSearchResultDate = new Date();

            //call server until it's necessary
            searchResultIntervalId = setInterval(function () {

                var now = new Date();
                if ((now - lastSearchResultDate) > CONST_ResultTimeout) {
                    stopSearch();
                    return;
                }

                //Post results
                $.ajax({
                    type: "POST",
                    contentType: "application/json",
                    url: CONST_ServerBaseUrl + "/CatalogService/GetSearchResult",
                    dataType: 'json',
                    data: JSON.stringify({ SearchId: lastSearchResponse.searchId }),
                    timeout: CONST_ResultTimeout,
                    success: function (resultMessage) {

                        //Update configCatalog 
                        lastSearchResponse.configCatalogList.map(function (config) {
                            if (resultMessage.catalogSearchStatusMap[config.id])
                                config.searchStatus = resultMessage.catalogSearchStatusMap[config.id];
                            updateGridHeader();
                        });

                        //Update global status
                        switch (resultMessage.searchStatus) {
                            case CONST_SearchStatusSearching:
                            case CONST_SearchStatusCompleted:

                                //update lastSearchResultDate only if we have at least one result
                                if (resultMessage.results.length > 0) {
                                    lastSearchResultDate = new Date();
                                    updateGridData(resultMessage.results);
                                }

                                //if search has finished then stop server recall
                                if (resultMessage.searchStatus == CONST_SearchStatusCompleted)
                                    clearInterval(searchResultIntervalId);
                                break;

                            case CONST_SearchStatusSearchIdNotFound:
                                stopSearch();
                                break;
                        }
                    },
                    error: function () {
                        stopSearch();
                    }
                });
            }, CONST_SearchResultInterval);
        }
    });
}

function stopSearch() {

    //stop server recall
    clearInterval(searchResultIntervalId);

    //mark all catalog as completed
    lastSearchResponse.configCatalogList.forEach(function (config) {
        config.searchStatus = CONST_SearchStatusCompleted;
    });
    updateGridHeader();
}

function stopQuantityRequest(dataItem, intervalId) {

    //stop server recall
    clearInterval(intervalId);

    var needGridRefresh = false;

    //mark all catalog as completed
    lastSearchResponse.configCatalogList.forEach(function (config) {
        if (dataItem[config.id].quantityRequest && dataItem[config.id].quantityRequest.status != CONST_QuantityRequestStatusCompleted) {
            dataItem[config.id].quantityRequest.status = CONST_QuantityRequestStatusCompleted;
            dataItem[config.id].quantityRequest.hasError = true;
            needGridRefresh = true;
        }
    });

    if (needGridRefresh)
        $('#grid').data('kendoGrid').refresh();
}

function requestQuantity($productInfo, dataItem, catalogConfig) {
    var newQuantity = parseInt(prompt('Entrez la quantité demandée', $productInfo.find('button.availability').attr('data-quantity')));
    if (newQuantity > 0) {
        var message = {
            searchId: lastSearchResponse.searchId,
            catalogRequestList: []
        };
        lastSearchResponse.configCatalogList.forEach(function (config) {
            if (dataItem[config.id].code && config.quantityRequestable) {

                //check dataItem is not currently quantity requesting ...
                if (dataItem[config.id].quantityRequest && dataItem[config.id].quantityRequest.status != CONST_QuantityRequestStatusCompleted)
                    return;

                var quantityRequest = {
                    catalogId: config.id,
                    make: dataItem[config.id].make,
                    code: dataItem[config.id].code,
                    quantity: newQuantity,
                    status: CONST_QuantityRequestStatusProcessing,
                    hasError : false
                };
                message.catalogRequestList.push(quantityRequest);
                dataItem.set(config.id + '.quantityRequest', quantityRequest);
            }
        });

        $.ajax({
            type: "POST",
            contentType: "application/json",
            url: CONST_ServerBaseUrl + "/CatalogService/RequestQuantity",
            dataType: 'json',
            data: JSON.stringify(message),
            success: function (message) {

                $("#grid").data("kendoGrid").refresh();

                //init last valid result date
                lastQuantityResultDate = new Date();

            //call server until it's necessary

                var intervalId = setInterval(function () {

                    console.log('quantityResultInterval');

                    var now = new Date();
                    if ((now - lastQuantityResultDate) > CONST_ResultTimeout) {
                        stopQuantityRequest(dataItem, intervalId);
                        return;
                    }

                    //Post results
                    $.ajax({
                        type: "POST",
                        contentType: "application/json",
                        url: CONST_ServerBaseUrl + "/CatalogService/GetQuantityResult",
                        dataType: 'json',
                        data: JSON.stringify(message),
                        timeout: CONST_ResultTimeout,
                        success: function (response) {

                            var needGridRefresh = false;

                            //if search has finished then stop server recall
                            if (response.status == CONST_QuantityRequestStatusSearchIdNotFound)
                                stopQuantityRequest(dataItem, intervalId);

                            response.catalogRequestList.forEach(function (quantityRequest) {
                                if (quantityRequest.status == CONST_QuantityRequestStatusCompleted && dataItem[quantityRequest.catalogId].quantityRequest.status == CONST_QuantityRequestStatusProcessing) {
                                    dataItem.set(quantityRequest.catalogId + '.quantityRequest', quantityRequest);
                                    lastQuantityResultDate = new Date();
                                    needGridRefresh = true;
                                }
                            });

                            if (needGridRefresh)
                                $('#grid').data('kendoGrid').refresh();

                            //if search has finished then stop server recall
                            if (response.status == CONST_QuantityRequestStatusCompleted)
                                clearInterval(intervalId);
                        },
                        error: function () {
                            stopQuantityRequest(dataItem, intervalId);
                        }
                    });
                }, 500);
            }
        });
    }
}