using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace GPartsDistributorPlugin.Models
{
    public class PluginConfig
    {
        public string ServerUrlBase { get; set; }
        public int ChromeDriverCount { get; set; }
        public int SyncSearchTimeout { get; set; }
        public List<PluginConfigCatalog> CatalogList { get; set; }
    }
    public class PluginConfigCatalog
    {
        public string Id { get; set; }
        public int VendorId { get; set; }
        public string Name { get; set; }
        public string Login { get; set; }
        public string Password { get; set; }
        public string ClassName { get; set; }
        public string Url { get; set; }
        public bool QuantityRequestable { get; set; }
    }
}
