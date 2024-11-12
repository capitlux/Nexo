using GPartsDistributorPlugin.Models;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace GPartsDistributorPlugin
{
    public class ChromeDriverService : IHostedService
    {
        private static List<CatalogServiceSession> SessionList = new List<CatalogServiceSession>();
        private readonly static object SessionLocker = new object();
        private readonly static object SettingsLocker = new object();

        private readonly ILogger _logger;
        private readonly IHostEnvironment _environment;
        private readonly IHostApplicationLifetime _appLifetime;
        private readonly IOptions<PluginConfig> _pluginConfig;
        private readonly IHttpContextAccessor _httpContextAccessor;

        private static Settings _settings;

        public ChromeDriverService(
            IHostEnvironment environment,
            ILogger<ChromeDriverService> logger,
            IHostApplicationLifetime appLifetime,
            IOptions<PluginConfig> pluginConfig,
            IHttpContextAccessor httpContextAccessor)
        {
            _environment = environment;
            _logger = logger;
            _appLifetime = appLifetime;
            _pluginConfig = pluginConfig;
            _httpContextAccessor = httpContextAccessor;
        }

        public Task StartAsync(CancellationToken cancellationToken)
        {
            _appLifetime.ApplicationStarted.Register(OnStarted);
            _appLifetime.ApplicationStopping.Register(OnStopping);
            _appLifetime.ApplicationStopped.Register(OnStopped);

            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
        {
            return Task.CompletedTask;
        }

        private void OnStarted()
        {
            _logger.LogInformation("OnStarted has been called.");

            for (int i = 0; i < _pluginConfig.Value.ChromeDriverCount; i++)
                SessionList.Add(new CatalogServiceSession(_environment, _pluginConfig));

            _settings = JObject.Parse(File.ReadAllText(Path.Combine(_environment.ContentRootPath, "settings.json"))).ToObject<Settings>();
        }

        private void OnStopping()
        {
            _logger.LogInformation("OnStopping has been called.");

            // Perform on-stopping activities here
        }

        private void OnStopped()
        {
            _logger.LogInformation("OnStopped has been called.");

            foreach (var session in SessionList)
            {
                session.ChromeDriver.Close();
            }
        }

        public Settings SyncSettings(Settings clientSettings, ref bool hasVersionChanged)
        {
            lock (SettingsLocker)
            {
                if (clientSettings != null)
                {
                    JObject cliJObj = JObject.FromObject(clientSettings);
                    JObject localJObj = JObject.FromObject(_settings);

                    if (clientSettings.version != _settings.version)
                    {
                        hasVersionChanged = true;
                    }
                    else if (!JObject.DeepEquals(cliJObj, localJObj))
                    {
                        clientSettings.version++;
                        File.WriteAllText(Path.Combine(_environment.ContentRootPath, "settings.json"), JsonConvert.SerializeObject(clientSettings, Formatting.Indented));
                        _settings = JObject.Parse(File.ReadAllText(Path.Combine(_environment.ContentRootPath, "settings.json"))).ToObject<Settings>();
                    }
                }
                return _settings;
            }
        }

        public string Search(string sessionId, string searchTerm)
        {
            lock (SessionLocker)
            {
                CatalogServiceSession session = GetSession(sessionId);
                string searchId = session.Search(searchTerm);
                return searchId;
            }
        }

        public ResultReadResponse GetSearchResult(string sessionId, string searchId)
        {
            lock (SessionLocker)
            {
                CatalogServiceSession session = SessionList.Where(m => m.SessionId == sessionId && m.LastSearchId == searchId).SingleOrDefault();
                if (session == null)
                    return new ResultReadResponse() { searchStatus = SearchStatus.SearchIdNotFound };
                else
                    return session.GetSearchResult();
            }
        }
        public void PostSearchResponse(DriverSearchResponse response)
        {
            lock (SessionLocker)
            {
                SessionList.Where(m => m.LastSearchId == response.request.searchId).SingleOrDefault()?.PostSearchResponse(response);
            }
        }

        public QuantityMessage RequestQuantity(string sessionId, QuantityMessage message)
        {
            lock (SessionLocker)
            {
                CatalogServiceSession session = SessionList.Where(m => m.SessionId == sessionId && m.LastSearchId == message.searchId).SingleOrDefault();
                if (session == null)
                    message.status = QuantityRequestStatus.SearchIdNotFound;
                else
                    message = session.RequestQuantity(message);
                return message;
            }
        }

        public ProductOrderRequest OrderProduct(string sessionId, ProductOrderRequest message)
        {
            lock (SessionLocker)
            {
                CatalogServiceSession session = SessionList.Where(m => m.SessionId == sessionId).SingleOrDefault();
                if (session == null)
                    session = GetSession(sessionId);
                message = session.OrderProduct(message);
                return message;
            }
        }

        public QuantityMessage GetQuantityResult(string sessionId, QuantityMessage message)
        {
            lock (SessionLocker)
            {
                CatalogServiceSession session = SessionList.Where(m => m.SessionId == sessionId && m.LastSearchId == message.searchId).SingleOrDefault();
                if (session == null)
                    message.status = QuantityRequestStatus.SearchIdNotFound;
                else
                    message = session.GetQuantityResult(message);
                return message;
            }
        }
        public void PostQuantityResponse(QuantityCatalogRequest response)
        {
            lock (SessionLocker)
            {
                SessionList.Where(m => m.QuantityCatalogRequestMap.Any(r => r.Value.requestId == response.requestId)).SingleOrDefault()?.PostQuantityResponse(response);
            }
        }
        public void PostProductOrderResponse(CatalogOrderRequest message)
        {
            lock (SessionLocker)
            {
                SessionList.Where(m => m.ProductOrderList.Any(s => s.catalogOrderList.Any(c => c.requestId == message.requestId))).SingleOrDefault()?.PostProductOrderResponse(message);
            }
        }
        private CatalogServiceSession GetSession(string sessionId)
        {
            CatalogServiceSession session = null;
            lock (SessionLocker)
            {
                session = SessionList.Where(m => m.SessionId == sessionId).SingleOrDefault();
                if (session == null)
                {
                    session = SessionList.OrderBy(m => m.LastActivity).First();
                    session.SessionId = sessionId;
                }
            }
            return session;
        }
    }
    public class CatalogServiceSession
    {
        public CatalogServiceSession(IHostEnvironment environment, IOptions<PluginConfig> pluginConfig)
        {
            ChromeOptions options = new ChromeOptions();
            //options.AddArguments("user-data-dir=C:\\Users\\John\\AppData\\Local\\Google\\Chrome\\User Data");
            //options.AddArgument(string.Format("--kiosk"));
            options.AddArgument(string.Format("--load-extension={0}\\wwwroot\\chrome-extension", environment.ContentRootPath));

            ChromeDriver = new ChromeDriver(options);
            ChromeDriver.Navigate().GoToUrl(pluginConfig.Value.ServerUrlBase);
            //ChromeDriver.Manage().Window.Size = new System.Drawing.Size(1024, 768);
            DispatchEventToChrome(new { id = "CatalogConfig", configList = pluginConfig.Value.CatalogList });
            Config = pluginConfig.Value;
            Results = new List<SearchResult>();
            CatalogStatusMap = new Dictionary<string, SearchStatus>();
            ProductOrderList = new List<ProductOrderRequest>();

            QuantityCatalogRequestMap = new Dictionary<string, QuantityCatalogRequest>();
        }
        public PluginConfig Config { get; set; }
        public ChromeDriver ChromeDriver { get; set; }
        public string SessionId { get; set; }
        public DateTime LastActivity { get; set; }
        public string LastSearchId { get; set; }
        public string LastSearchTerm { get; set; }
        public List<SearchResult> Results { get; set; }
        public Dictionary<string, SearchStatus> CatalogStatusMap { get; set; }
        public Dictionary<string, QuantityCatalogRequest> QuantityCatalogRequestMap { get; set; }
        public List< ProductOrderRequest> ProductOrderList { get; set; }
        public bool IsOrdering { get; set; }
        public object IsOrderingLocker = new object();

        public string Search(string searchTerm)
        {
            LastSearchId = Guid.NewGuid().ToString();
            LastSearchTerm = searchTerm;
            LastActivity = DateTime.Now;
            Results.Clear();
            CatalogStatusMap.Clear();
            QuantityCatalogRequestMap.Clear();

            foreach (var catalog in Config.CatalogList)
            {
                CatalogStatusMap.Add(catalog.Id, SearchStatus.Searching);
                QuantityCatalogRequestMap.Add(catalog.Id, new QuantityCatalogRequest());
            }
            var message = new { id = "SearchRequestFromServer", searchId = LastSearchId, searchTerm = LastSearchTerm, serverUrlBase = Config.ServerUrlBase };
            DispatchEventToChrome(message);

            return LastSearchId;
        }

        public void PostSearchResponse(DriverSearchResponse response)
        {
            LastActivity = DateTime.Now;
            Results.AddRange(response.results);
            CatalogStatusMap[response.vendorId] = response.searchStatus;
        }

        public ResultReadResponse GetSearchResult()
        {
            ResultReadResponse result = new ResultReadResponse();
            result.results = Results.ToList();
            Results.Clear();
            if (CatalogStatusMap.All(m => m.Value == SearchStatus.Completed))
                result.searchStatus = SearchStatus.Completed;
            result.catalogSearchStatusMap = CatalogStatusMap;
            return result;
        }

        public QuantityMessage RequestQuantity(QuantityMessage message)
        {

            LastActivity = DateTime.Now;

            foreach (var catalogRequest in message.catalogRequestList)
            {
                QuantityCatalogRequestMap[catalogRequest.catalogId] = catalogRequest;
                catalogRequest.requestId = Guid.NewGuid().ToString();
                catalogRequest.status = QuantityRequestStatus.Processing;
                var chromeMessage = new
                {
                    id = "QuantityRequestFromServer",
                    serverUrlBase = Config.ServerUrlBase,
                    requestId = catalogRequest.requestId,
                    catalogId = catalogRequest.catalogId,
                    make = catalogRequest.make,
                    code = catalogRequest.code,
                    quantity = catalogRequest.quantity
                };
                DispatchEventToChrome(chromeMessage);
            }
            message.status = QuantityRequestStatus.Processing;
            return message;
        }

        public QuantityMessage GetQuantityResult(QuantityMessage message)
        {

            foreach (var request in message.catalogRequestList)
            {
                QuantityCatalogRequest mappedRequest = QuantityCatalogRequestMap[request.catalogId];
                if (mappedRequest.requestId != request.requestId)
                {
                    request.status = QuantityRequestStatus.RequestIdNotFound;
                    continue;
                }
                if (mappedRequest.status == QuantityRequestStatus.Completed)
                {
                    request.available = mappedRequest.available;
                    request.deliveryInfo = mappedRequest.deliveryInfo;
                    request.status = QuantityRequestStatus.Completed;
                }
            }
            message.status = message.catalogRequestList.All(m => m.status == QuantityRequestStatus.Completed) ? QuantityRequestStatus.Completed : QuantityRequestStatus.Processing;
            return message;
        }

        public void PostQuantityResponse(QuantityCatalogRequest request)
        {

            LastActivity = DateTime.Now;
            QuantityCatalogRequest mappedRequest = QuantityCatalogRequestMap[request.catalogId];
            mappedRequest.available = request.available;
            mappedRequest.deliveryInfo = request.deliveryInfo;
            mappedRequest.status = QuantityRequestStatus.Completed;
        }

        public ProductOrderRequest OrderProduct(ProductOrderRequest request)
        {
            lock (IsOrderingLocker)
            {
                foreach (var catalogOrder in request.catalogOrderList)
                {
                    catalogOrder.status = CatalogOrderStatus.Processing;
                    catalogOrder.requestId = Guid.NewGuid().ToString();
                    var chromeMessage = new
                    {
                        id = "ProductOrderRequestFromServer",
                        status = CatalogOrderStatus.Processing,
                        serverUrlBase = Config.ServerUrlBase,
                        requestId = catalogOrder.requestId,
                        catalogId = catalogOrder.catalogId,
                        reference = request.reference,
                        note = request.note,
                        items = catalogOrder.items.Select(m => new
                        {
                            make = m.make,
                            code = m.code,
                            quantity = m.quantity
                        })
                    };
                    DispatchEventToChrome(chromeMessage);
                }

                //IsOrdering = true;
                ProductOrderList.Add(request);
                return request;
            }
        }

        public void PostProductOrderResponse(CatalogOrderRequest message)
        {
            LastActivity = DateTime.Now;
            CatalogOrderRequest request = ProductOrderList.SelectMany(m => m.catalogOrderList).Where(m => m.requestId == message.requestId).Single();
            request.status = message.status;
            request.response = message.response;
            IsOrdering = false;
        }

        private void DispatchEventToChrome(object message)
        {
            lock (IsOrderingLocker)
            {
                if (IsOrdering)
                    throw new Exception("IsOrdering");

                string js = $"document.dispatchEvent(new CustomEvent('DotNetToBackground', {JsonConvert.SerializeObject(new { detail = message })}));";
                ChromeDriver.ExecuteScript(js);
            }
        }
    }
}
