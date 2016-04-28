const HTTP_STATUS_OK = 200;
var storeId = 511;
var lcboApiKey = "";
var availableBeers = [];

function beerMeClicked() {
    // get private api key from server, then get list of all beers at storeId
    $.ajax({
        type: 'GET',
        url: 'lcbo_api_key.php'
    }).then(function (data) {
        var lcboApiKey = data; 
        $.ajax({
            url: 'https://lcboapi.com/stores/' + storeId + '/products?page=1',
            headers: { 'Authorization': 'Token ' + lcboApiKey }
        }).then(function (jsonResponse) {
            receivedBeersFromServer(jsonResponse);
            for (i = 2; i <= jsonResponse.pager.total_pages; i++) {
                addPageOfBeers(i);
            }
            console.log(availableBeers);
        });
    });
}

function receivedBeersFromServer(jsonResponse) {
    if (jsonResponse.status != HTTP_STATUS_OK) {
        console.log(jsonResponse.message);
        exit();
    }
    if (jsonResponse.result == null) {
        console.log("No beers found at store " + storeId);
        exit();
    }
    
    availableBeers += jsonResponse.result;
}

function addPageOfBeers(pageNumber) {
    $.ajax({
        url: 'https://lcboapi.com/stores/' + storeId + '/products?page=' + pageNumber,
        headers: { 'Authorization': 'Token ' + lcboApiKey },
        success: receivedBeersFromServer
    });
}