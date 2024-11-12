using System;
using System.Collections.Generic;

namespace GPartsDistributorPlugin.Models
{
    public class ClientSearchResponse
    {
        public string searchId { get; set; }
        public List<PluginConfigCatalog> configCatalogList { get; set; }
    }

    public class DriverSearchResponse
    {
        public string id { get; set; }
        public string vendorId { get; set; }
        public SearchRequest request { get; set; }
        public List<SearchResult> results { get; set; }
        public SearchStatus searchStatus { get; set; }
    }

    public class CatalogInfo
    {
        public string id { get; set; }
        public string name { get; set; }
    }

    public class SearchRequest
    {
        public string id { get; set; }
        public string originType { get; set; }
        public string searchId { get; set; }
        public string term { get; set; }
    }

    public class SearchResult
    {
        public string vendor { get; set; }
        public string make { get; set; }
        public string code { get; set; }
        public string description { get; set; }
        public string image { get; set; }
        public decimal? priceBase { get; set; }
        public decimal? pricePurchase { get; set; }
        public decimal? quantity { get; set; }
        public bool available { get; set; }
        public string deliveryInfo { get; set; }
        public string makeReferer { get; set; }
        public string codeReferer { get; set; }
    }

    public class ResultReadResponse
    {
        public SearchStatus searchStatus { get; set; }
        public List<SearchResult> results { get; set; }
        public Dictionary<string, SearchStatus> catalogSearchStatusMap { get; set; }
    }

    public enum SearchStatus
    {
        Searching,
        SearchIdNotFound,
        Completed
    }

    #region Quantity classes
    public class QuantityCatalogRequest
    {
        public string requestId { get; set; }
        public string catalogId { get; set; }
        public string make { get; set; }
        public string code { get; set; }
        public int quantity { get; set; }
        public bool available { get; set; }
        public string deliveryInfo { get; set; }
        public QuantityRequestStatus status { get; set; }
    }

    public class QuantityMessage
    {
        public string searchId { get; set; }
        public List<QuantityCatalogRequest> catalogRequestList { get; set; }
        public QuantityRequestStatus status { get; set; }
    }

    public enum QuantityRequestStatus
    {
        Processing,
        SearchIdNotFound,
        RequestIdNotFound,
        Completed
    }
    #endregion

    #region Order Product Classes
    public class ProductOrderRequest
    {
        public List<CatalogOrderRequest> catalogOrderList { get; set; }
        public string reference { get; set; }
        public string note { get; set; }
    }

    public class CatalogOrderRequest
    {
        public string requestId { get; set; }
        public string catalogId { get; set; }
        public List<ProductOrderItem> items { get; set; }
        public CatalogOrderStatus status { get; set; }
        public string response { get; set; }
    }

    public class ProductOrderItem 
    {
        public string make { get; set; }
        public string code { get; set; }
        public decimal quantity { get; set; }
    }

    public enum CatalogOrderStatus
    {
        SessionIdNotFound,
        Processing,
        Failed,
        Success
    }

    #endregion

    public class Settings
    {
        public int version { get; set; }
        public List<string> makePrivilegedList { get; set; }
        public List<SettingsMakeAsso> makeAssoList { get; set; }
    }
    public class SettingsMakeAsso
    {
        public string title { get; set; }
        public List<string> items { get; set; }
    }
}
