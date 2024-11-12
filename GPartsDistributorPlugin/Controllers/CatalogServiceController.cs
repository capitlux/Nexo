using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using GPartsDistributorPlugin.Models;
using Microsoft.Extensions.Options;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json.Linq;

namespace GPartsDistributorPlugin.Controllers
{
    public class CatalogServiceController : Controller
    {
        private readonly ILogger<HomeController> Logger;
        private readonly ChromeDriverService Service;
        private readonly IHttpContextAccessor ContextAccessor;
        private readonly IOptions<PluginConfig> PluginConfig;
        private string CurrentSettings;

        public CatalogServiceController(IOptions<PluginConfig> pluginConfig, IHttpContextAccessor contextAccessor, ILogger<HomeController> logger, ChromeDriverService service)
        {
            ContextAccessor = contextAccessor;
            Logger = logger;
            Service = service;
            PluginConfig = pluginConfig;
        }

        [HttpPost]
        public IActionResult Search([FromBody] SearchRequest request)
        {
            HttpContext.Session.SetString("GPartsDistributorPlugin", "KeepMySessionId");
            string searchId = Service.Search(ContextAccessor.HttpContext.Session.Id, request.term);
            return Json(new ClientSearchResponse() { searchId = searchId, configCatalogList = PluginConfig.Value.CatalogList });
        }

        [HttpPost]
        public IActionResult RequestQuantity([FromBody] QuantityMessage message)
        {
            HttpContext.Session.SetString("GPartsDistributorPlugin", "KeepMySessionId");
            message = Service.RequestQuantity(ContextAccessor.HttpContext.Session.Id, message);
            return Json(message);
        }

        [HttpPost]
        public IActionResult OrderProduct([FromBody] ProductOrderRequest message)
        {
            HttpContext.Session.SetString("GPartsDistributorPlugin", "KeepMySessionId");
            message = Service.OrderProduct(ContextAccessor.HttpContext.Session.Id, message);
            return Json(message);
        }

        [HttpPost]
        public IActionResult PostSearchResponse([FromBody] DriverSearchResponse response)
        {
            Service.PostSearchResponse(response);
            return Json(null);
        }

        [HttpPost]
        public IActionResult PostQuantityResponse([FromBody] QuantityCatalogRequest request)
        {
            Service.PostQuantityResponse(request);
            return Json(null);
        }

        [HttpPost]
        public IActionResult PostProductOrderResponse([FromBody] CatalogOrderRequest message)
        {
            Service.PostProductOrderResponse(message);
            return Json(null);
        }

        [HttpPost]
        public IActionResult GetSearchResult([FromBody] SearchRequest request)
        {
            ResultReadResponse result = Service.GetSearchResult(ContextAccessor.HttpContext.Session.Id, request.searchId);
            return Json(result);
        }

        [HttpPost]
        public IActionResult GetQuantityResult([FromBody] QuantityMessage message)
        {
            message = Service.GetQuantityResult(ContextAccessor.HttpContext.Session.Id, message);
            return Json(message);
        }

        [HttpPost]
        public IActionResult SyncSearch([FromBody] SearchRequest request)
        {
            HttpContext.Session.SetString("GPartsDistributorPlugin", "KeepMySessionId");
            string searchId = Service.Search(ContextAccessor.HttpContext.Session.Id, request.term);
            List<SearchResult> resultList = new List<SearchResult>();
            DateTime startSearch = DateTime.Now;
            ResultReadResponse response = null;
            do
            {
                Task.Delay(100).Wait();
                response = Service.GetSearchResult(ContextAccessor.HttpContext.Session.Id, searchId);
                resultList.AddRange(response.results);
            } while (response.catalogSearchStatusMap.Values.All(m => m != SearchStatus.Completed) && (DateTime.Now - startSearch).TotalMilliseconds < PluginConfig.Value.SyncSearchTimeout);

            return Json(resultList);
        }

        [HttpPost]
        public IActionResult SyncSettings([FromBody] Settings clientSettings)
        {
            bool hasVersionChanged = false;
            Settings result = Service.SyncSettings(clientSettings, ref hasVersionChanged);
            return Json(new { settings = result, hasVersionChanged = hasVersionChanged });
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
