/**
 * Generic Base Provider
 *
 * @class
 */
/* exported BaseProvider */
class BaseProvider
{
    constructor()
    {
        this._key        = "";
        this._pattern    = /.*/;
        this._name       = "";
        this._type       = "";
        this._keywords   = [];
    }

    /**
     * Get the Provider's key
     *
     * @returns {string}
     */
    get key()
    {
        return this._key;
    }

    /**
     * Get the Provider's type
     *
     * @returns {string}
     */
    get type()
    {
        let types = {
            "analytics":    "Analytics",
            "testing":      "UX Testing",
            "tagmanager":   "Tag Manager",
            "visitorid":    "Visitor Identification",
            "marketing":    "Marketing"
        };
        return types[this._type] || "Unknown";
    }

    /**
     * Retrieve the keywords for searching
     *
     * @returns {[]}
     */
    get keywords()
    {
        return this._keywords;
    }

    /**
     * Get the Provider's RegExp pattern
     *
     * @returns {RegExp}
     */
    get pattern()
    {
        return this._pattern;
    }

    /**
     * Get the Provider's name
     *
     * @returns {string}
     */
    get name()
    {
        return this._name;
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {};
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {};
    }

    /**
     * Check if this provider should parse the given URL
     *
     * @param {string}  rawUrl   A URL to check against
     *
     * @returns {Boolean}
     */
    checkUrl(rawUrl)
    {
        return this.pattern.test(rawUrl);
    }

    /**
     * Parse a given URL into human-readable output
     *
     * @param {string}  rawUrl      A URL to check against
     * @param {string}  postData    POST data, if applicable
     *
     * @return {{provider: {name: string, key: string, type: string}, data: Array}}
     */
    parseUrl(rawUrl, postData = "")
    {
        let url = new URL(rawUrl),
            data = [],
            params = new URLSearchParams(url.search),
            postParams = this.parsePostData(postData);

        // Handle POST data first, if applicable (treat as query params)
        postParams.forEach((pair) => {
            params.append(pair[0], pair[1]);
        });

        for(let param of params)
        {
            let key = param[0],
                value = param[1],
                result = this.handleQueryParam(key, value);
            if(typeof result === "object") {
                data.push(result);
            }
        }

        let customData = this.handleCustom(url, params);
        if(typeof customData === "object" && customData !== null)
        {
            if(customData.length) {
                data = data.concat(customData);
            } else {
                data.push(customData);
            }
        }

        return {
            "provider": {
                "name":    this.name,
                "key":     this.key,
                "type":    this.type,
                "columns": this.columnMapping,
                "groups":  this.groups
            },
            "data": data
        };
    }

    /**
     * Parse any POST data into param key/value pairs
     *
     * @param postData
     * @return {Array|Object}
     */
    parsePostData(postData = "")
    {
        let params = [],
            parsed = {};
        if(typeof postData === "string" && postData)
        {
            try
            {
                parsed = JSON.parse(postData);
                /* Based on https://stackoverflow.com/a/19101235 */
                let recurse = (cur, prop) =>
                {
                    if (Object(cur) !== cur)
                    {
                        params.push([prop, cur]);
                    }
                    else if (Array.isArray(cur))
                    {
                        for(var i=0, l=cur.length; i<l; i++)
                        {
                            recurse(cur[i], prop + "[" + i + "]");
                        }
                        if (l === 0)
                        {
                            params.push([prop, ""]);
                        }
                    }
                    else
                    {
                        let isEmpty = true;
                        for (let p in cur)
                        {
                            if (!Object.prototype.hasOwnProperty.call(cur, p)) { continue; }
                            isEmpty = false;
                            recurse(cur[p], prop ? prop+"."+p : p);
                        }
                        if (isEmpty && prop)
                        {
                            params.push([prop, ""]);
                        }
                    }
                };
                recurse(parsed, "");
            }
            catch(e)
            {
                console.error("postData is not JSON", e.message);
            }
        }
        else if(typeof postData === "object" && postData)
        {
            // Form data type
            Object.entries(postData).forEach((entry) => {
                params.push([entry[0], entry[1].toString()]);
            });
        }
        return params;
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     * @returns {{}}
     */
    handleQueryParam(name, value)
    {
        let param = this.keys[name] || {};
        if(!param.hidden) {
            return {
                "key":   name,
                "field": param.name || name,
                "value": value,
                "group": param.group || "other"
            };
        }
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params)
    {

    }
}
/**
 * Omnibug Provider Factory
 *
 * @type {{addProvider, getProviders, checkUrl, getProviderForUrl, parseUrl, defaultPattern}}
 */
/* exported OmnibugProvider */
var OmnibugProvider = (function() {

    var providers = {},
        defaultPattern = [],
        defaultPatternRegex = new RegExp();

    /**
     * Return the provider for a specified url
     *
     * @param url
     *
     * @returns {typeof BaseProvider}
     */
    let getProviderForUrl = (url) => {
        for(let provider in providers) {
            if (Object.prototype.hasOwnProperty.call(providers, provider) && providers[provider].checkUrl(url)) {
                return providers[provider];
            }
        }
        return new BaseProvider();
    };

    return {

        /**
         * Add a new provider
         *
         * @param {typeof BaseProvider} provider
         */
        "addProvider": (provider) => {
            providers[provider.key] = provider;
            defaultPattern.push(provider.pattern);
            defaultPatternRegex = new RegExp(defaultPattern.map((el) => {
                return el.source;
            }).join("|"));
        },

        /**
         * Returns a list of all added providers
         *
         * @returns {{}}
         */
        "getProviders": () => {
            return providers;
        },

        /**
         * Checks if a URL should be parsed or not
         *
         * @param {string}  url   URL to check against
         *
         * @returns {boolean}
         */
        "checkUrl": (url) => {
            return defaultPatternRegex.test(url);
        },

        /**
         * Return the provider for a specified url
         *
         * @param url
         *
         * @returns {typeof BaseProvider}
         */
        "getProviderForUrl": getProviderForUrl,

        /**
         * Parse a URL into a JSON object
         *
         * @param {string}  url         URL to be parsed
         * @param {string}  postData    POST data, if applicable
         *
         * @returns {{provider, data}}
         */
        "parseUrl": (url, postData = "") => {
            return getProviderForUrl(url).parseUrl(url, postData);
        },

        /**
         * Return the patterns for all (enabled) providers
         *
         * @param   {void|{}}  providerInfo    Providers that are disabled
         *
         * @returns {RegExp}
         */
        "getPattern": (providerInfo = {}) => {
            let patterns = [];
            Object.keys(providers).forEach((provider) => {
                if(typeof providerInfo[provider] === "undefined" || providerInfo[provider].enabled) {
                    patterns.push(providers[provider].pattern.source);
                }
            });
            return new RegExp(patterns.join("|"), "i");
        }
    };
})();
/**
 * Adobe Analytics
 * http://www.adobe.com/data-analytics-cloud/analytics.html
 *
 * @class
 * @extends BaseProvider
 */
class AdobeAnalyticsProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "ADOBEANALYTICS";
        this._pattern    = /^([^#?]+)(\/b\/ss\/)|\.2o7\.net\/|\.sc\d?\.omtrdc\.net\/(?!id)/;
        this._name       = "Adobe Analytics";
        this._type       = "analytics";
        this._keywords   = ["aa", "site catalyst", "sitecatalyst", "omniture"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "rsid",
            "requestType":  "requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general", 
                "name": "General"
            }, 
            {
                "key": "props",
                "name": "Custom Traffic Variables (props)"
            }, 
            {
                "key": "eVars",
                "name": "Custom Conversion Variables (eVars)"
            },
            {
                "key": "listvar",
                "name": "List Variables"
            },
            {
                "key": "hier",
                "name": "Hierarchy Variables"
            }, 
            {
                "key": "media",
                "name": "Media Module"
            }, 
            {
                "key": "activity",
                "name": "Activity Map"
            }, 
            {
                "key": "context",
                "name": "Context Data"
            },
            {
                "key": "customerid",
                "name": "Customer ID"
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "ns": {
                "name": "Visitor namespace",
                "group": "general"
            },
            "ndh": {
                "name": "Image sent from JS?",
                "group": "other"
            },
            "ch": {
                "name": "Channel",
                "group": "general"
            },
            "r": {
                "name": "Referrer URL",
                "group": "general"
            },
            "ce": {
                "name": "Character set",
                "group": "general"
            },
            "cl": {
                "name": "Cookie lifetime",
                "group": "other"
            },
            "g": {
                "name": "Current URL",
                "group": "general"
            },
            "bw": {
                "name": "Browser width",
                "group": "other"
            },
            "bh": {
                "name": "Browser height",
                "group": "other"
            },
            "s": {
                "name": "Screen resolution",
                "group": "other"
            },
            "c": {
                "name": "Screen color depth",
                "group": "other"
            },
            "ct": {
                "name": "Connection type",
                "group": "other"
            },
            "p": {
                "name": "Netscape plugins",
                "group": "other"
            },
            "k": {
                "name": "Cookies enabled?",
                "group": "other"
            },
            "hp": {
                "name": "Home page?",
                "group": "other"
            },
            "pid": {
                "name": "Page ID",
                "group": "general"
            },
            "pidt": {
                "name": "Page ID type",
                "group": "general"
            },
            "oid": {
                "name": "Object ID",
                "group": "general"
            },
            "oidt": {
                "name": "Object ID type",
                "group": "general"
            },
            "ot": {
                "name": "Object tag name",
                "group": "general"
            },
            "pe": {
                "name": "Link type",
                "group": "general"
            },
            "pev1": {
                "name": "Link URL",
                "group": "general"
            },
            "pev2": {
                "name": "Link name",
                "group": "general"
            },
            "pev3": {
                "name": "Video milestone",
                "group": "general"
            },
            "cc": {
                "name": "Currency code",
                "group": "general"
            },
            "t": {
                "name": "Browser time",
                "group": "other"
            },
            "v": {
                "name": "Javascript-enabled browser?",
                "group": "other"
            },
            "pccr": {
                "name": "Prevent infinite redirects",
                "group": "other"
            },
            "vid": {
                "name": "Visitor ID",
                "group": "general"
            },
            "vidn": {
                "name": "New visitor ID",
                "group": "general"
            },
            "fid": {
                "name": "Fallback Visitor ID",
                "group": "general"
            },
            "mid": {
                "name": "Marketing Cloud Visitor ID",
                "group": "general"
            },
            "mcorgid ": {
                "name": "Marketing Cloud Org ID",
                "group": "general"
            },
            "aid": {
                "name": "Legacy Visitor ID",
                "group": "general"
            },
            "cdp": {
                "name": "Cookie domain periods",
                "group": "general"
            },
            "pageName": {
                "name": "Page name",
                "group": "general"
            },
            "pageType": {
                "name": "Page type",
                "group": "general"
            },
            "server": {
                "name": "Server",
                "group": "general"
            },
            "events": {
                "name": "Events",
                "group": "general"
            },
            "products": {
                "name": "Products",
                "group": "general"
            },
            "purchaseID": {
                "name": "Purchase ID",
                "group": "general"
            },
            "state": {
                "name": "Visitor state",
                "group": "general"
            },
            "vmk": {
                "name": "Visitor migration key",
                "group": "other"
            },
            "vvp": {
                "name": "Variable provider",
                "group": "other"
            },
            "xact": {
                "name": "Transaction ID",
                "group": "general"
            },
            "zip": {
                "name": "ZIP/Postal code",
                "group": "general"
            },
            "rsid": {
                "name": "Report Suites",
                "group": "general"
            },
            "requestType": {
                "hidden": true
            }
        };
    }

    /**
     * Parse a given URL into human-readable output
     *
     * @param {string}  rawUrl   A URL to check against
     * @param {string}  postData    POST data, if applicable
     *
     * @return {{provider: {name: string, key: string, type: string}, data: Array}}
     */
    parseUrl(rawUrl, postData = "")
    {
        let url = new URL(rawUrl),
            data = [],
            stacked = [],
            params = new URLSearchParams(url.search),
            postParams = this.parsePostData(postData);

        // Handle POST data first, if applicable (treat as query params)
        postParams.forEach((pair) => {
            params.append(pair[0], pair[1]);
        });

        for(let param of params)
        {
            let key = param[0],
                value = param[1];

            // Stack context data params
            if (/\.$/.test(key)) {
                stacked.push(key);
                continue;
            }
            if (/^\./.test(key)) {
                stacked.pop();
                continue;
            }

            let stackedParam = stacked.join("") + key,
                result = this.handleQueryParam(stackedParam, value);
            if(typeof result === "object") {
                data.push(result);
            }
        }

        data = data.concat(this.handleCustom(url, params));

        return {
            "provider": {
                "name": this.name,
                "key":  this.key,
                "type": this.type,
                "columns": this.columnMapping,
                "groups":  this.groups
            },
            "data": data
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value)
    {
        let result = {};
        if(/^(?:c|prop)(\d+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": "prop" + RegExp.$1,
                "value": value,
                "group": "props"
            };
        } else if(/^(?:v|eVar)(\d+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": "eVar" + RegExp.$1,
                "value": value,
                "group": "eVars"
            };
        } else if(/^(?:h|hier)(\d+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": "Hierarchy " + RegExp.$1,
                "value": value,
                "group": "hier"
            };
        } else if(/^(?:l|list)(\d+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": "List Var " + RegExp.$1,
                "value": value,
                "group": "listvar"
            };
        } else if(name.indexOf(".a.media.") > 0) {
            result = {
                "key":   name,
                "field": name.split(".").pop(),
                "value": value,
                "group": "media"
            };
        } else if(name.indexOf(".a.activitymap.") > 0) {
            result = {
                "key":   name,
                "field": name.split(".").pop(),
                "value": value,
                "group": "activity"
            };
        } else if(name.indexOf("cid.") === 0) {
            result = {
                "key":   name,
                "field": name.replace("cid.", ""),
                "value": value,
                "group": "customerid"
            };
        } else if(name.indexOf(".") > 0) {
            result = {
                "key":   name,
                "field": name.replace("c.", ""),
                "value": value,
                "group": "context"
            };
        } else if(/^(AQB|AQE)$/i.test(name)) {
            // ignore
            return;
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse any POST data into param key/value pairs
     *
     * @param postData
     * @return {Array|Object}
     */
    parsePostData(postData = "") {
        let params = [];
        // Handle POST data first, if applicable (treat as query params)
        if (typeof postData === "string" && postData !== "") {
            let keyPairs = postData.split("&");
            keyPairs.forEach((keyPair) => {
                let splitPair = keyPair.split("=");
                params.push([splitPair[0], decodeURIComponent(splitPair[1] || "")]);
            });
        } else if (typeof postData === "object") {
            Object.entries(postData).forEach((entry) => {
                // @TODO: consider handling multiple values passed?
                params.push([entry[0], entry[1].toString()]);
            });
        }
        return params;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {Array}
     */
    handleCustom(url, params)
    {
        let results = [],
            rsid = url.pathname.match(/\/b\/ss\/([^/]+)\//),
            jsVersion = url.pathname.match(/\/(JS-[^/]+)\//i),
            pev2 = params.get("pe"),
            requestType = "Page View";
        if(rsid) {
            results.push({
                "key":   "rsid",
                "field": this.keys.rsid ? this.keys.rsid.name : "Report Suites",
                "value": rsid[1],
                "group": this.keys.rsid ? this.keys.rsid.group : "general",
            });
        }
        if(jsVersion) {
            results.push({
                "key":   "version",
                "field": this.keys.version ? this.keys.version.name : "JavaScript Version",
                "value": jsVersion[1],
                "group": this.keys.version ? this.keys.version.group : "general",
            });
        }
        results.push({
            "key":   "trackingServer",
            "field": "Tracking Server",
            "value": url.hostname,
            "group": "general",
        });

        // Handle s.tl calls
        if(pev2 === "lnk_e") {
            requestType = "Exit Click";
        } else if(pev2 === "lnk_d") {
            requestType = "Download Click";
        } else if(pev2 === "lnk_o") {
            requestType = "Other Click";
        } else if(/^m_/.test(pev2)) {
            requestType = "Media";
        }
        results.push({
            "key":   "requestType",
            "value": requestType,
            "hidden": true
        });
        return results;
    }
}
/**
 * Adobe Audience Manager
 * http://www.adobe.com/data-analytics-cloud/audience-manager.html
 *
 * @class
 * @extends BaseProvider
 */
class AdobeAudienceManagerProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "ADOBEAUDIENCEMANAGER";
        this._pattern    = /demdex\.net\/(ibs|event)[?/#:]/;
        this._name       = "Adobe Audience Manager";
        this._type       = "visitorid";
        this._keywords   = ["aam"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "requestType": "omnibug_requestType",
            "account": "omnibug_account"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            },
            {
                "key": "customer",
                "name": "Customer Attributes"
            },
            {
                "key": "private",
                "name": "Private Attributes"
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "caller": {
                "name": "Caller",
                "group": "general"
            },
            "cb": {
                "name": "Callback property",
                "group": "general"
            },
            "cid": {
                "name": "Data Provider (User) IDs",
                "group": "general"
            },
            "ciic": {
                "name": "Integration Code / User ID",
                "group": "general"
            },
            "coppa": {
                "name": "COPPA Request",
                "group": "general"
            },
            "cts": {
                "name": "Return Traits & Segments in Response",
                "group": "general"
            },
            "dpid": {
                "name": "Data Provider ID",
                "group": "general"
            },
            "dpuuid": {
                "name": "Data Provider User ID",
                "group": "general"
            },
            "dst": {
                "name": "Return URL Destination in Response",
                "group": "general"
            },
            "dst_filter": {
                "name": "Adobe Analytics Integration",
                "group": "general"
            },
            "jsonv": {
                "name": "JSON Response Version",
                "group": "general"
            },
            "mid": {
                "name": "Experience Cloud ID",
                "group": "general"
            },
            "nsid": {
                "name": "Name Space ID",
                "group": "general"
            },
            "ptfm": {
                "name": "Platform",
                "group": "general"
            },
            "rs": {
                "name": "Legacy Adobe Analytics Integration",
                "group": "general"
            },
            "rtbd": {
                "name": "Return Method",
                "group": "general"
            },
            "sid": {
                "name": "Score ID",
                "group": "general"
            },
            "tdpid": {
                "name": "Trait Source",
                "group": "general"
            },
            "tdpiic": {
                "name": "Trait Source (Integration Code)",
                "group": "general"
            },
            "uuid": {
                "name": "Unique User ID",
                "group": "general"
            },
        };
    }

    /**
     * Parse a given URL into human-readable output
     *
     * @param {string}  rawUrl      A URL to check against
     * @param {string}  postData    POST data, if applicable
     *
     * @return {{provider: {name: string, key: string, type: string}, data: Array}}
     */
    parseUrl(rawUrl, postData = "")
    {
        let url = new URL(rawUrl),
            data = [],
            params = new URLSearchParams(url.search);

        // Force Adobe's path into query strings
        if(url.pathname.indexOf("/ibs:") === 0) {
            url.pathname.replace("/ibs:", "").split("&").forEach(param => {
                let pair = param.split("=");
                params.append(pair[0], pair[1]);
            });
        }
        for(let param of params)
        {
            let key = param[0],
                value = param[1],
                result = this.handleQueryParam(key, value);
            if(typeof result === "object") {
                data.push(result);
            }
        }

        let customData = this.handleCustom(url, params);
        /* istanbul ignore else */
        if(typeof customData === "object" && customData !== null)
        {
            data = data.concat(customData);
        }

        return {
            "provider": {
                "name":    this.name,
                "key":     this.key,
                "type":    this.type,
                "columns": this.columnMapping,
                "groups":  this.groups
            },
            "data": data
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value)
    {
        let result = {};
        if(/^c_(.+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": name,
                "value": value,
                "group": "custom"
            };
        } else if(/^p_(.+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": name,
                "value": value,
                "group": "private"
            };
        } else if(/^d_(.+)$/i.test(name) && this.keys[RegExp.$1]) {
            result = {
                "key":   name,
                "field": this.keys[RegExp.$1].name,
                "value": value,
                "group": this.keys[RegExp.$1].group
            };
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {Array}
     */
    handleCustom(url, params)
    {
        let results = [],
            accountID = url.hostname.replace(/^(dpm)?.demdex.net/i, ""),
            requestType = url.pathname.match(/^\/([^?/#:]+)/);
        results.push({
            "key":   "omnibug_account",
            "value": accountID,
            "hidden": true
        });

        if(requestType[1] === "ibs") {
            requestType = "ID Sync";
        } else if(requestType[1] === "event") {
            requestType = "Event";
        } else {
            requestType = requestType[1];
        }
        results.push({
            "key":   "omnibug_requestType",
            "value": requestType,
            "hidden": true
        });
        return results;
    }
}
/**
 * Adobe Dynamic Tag Manager (DTM)
 * https://dtm.adobe.com/
 *
 * @class
 * @extends BaseProvider
 */
class AdobeDynamicTagManagerProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "ADOBEDTM";
        this._pattern    = /\/satelliteLib-[^.]+\.js/;
        this._name       = "Adobe Dynamic Tag Manager";
        this._type       = "tagmanager";
        this._keywords   = ["dtm", "activate", "activation", "tms"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "environment",
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            }
        ];
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params)
    {
        let matches =  url.pathname.match(/\/satelliteLib-[^.-]+(-staging)?\.js/),
            env = (matches && matches[1]) ? matches[1].replace("-", "") : "production",
            results = [];
        results.push({
            "key":   "environment",
            "field": "DTM Environment",
            "value": env,
            "group": "general"
        });

        return results;
    }
}
/**
 * Adobe Experience ID Service
 * http://www.adobe.com/data-analytics-cloud/audience-manager.html
 *
 * @class
 * @extends BaseProvider
 */
class AdobeExperienceIDProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "ADOBEEXPERIENCEID";
        this._pattern    = /\/id\?(?=.*d_visid_ver=)(?=.*(d_orgid|mcorgid)=)/;
        this._name       = "Adobe Experience Cloud ID";
        this._type       = "visitorid";
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "requestType": "omnibug_requestType",
            "account": "omnibug_account"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "d_orgid": {
                "name": "Adobe Organization ID",
                "group": "general"
            },
            "d_rtbd": {
                "name": "Return Method",
                "group": "general"
            },
            "d_cb": {
                "name": "Callback property",
                "group": "general"
            },
            "mcorgid": {
                "name": "Adobe Organization ID",
                "group": "general"
            },
            "d_visid_ver": {
                "name": "Experience Cloud ID Version",
                "group": "general"
            },
            "d_cid_ic": {
                "name": "Integration Code / User ID",
                "group": "general"
            },
        };
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {Array}
     */
    handleCustom(url, params)
    {
        let results = [],
            accountID = "";
        if(params.get("d_orgid")) {
            accountID = params.get("d_orgid");
        } else if(params.get("mcorgid")) {
            accountID = params.get("mcorgid");
        }
        results.push({
            "key":   "omnibug_account",
            "value": accountID,
            "hidden": true
        });
        return results;
    }
}
/**
 * Adobe Heartbeat
 * https://marketing.adobe.com/resources/help/en_US/sc/appmeasurement/hbvideo/
 *
 * @class
 * @extends BaseProvider
 */
class AdobeHeartbeatProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "ADOBEHEARTBEAT";
        this._pattern    = /\.hb\.omtrdc\.net\//;
        this._name       = "Adobe Heartbeat";
        this._type       = "analytics";
        this._keywords   = ["video"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "s:sc:rsid",
            "requestType":  "omnibug_requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "s:asset:video_id": {
                "name": "Content ID",
                "group": "general"
            },
            "l:asset:length": {
                "name": "Video Length",
                "group": "general"
            },
            "s:stream:type": {
                "name": "Content Type",
                "group": "general"
            },
            "s:event:sid": {
                "name": "Video Session ID",
                "group": "general"
            },
            "s:sp:player_name": {
                "name": "Content Player Name",
                "group": "general"
            },
            "s:sp:channel": {
                "name": "Content Channel",
                "group": "general"
            },
            "s:asset:name": {
                "name": "Video Name",
                "group": "general"
            },
            "s:sp:sdk": {
                "name": "SDK Version",
                "group": "general"
            },
            "s:sp:hb_version": {
                "name": "VHL Version",
                "group": "general"
            },
            "s:meta:a.media.show": {
                "name": "Show",
                "group": "general"
            },
            "s:meta:a.media.format": {
                "name": "Stream Format",
                "group": "general"
            },
            "s:meta:a.media.season": {
                "name": "Season",
                "group": "general"
            },
            "s:meta:a.media.episode": {
                "name": "Episode",
                "group": "general"
            },
            "s:meta:a.media.asset": {
                "name": "Asset ID",
                "group": "general"
            },
            "s:meta:a.media.genre": {
                "name": "Genre",
                "group": "general"
            },
            "s:meta:a.media.airDate": {
                "name": "First Air Date",
                "group": "general"
            },
            "s:meta:a.media.digitalDate": {
                "name": "First Digital Date",
                "group": "general"
            },
            "s:meta:a.media.rating": {
                "name": "Content Rating",
                "group": "general"
            },
            "s:meta:a.media.originator": {
                "name": "Originator",
                "group": "general"
            },
            "s:meta:a.media.network": {
                "name": "Network",
                "group": "general"
            },
            "s:meta:a.media.type": {
                "name": "Show Type",
                "group": "general"
            },
            "s:meta:a.media.pass.mvpd": {
                "name": "MVPD",
                "group": "general"
            },
            "s:meta:a.media.pass.auth": {
                "name": "Authorized",
                "group": "general"
            },
            "s:meta:a.media.dayPart": {
                "name": "Day Part",
                "group": "general"
            },
            "s:meta:a.media.feed": {
                "name": "Video Feed Type",
                "group": "general"
            },
            "s:meta:a.media.adload": {
                "name": "Ad Load Type",
                "group": "general"
            },
            "s:event:type": {
                "name": "Event Type",
                "group": "general"
            },
            "omnibug_requestType": {
                "hidden": true
            }
        };
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {Array}
     */
    handleCustom(url, params)
    {
        let results = [],
            event = params.get("s:event:type");
        results.push({
            "key":   "omnibug_requestType",
            "value": event.charAt(0).toUpperCase() + event.slice(1),
            "hidden": true
        });
        return results;
    }
}
/**
 * Adobe Launch
 * https://launch.adobe.com/
 *
 * @class
 * @extends BaseProvider
 */
class AdobeLaunchProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "ADOBELAUNCH";
        this._pattern    = /assets\.adobedtm\.com\/launch-[^?#]+.js/;
        this._name       = "Adobe Launch";
        this._type       = "tagmanager";
        this._keywords   = ["activate", "activation", "tms"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "environment",
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            }
        ];
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params)
    {
        let matches =  url.pathname.match(/\/launch-[^.-]+(-[^.]+)(?:\.min)?\.js/),
            env = (matches && matches[1]) ? matches[1].replace("-", "") : "production",
            results = [];
        results.push({
            "key":   "environment",
            "field": "Launch Environment",
            "value": env,
            "group": "general"
        });

        return results;
    }
}
/**
 * Adobe Target
 * http://www.adobe.com/marketing-cloud/target.html
 *
 * @class
 * @extends BaseProvider
 */
class AdobeTargetProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "ADOBETARGET";
        this._pattern    = /\.tt\.omtrdc\.net\/(?!cdn\/)/;
        this._name       = "Adobe Target";
        this._type       = "testing";
        this._keywords   = ["test target", "test & target", "at", "tnt", "t&t", "omniture"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "mbox",
            "requestType":  "mboxType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            },
            {
                "key": "profile",
                "name": "Profile Attributes"
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "mbox": {
                "name": "Mbox Name",
                "group": "general"
            },
            "mboxType": {
                "name": "Mbox Type",
                "group": "general"
            },
            "mboxCount": {
                "name": "Mbox Count",
                "group": "general"
            },
            "mboxId": {
                "name": "Mbox ID",
                "group": "general"
            },
            "mboxSession": {
                "name": "Mbox Session",
                "group": "general"
            },
            "mboxPC": {
                "name": "Mbox PC ID",
                "group": "general"
            },
            "mboxPage": {
                "name": "Mbox Page ID",
                "group": "general"
            },
            "clientCode": {
                "name": "Client Code",
                "group": "general"
            },
            "mboxHost": {
                "name": "Page Host",
                "group": "general"
            },
            "mboxURL": {
                "name": "Page URL",
                "group": "general"
            },
            "mboxReferrer": {
                "name": "Page Referrer",
                "group": "general"
            },
            "screenHeight": {
                "name": "Screen Height",
                "group": "general"
            },
            "screenWidth": {
                "name": "Screen Width",
                "group": "general"
            },
            "browserWidth": {
                "name": "Browser Width",
                "group": "general"
            },
            "browserHeight": {
                "name": "Browser Height",
                "group": "general"
            },
            "browserTimeOffset": {
                "name": "Browser Timezone Offset",
                "group": "general"
            },
            "colorDepth": {
                "name": "Browser Color Depth",
                "group": "general"
            },
            "mboxXDomain": {
                "name": "CrossDomain Enabled",
                "group": "general"
            },
            "mboxTime": {
                "name": "Timestamp",
                "group": "general"
            },
            "mboxVersion": {
                "name": "Library Version",
                "group": "general"
            }
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value)
    {
        let result = {};
        if(name.indexOf("profile.") === 0) {
            result = {
                "key":   name,
                "field": name.slice(8),
                "value": value,
                "group": "profile"
            };
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params)
    {
        let matches =  url.pathname.match( /\/([^/]+)\/mbox\/([^/?]+)/ ),
            results = [];
        if(matches !== null && matches.length === 3) {
            results.push({
                "key":   "clientCode",
                "field": "Client Code",
                "value": matches[1],
                "group": "general"
            });
            results.push({
                "key":   "mboxType",
                "field": "Mbox Type",
                "value": matches[2],
                "group": "general"
            });
        }

        return results;
    }
}
/**
 * AT Internet
 * https://www.atinternet.com/
 *
 * @class
 * @extends BaseProvider
 */
class ATInternetProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "ATINTERNET";
        this._pattern    = /^([^#?]+)(\/hit\.xiti)/;
        this._name       = "AT Internet";
        this._type       = "analytics";
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "s",
            "requestType":  "requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            },
            {
                "key": "content",
                "name": "Content Variables"
            },
            {
                "key": "custom",
                "name": "Custom Variables"
            },
            {
                "key": "media",
                "name": "Media Variables"
            },
            {
                "key": "click",
                "name": "Click Variables"
            }
        ];
    }


    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "col": {
                "name": "Protocol Version",
                "group": "general"
            },
            "vtag": {
                "name": "Library Version",
                "group": "general"
            },
            "ptag": {
                "name": "Tag Type",
                "group": "general"
            },
            "r": {
                "name": "Screen Info",
                "group": "general"
            },
            "re": {
                "name": "Window Resolution",
                "group": "general"
            },
            "ref": {
                "name": "Referrer",
                "group": "general"
            },
            "lng": {
                "name": "Language",
                "group": "general"
            },
            "ts": {
                "name": "Timestamp",
                "group": "general"
            },
            "from": {
                "name": "Method of Hit Generation",
                "group": "general"
            },
            "s": {
                "name": "Site Number",
                "group": "general"
            },
            "idclient": {
                "name": "Unique Visitor ID",
                "group": "general"
            },
            "an": {
                "name": "Visitor Numerical ID",
                "group": "general"
            },
            "at": {
                "name": "Visitor Textual ID",
                "group": "general"
            },
            "ac": {
                "name": "Visitor Category ID",
                "group": "general"
            },
            "dg": {
                "name": "Display Size Type",
                "group": "general"
            },
            "p": {
                "name": "Content",
                "group": "content"
            },
            "s2": {
                "name": "Level 2",
                "group": "content"
            },
            "click": {
                "name": "Click Type",
                "group": "click"
            },
            "pclick": {
                "name": "Clicked Page Name",
                "group": "click"
            },
            "s2click": {
                "name": "Clicked Level 2",
                "group": "click"
            },
            "mc": {
                "name": "Search Keyword",
                "group": "content"
            },
            "np": {
                "name": "Search Results Count",
                "group": "content"
            },
            "mcrg": {
                "name": "Search Results Position Clicked",
                "group": "click"
            },
            "ptype": {
                "name": "Custom Tree",
                "group": "general"
            },
            "aisl": {
                "name": "Aisles",
                "group": "general"
            },
            "action": {
                "name": "Action",
                "group": "media"
            },
            "type": {
                "name": "Media Type",
                "group": "media"
            },
            "m6": {
                "name": "Broadcast Type",
                "group": "media"
            },
            "m1": {
                "name": "Content Duration",
                "group": "media"
            },
            "m5": {
                "name": "Broadcast Location",
                "group": "media"
            },
            "buf": {
                "name": "Buffering",
                "group": "media"
            },
            "prich": {
                "name": "Page",
                "group": "media"
            },
            "s2rich": {
                "name": "Page Level 2",
                "group": "media"
            },
            "plyr": {
                "name": "Player ID",
                "group": "media"
            },
            "clnk": {
                "name": "Linked Content",
                "group": "media"
            },
            "m9": {
                "name": "Broadcast Domain",
                "group": "media"
            }
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value)
    {
        let result = {};
        if(/^x(\d+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": "Custom Site " + RegExp.$1,
                "value": value,
                "group": "custom"
            };
        } else if(/^f(\d+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": "Custom Page " + RegExp.$1,
                "value": value,
                "group": "custom"
            };
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {Array}
     */
    handleCustom(url, params)
    {
        let results = [],
            type = params.get("type"),
            requestType = type || "Page View";

        results.push({
            "key":   "trackingServer",
            "field": "Tracking Server",
            "value": url.hostname,
            "group": "general",
        });
        results.push({
            "key":   "requestType",
            "value": requestType,
            "hidden": true
        });
        return results;
    }
}
/**
 * Comscore
 * https://direct.comscore.com/clients/help/FAQ.aspx#faqTagging
 *
 * @class
 * @extends BaseProvider
 */

class ComscoreProvider extends BaseProvider {
    constructor() {
        super();
        this._key = "COMSCORE";
        this._pattern = /sb\.scorecardresearch\.com(?!.*\.js($|[?#]))/;
        this._name = "Comscore";
        this._type = "marketing";
    }

    /**
   * Retrieve the column mappings for default columns (account, event type)
   *
   * @return {{}}
   */
    get columnMapping() {
        return {
            account: "c2",
            requestType: "c1"
        };
    }

    /**
   * Retrieve the group names & order
   *
   * @returns {*[]}
   */
    get groups() {
        return [
            {
                key: "custom",
                name: "Custom"
            }
        ];
    }

    /**
   * Parse a given URL parameter into human-readable form
   *
   * @param {string}  name
   * @param {string}  value
   *
   * @returns {void|{}}
   */
    handleQueryParam(name, value) {
        let result = {};
        const customRegex = /^c\S+$/;
        if (name.match(customRegex)) {
            result = {
                key: name,
                field: name,
                value: value,
                group: "custom"
            };
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }
}

/**
 * Ensighten Manage
 * https://www.ensighten.com/products/enterprise-tag-management/
 *
 * @class
 * @extends BaseProvider
 */
class EnsightenManageProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "ENSIGHTENMANAGE";
        this._pattern    = /nexus\.ensighten\.com\/(?=.*Bootstrap\.js)/;
        this._name       = "Ensighten Manage";
        this._type       = "tagmanager";
        this._keywords   = ["tms"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "omnibug_account"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            }
        ];
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params)
    {
        let matches =  url.pathname.match(/^\/([^/]+)\/(?:([^/]+)\/)?Bootstrap\.js/),
            results = [];
        /* istanbul ignore else */
        if(matches !== null) {
            matches[2] = matches[2] || "prod";
            results.push({
                "key":   "omnibug_account",
                "value": `${matches[1]} / ${matches[2]}`,
                "hidden": true
            });
            results.push({
                "key":   "client",
                "field": "Client",
                "value": matches[1],
                "group": "general"
            });
            results.push({
                "key":   "profile",
                "field": "Profile",
                "value": matches[2],
                "group": "general"
            });
        }

        return results;
    }
}
/**
 * Facebook Pixel
 * https://developers.facebook.com/docs/facebook-pixel
 *
 * @class
 * @extends BaseProvider
 */
class FacebookPixelProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "FACEBOOKPIXEL";
        this._pattern    = /facebook\.com\/tr\/?(?!.*&ev=microdata)\?/i;
        this._name       = "Facebook Pixel";
        this._type       = "marketing";
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "id",
            "requestType":  "requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            },
            {
                "key": "custom",
                "name": "Event Data"
            },
            {
                "key": "products",
                "name": "Products"
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "id": {
                "name": "Account ID",
                "group": "general"
            },
            "ev": {
                "name": "Event Type",
                "group": "general"
            },
            "dl": {
                "name": "Page URL",
                "group": "general"
            },
            "rl": {
                "name": "Referring URL",
                "group": "general"
            },
            "ts": {
                "name": "Timestamp",
                "group": "general"
            },
            "sw": {
                "name": "Screen Width",
                "group": "other"
            },
            "sh": {
                "name": "Screen Height",
                "group": "other"
            },
            "v": {
                "name": "Pixel Version",
                "group": "other"
            },
            "ec": {
                "name": "Event Count",
                "group": "other"
            },
            "if": {
                "name": "In an iFrame",
                "group": "other"
            },
            "it": {
                "name": "Initialized Timestamp",
                "group": "other"
            },
            "r": {
                "name": "Code Branch",
                "group": "other"
            },
            "cd[content_name]": {
                "name": "Content Name",
                "group": "custom"
            },
            "cd[content_category]": {
                "name": "Content Category",
                "group": "custom"
            },
            "cd[content_ids]": {
                "name": "Product IDs",
                "group": "products"
            },
            "cd[content_type]": {
                "name": "Content Type",
                "group": "custom"
            },
            "cd[num_items]": {
                "name": "Quantity",
                "group": "custom"
            },
            "cd[search_string]": {
                "name": "Search Keyword",
                "group": "custom"
            },
            "cd[status]": {
                "name": "Registration Status",
                "group": "custom"
            },
            "cd[value]": {
                "name": "Value",
                "group": "custom"
            },
            "cd[currency]": {
                "name": "Currency",
                "group": "custom"
            },
            "ud[uid]": {
                "name": "User ID",
                "group": "general"
            }
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value)
    {
        let result = {};
        if(name === "cd[contents]") {
            // do handling in custom
        } else if(!this.keys[name] && name.indexOf("cd[") === 0) {
            result = {
                "key":   name,
                "field": name.replace(/^cd\[|\]$/g, ""),
                "value": value,
                "group": "custom"
            };
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params)
    {
        let results = [],
            content = params.get("cd[contents]"),
            requestType = params.get("ev") || "";
        if(content) {
            try {
                let jsonData = JSON.parse(content);
                if(jsonData && jsonData.length) {
                    let keyMapping = {
                        "id": "ID",
                        "item_price": "Price",
                        "quantity": "Quantity"
                    };
                    jsonData.forEach((product, index) => {
                        Object.entries(product).forEach(([key, value]) => {
                            results.push({
                                "key": `cd[contents][${index}][${key}]`,
                                "field": `Product ${index+1} ${keyMapping[key] || key}`,
                                "value": value,
                                "group": "products"
                            });
                        });
                    });
                }
            } catch(e) {
                results.push({
                    "key": "cd[contents]",
                    "field": "Content",
                    "value": content,
                    "group": "products"
                });
            }
        }

        results.push({
            "key":   "requestType",
            "value": requestType.split(/(?=[A-Z])/).join(" "),
            "hidden": true
        });
        return results;
    }
}
/**
 * Google Ads
 * https://ads.google.com/
 *
 * @class
 * @extends BaseProvider
 */
class GoogleAdsProvider extends BaseProvider {
    constructor() {
        super();
        this._key = "GOOGLEADS";
        this._pattern = /googleads\.g\.doubleclick\.net\/pagead\//;
        this._name = "Google Ads";
        this._type = "marketing";
        this._keywords = ["aw", "ad words"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping() {
        return {
            "account": "omnibug-account",
            "requestType": "requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups() {
        return [
            {
                "key": "general",
                "name": "General"
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys() {
        return {
            "url": {
                "name": "Page URL",
                "group": "general"
            },
            "tiba": {
                "name": "Page Title",
                "group": "general"
            },
            "data": {
                "name": "Event Data",
                "group": "general"
            },
            "label": {
                "name": "Conversion Label",
                "group": "general"
            }
        };
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {Array}
     */
    handleCustom(url, params) {
        let results = [],
            pathParts = url.pathname.match(/\/([^/]+)\/(?:AW-)?(\d+)\/?$/),
            account = "AW-" + pathParts[2],
            data = params.get("data") || "",
            dataEvent = data.match(/event=([^;]+)(?:$|;)/),
            requestType = "";

        /* istanbul ignore else */
        if (account) {
            results.push({
                "key": "account",
                "field": "Account ID",
                "value": account,
                "group": "general"
            });

            // Add the conversion label, if available, to the accounts column
            if (params.get("label")) {
                account += "/" + params.get("label");
            }
            results.push({
                "key": "omnibug-account",
                "value": account,
                "hidden": true
            });
        }

        if (dataEvent && dataEvent.length) {
            if (dataEvent[1] === "gtag.config") {
                requestType = "Page View";
            } else {
                requestType = dataEvent[1];
            }
        } else {
            requestType = (pathParts[1] === "viewthroughconversion") ? "Conversion" : pathParts[1].replace("viewthrough", "");
        }

        results.push({
            "key": "requestType",
            "value": requestType,
            "field": "Request Type",
            "group": "general"
        });

        return results;
    }
}
/**
 * Google DoubleClick
 * https://marketingplatform.google.com/about/enterprise/
 *
 * @class
 * @extends BaseProvider
 */
class GoogleDoubleClickProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "DOUBLECLICK";
        this._pattern    = /(?:fls|ad)\.doubleclick\.net\/activityi(?!.*dc_pre);/;
        this._name       = "Google DoubleClick";
        this._type       = "marketing";
        this._keywords   = ["dc", "dcm"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "omnibug-account",
            "requestType":  "type"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            },
            {
                "key": "custom",
                "name": "Custom Fields"
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "src": {
                "name": "Account ID",
                "group": "general"
            },
            "type": {
                "name": "Activity Group",
                "group": "general"
            },
            "cat": {
                "name": "Activity Tag",
                "group": "general"
            },
            "cost": {
                "name": "Value",
                "group": "general"
            },
            "qty": {
                "name": "Quantity",
                "group": "general"
            },
            "num": {
                "name": "Request Cache Buster",
                "group": "other"
            },
            "dc_lat": {
                "name": "Limit Ad Tracking",
                "group": "other"
            },
            "tag_for_child_directed_treatment": {
                "name": "COPPA Request",
                "group": "other"
            },
            "tfua": {
                "name": "User Underage",
                "group": "other"
            },
            "npa": {
                "name": "Opt-out of Remarketing",
                "group": "other"
            },
            "ord": {
                "hidden": true
            }
        };
    }

    /**
     * Parse a given URL into human-readable output
     *
     * @param {string}  rawUrl      A URL to check against
     * @param {string}  postData    POST data, if applicable
     *
     * @return {{provider: {name: string, key: string, type: string}, data: Array}}
     */
    parseUrl(rawUrl, postData = "")
    {
        let url = new URL(rawUrl),
            data = [],
            params = new URLSearchParams(url.search);

        // Force Google's path into query strings
        url.pathname.replace("/activityi;", "").split(";").forEach(param => {
            let pair = param.split("=");
            params.append(pair[0], pair[1]);
        });
        for(let param of params)
        {
            let key = param[0],
                value = param[1],
                result = this.handleQueryParam(key, value);
            if(typeof result === "object") {
                data.push(result);
            }
        }

        let customData = this.handleCustom(url, params);
        /* istanbul ignore else */
        if(typeof customData === "object" && customData !== null)
        {
            data = data.concat(customData);
        }

        return {
            "provider": {
                "name":    this.name,
                "key":     this.key,
                "type":    this.type,
                "columns": this.columnMapping,
                "groups":  this.groups
            },
            "data": data
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value)
    {
        let result = {};
        if(/^u(\d+)$/i.test(name)) {
            result = {
                "key": name,
                "field": "Custom Field " + RegExp.$1,
                "value": value,
                "group": "custom"
            };
        } else if(name === "~oref") {
            result = {
                "key": name,
                "field": "Page URL",
                "value": decodeURIComponent(value),
                "group": "general"
            };
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {Array}
     */
    handleCustom(url, params)
    {
        let results = [],
            account = "DC-" + params.get("src"),
            ord = params.get("ord"),
            countingMethod = "per_session";

        if(ord) {
            if(params.get("qty")) {
                results.push({
                    "key":   "ord",
                    "field": "Transaction ID",
                    "value": ord,
                    "group": "general"
                });
                countingMethod = "transactions / items_sold";
            } else {
                results.push({
                    "key":   "ord",
                    "field": "Counting Method Type",
                    "value": ord,
                    "group": "other"
                });
                countingMethod = (ord === "1") ? "unique" : "standard";
            }
        }

        results.push({
            "key":   "countingMethod",
            "field": "Counting Method",
            "value": countingMethod,
            "group": "general"
        });

        // Add the type & category, if available, to the accounts column
        /* istanbul ignore else */
        if(params.get("type") && params.get("cat")) {
            account += "/" + params.get("type") + "/" + params.get("cat");
        }
        results.push({
            "key":   "omnibug-account",
            "value": account,
            "hidden": true
        });

        return results;
    }
}
/**
 * Google Tag Manager
 * https://tagmanager.google.com/
 *
 * @class
 * @extends BaseProvider
 */
class GoogleTagManagerProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "GOOGLETAGMAN";
        this._pattern    = /googletagmanager\.com\/gtm\.js/;
        this._name       = "Google Tag Manager";
        this._type       = "tagmanager";
        this._keywords   = ["tms"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "id"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "id": {
                "name": "Account ID",
                "group": "general"
            },
            "l": {
                "name": "Data Layer Variable",
                "group": "general"
            }
        };
    }
}
/**
 * Matomo (Formerly Piwik)
 * http://matomo.org
 *
 * @class
 * @extends BaseProvider
 */
class MatomoProvider extends BaseProvider {
    constructor() {
        super();
        this._key = "MATOMO";
        this._pattern = /\/(piwik|matomo)\.php\?/;
        this._name = "Matomo";
        this._type = "analytics";
        this._keywords = ["piwik"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping() {
        return {
            "account": "trackingServer",
            "requestType": "requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups() {
        return [
            {
                "key": "general",
                "name": "General"
            },
            {
                "key": "dimensions",
                "name": "Dimensions"
            },
            {
                "key": "custom",
                "name": "Custom Variables"
            },
            {
                "key": "ecommerce",
                "name": "E-commerce"
            },
            {
                "key": "events",
                "name": "Events"
            },
            {
                "key": "content",
                "name": "Content"
            },
            {
                "key": "media",
                "name": "Media"
            }
        ];
    }

    /**+
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys() {
        return {
            "idsite": {
                "name": "Website ID",
                "group": "general"
            },
            "rec": {
                "name": "Required for Tracking",
                "group": "other"
            },
            "action_name": {
                "name": "Action Name",
                "group": "general"
            },
            "url": {
                "name": "Page URL",
                "group": "general"
            },
            "_id": {
                "name": "Visitor ID",
                "group": "general"
            },
            "rand": {
                "name": "Cache Buster",
                "group": "other"
            },
            "apiv": {
                "name": "API Version",
                "group": "other"
            },
            "urlref": {
                "name": "Page Referrer",
                "group": "general"
            },
            "_idvc": {
                "name": "Visit Number",
                "group": "general"
            },
            "_viewts": {
                "name": "Previous Visit Timestamp",
                "group": "other"
            },
            "_idts": {
                "name": "First Visit Timestamp",
                "group": "other"
            },
            "_rcn": {
                "name": "Campaign Name",
                "group": "general"
            },
            "_rck": {
                "name": "Campaign Keyword",
                "group": "general"
            },
            "res": {
                "name": "Screen Resolution",
                "group": "other"
            },
            "h": {
                "name": "Browser Time (Hour)",
                "group": "other"
            },
            "m": {
                "name": "Browser Time (Minute)",
                "group": "other"
            },
            "s": {
                "name": "Browser Time (Sectond)",
                "group": "other"
            },
            "fla": {
                "name": "Has Plugin: Flash",
                "group": "other"
            },
            "java": {
                "name": "Has Plugin: Java",
                "group": "other"
            },
            "dir": {
                "name": "Has Plugin: Director",
                "group": "other"
            },
            "qt": {
                "name": "Has Plugin: Quicktime",
                "group": "other"
            },
            "realp": {
                "name": "Has Plugin: Real Player",
                "group": "other"
            },
            "pdf": {
                "name": "Has Plugin: PDF",
                "group": "other"
            },
            "wma": {
                "name": "Has Plugin: Windows Media Player",
                "group": "other"
            },
            "gears": {
                "name": "Has Plugin: Gears",
                "group": "other"
            },
            "ag": {
                "name": "Has Plugin: Silverlight",
                "group": "other"
            },
            "cookie": {
                "name": "Browser Supports Cookies",
                "group": "other"
            },
            "ua": {
                "name": "User Agent",
                "group": "general"
            },
            "lang": {
                "name": "Browser Language",
                "group": "general"
            },
            "uid": {
                "name": "User ID",
                "group": "general"
            },
            "cid": {
                "name": "Visitor ID",
                "group": "general"
            },
            "new_visit": {
                "name": "Force New Visit",
                "group": "general"
            },
            "exit": {
                "name": "Exit Link",
                "group": "general"
            },
            "link": {
                "name": "Exit Link",
                "group": "general"
            },
            "download": {
                "name": "Download Link",
                "group": "general"
            },
            "search": {
                "name": "Site Search Keyword",
                "group": "general"
            },
            "search_cat": {
                "name": "Site Search Category",
                "group": "general"
            },
            "search_count": {
                "name": "Site Search Results Count",
                "group": "general"
            },
            "pv_id": {
                "name": "Page View ID",
                "group": "general"
            },
            "idgoal": {
                "name": "Goal ID",
                "group": "general"
            },
            "revenue": {
                "name": "Revenue",
                "hidden": true
            },
            "gt_ms": {
                "name": "Action Generation Time (ms)",
                "group": "other"
            },
            "e_c": {
                "name": "Event Category",
                "group": "events"
            },
            "e_a": {
                "name": "Event Action",
                "group": "events"
            },
            "e_n": {
                "name": "Event Name",
                "group": "events"
            },
            "e_v": {
                "name": "Event Value",
                "group": "events"
            },
            "c_n": {
                "name": "Content Name",
                "group": "content"
            },
            "c_p": {
                "name": "Content Piece",
                "group": "content"
            },
            "c_t": {
                "name": "Content Target",
                "group": "content"
            },
            "c_i": {
                "name": "Content Interaction",
                "group": "content"
            },
            "ec_id": {
                "name": "Order ID",
                "group": "ecommerce"
            },
            "ec_st": {
                "name": "Sub-total",
                "group": "ecommerce"
            },
            "ec_tx": {
                "name": "Tax",
                "group": "ecommerce"
            },
            "ec_sh": {
                "name": "Shipping",
                "group": "ecommerce"
            },
            "ec_dt": {
                "name": "Discount",
                "group": "ecommerce"
            },
            "_ects": {
                "name": "Previous Order Timestamp",
                "group": "ecommerce"
            },
            "token_auth": {
                "name": "API Token",
                "group": "other"
            },
            "cip": {
                "name": "Visitor IP",
                "group": "other"
            },
            "cdt": {
                "name": "Request Timestamp",
                "group": "other"
            },
            "country": {
                "name": "Country",
                "group": "general"
            },
            "region": {
                "name": "Region",
                "group": "general"
            },
            "city": {
                "name": "City",
                "group": "general"
            },
            "lat": {
                "name": "Latitude",
                "group": "general"
            },
            "long": {
                "name": "Longitude",
                "group": "general"
            },
            "queuedtracking": {
                "name": "Queue Tracking",
                "group": "other",
            },
            "ping": {
                "name": "Ping",
                "group": "other"
            },
            "ma_id": {
                "name": "Media ID",
                "group": "media"
            },
            "ma_ti": {
                "name": "Media Title",
                "group": "media"
            },
            "ma_re": {
                "name": "Media Resource",
                "group": "media"
            },
            "ma_mt": {
                "name": "Media Type",
                "group": "media"
            },
            "ma_pn": {
                "name": "Media Player Name",
                "group": "media"
            },
            "ma_st": {
                "name": "Media Duration (sec)",
                "group": "media"
            },
            "ma_ps": {
                "name": "Current Position",
                "group": "media"
            },
            "ma_ttp": {
                "name": "Time Until Media Played",
                "group": "media"
            },
            "ma_w": {
                "name": "Media Width",
                "group": "media"
            },
            "ma_h": {
                "name": "Media Height",
                "group": "media"
            },
            "ma_fs": {
                "name": "Fullscreen Media",
                "group": "media"
            },
            "ma_se": {
                "name": "Media Positions Played",
                "group": "media"
            }
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value) {
        let result = {};
        if (name === "_cvar") {
            result = {
                "key": "_cvar",
                "hidden": true
            };
        } else if (name === "ec_items") {
            result = {
                "key": "ec_items",
                "hidden": true
            };
        } else if (/^dimension(\d+)$/.test(name)) {
            result = {
                "key": name,
                "field": `Dimension ${RegExp.$1}`,
                "value": value,
                "group": "dimensions"
            };
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params) {
        let results = [],
            revenue = params.get("revenue"),
            _cvar = params.get("_cvar"),
            ec_items = params.get("ec_items"),
            requestType = "Page View";

        // Change the revenue group/name based on if an ecom order was placed
        if (revenue) {
            if (params.get("ec_id")) {
                results.push({
                    "key": "revenue",
                    "field": "Order Revenue",
                    "value": params.get("revenue"),
                    "group": "ecommerce"
                });
            } else if (params.get("ec_items")) {
                results.push({
                    "key": "revenue",
                    "field": "Cart Revenue",
                    "value": params.get("revenue"),
                    "group": "ecommerce"
                });
            } else {
                results.push({
                    "key": "revenue",
                    "field": "Goal Revenue",
                    "value": params.get("revenue"),
                    "group": "general"
                });
            }

        }

        // Custom Variables
        if (_cvar) {
            try {
                let customVars = JSON.parse(_cvar);
                /* istanbul ignore else: do nothing when it's null/empty */
                if (typeof customVars === "object" && customVars) {
                    Object.entries(customVars).forEach(([key, [name, value]]) => {
                        results.push({
                            "key": `_cvar${key}n`,
                            "field": `Custom Variable ${key} Name`,
                            "value": name,
                            "group": "custom"
                        }, {
                            "key": `_cvar${key}v`,
                            "field": `Custom Variable ${key} Value`,
                            "value": value,
                            "group": "custom"
                        });
                    });
                }
            } catch (e) {
                /* istanbul ignore next: push the full value to the key */
                results.push({
                    "key": "_cvar",
                    "field": "Custom Variables",
                    "value": _cvar,
                    "group": "custom"
                });
            }
        }

        // Ecommerce products
        if (ec_items) {
            try {
                let products = JSON.parse(ec_items);
                /* istanbul ignore else: do nothing when it's null/empty */
                if (typeof products === "object" && products.length) {
                    products.forEach(([sku, name, category, price, qty], i) => {
                        let j = i + 1;
                        results.push({
                            "key": `ec_item${j}s`,
                            "field": `Product ${j} SKU`,
                            "value": sku,
                            "group": "ecommerce"
                        }, {
                            "key": `ec_item${j}n`,
                            "field": `Product ${j} Name`,
                            "value": name,
                            "group": "ecommerce"
                        }, {
                            "key": `ec_item${j}c`,
                            "field": `Product ${j} Category`,
                            "value": (typeof category === "object" && category.length) ? category.join(", ") : category,
                            "group": "ecommerce"
                        }, {
                            "key": `ec_item${j}p`,
                            "field": `Product ${j} Price`,
                            "value": price.toString(),
                            "group": "ecommerce"
                        }, {
                            "key": `ec_item${j}q`,
                            "field": `Product ${j} Quantity`,
                            "value": qty.toString(),
                            "group": "ecommerce"
                        });
                    });
                }
            } catch (e) {
                /* istanbul ignore next: push the full value to the key */
                results.push({
                    "key": "ec_items",
                    "field": "Products",
                    "value": ec_items,
                    "group": "ecommerce"
                });
            }
        }

        // Figure out the request type
        if (params.get("search")) {
            requestType = "Site Search";
        } else if (params.get("idgoal") === "0") {
            requestType = "Ecommerce";
        } else if (params.get("idgoal")) {
            requestType = "Goal";
        } else if (params.get("exit") || params.get("link")) {
            requestType = "Exit Click";
        } else if (params.get("download")) {
            requestType = "Download Click";
        } else if (params.get("c_i")) {
            requestType = "Content Interaction";
        } else if (params.get("e_c")) {
            requestType = "Custom Event";
        } else if (params.get("ping")) {
            requestType = "Ping";
        }

        results.push({
            "key": "requestType",
            "value": requestType,
            "hidden": "true"
        });

        // Where the request was sent
        results.push({
            "key": "trackingServer",
            "field": "Tracking Server",
            "value": url.hostname,
            "group": "general"
        });

        return results;
    }
}
/**
 * Mparticle
 * https://docs.mparticle.com/developers/sdk/javascript/getting-started
 *
 * @class
 * @extends BaseProvider
 */

class MparticleProvider extends BaseProvider {
    constructor() {
        super();
        this._key       = "MPARTICLE";
        this._pattern   = /\.mparticle\.com\/v\d\/JS\/\w{32}\/Events$/;
        this._name      = "Mparticle";
        this._type      = "marketing";
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "clientCode",
            "requestType":  "requestTypeParsed"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            },
            {
                "key": "customattributes",
                "name": "Custom Attributes"
            },
            {
                "key": "userattributes",
                "name": "User Attributes"
            },
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "av" : {
                "name": "Application Version (av)",
                "group": "general"
            },
            "at" : {
                "name": "Application State (at)",
                "group": "general"
            },
            "attrs" : {
                "name": "Attributes (attrs)",
                "group": "general"
            },
            "cgid" : {
                "name": "Client Generated ID (cgid)",
                "group": "general"
            },
            "ct" : {
                "name": "Unix Time (ct)",
                "group": "general"
            },
            "das" : {
                "name": "Device Application Stamp (das)",
                "group": "general"
            },
            "dbg" : {
                "name": "Debug (dbg)",
                "group": "general"
            },
            "dt" : {
                "name": "Data Type (dt)",
                "group": "general"
            },
            "eec" : {
                "name": "Expanded Event Count (eec)",
                "group": "general"
            },
            "et" : {
                "name": "Event Type (et)",
                "group": "general"
            },
            "flags" : {
                "name": "flags",
                "group": "general"
            },
            "fr" : {
                "name": "First Run (fr)",
                "group": "general"
            },
            "iu" : {
                "name": "Is Upgrade (iu)",
                "group": "general"
            },
            "lc" : {
                "name": "Location (lc)",
                "group": "general"
            },
            "lr" : {
                "name": "Launch Referral (lr)",
                "group": "general"
            },
            "mpid" : {
                "name": "Mparticle ID",
                "group": "general"
            },
            "n" : {
                "name": "Event Name (n)",
                "group": "general"
            },
            "o" : {
                "name": "Opt-Out (o)",
                "group": "general"
            },
            "pb" : {
                "name": "User Product-Bags (pb)",
                "group": "general"
            },
            "sdk" : {
                "name" : "SDK Version (sdk)",
                "group": "general"
            },
            "sid" : {
                "name": "Session UID (sid)",
                "group": "general"
            },
            "str" : {
                "name": "Event Store (str)",
                "group": "general"
            },
            "str.uid.Expires" : {
                "name": "uid expires",
                "group": "general"
            },
            "str.uid.Value" : {
                "name": "uid",
                "group": "general"
            },
            "ua" : {
                "name": "User Attributes (ua)",
                "group": "general"
            },
            "ui" : {
                "name": "User Identities (ui)",
                "group": "general"
            },
            "uic" : {
                "name": "User Identity Change (uic)",
                "group": "general"
            },
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value)
    {
        let result = {};
        if(name.indexOf("attrs.") === 0) {
            result = {
                "key":   name,
                "field": name.replace("attrs.", ""),
                "value": value,
                "group": "customattributes"
            };
        } else if (name.indexOf("ua.") === 0) {
            result = {
                "key":   name,
                "field": name.slice(3,name.length),
                "value": value,
                "group": "userattributes"
            };   
        } else if (name.indexOf("ui[") === 0) {
            // hide  
            result = {
                "key": name,
                "value": value,
                "hidden": true
            };
        }
        else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params)
    {
        let results = [];

        // Client Code
        const clientCodeRe = /v\d\/JS\/(.+)\/Events$/;
        let clientCodematches =  url.pathname.match(clientCodeRe);
        if(clientCodematches !== null) {
            results.push({
                "key":   "clientCode",
                "field": "Client Code",
                "value": clientCodematches[1],
                "group": "general"
            });
        }

        // Event Type Value parsed (et)
        let etType = params.get("et");
        if (etType) {
            const etDict = {
                "0": "Unknown",
                "1": "Navigation",
                "2": "Location",
                "3": "Search",
                "4": "Transaction",
                "5": "UserContent",
                "6": "UserPreference",
                "7": "Social",
                "8": "Other",
                "9": "Media",
                "10": "ProductAddToCart",
                "11": "ProductRemoveFromCart",
                "12": "ProductCheckout",
                "13": "ProductCheckoutOption",
                "14": "ProductClick",
                "15": "ProductViewDetail",
                "16": "ProductPurchase",
                "17": "ProductRefund",
                "18": "PromotionView",
                "19": "PromotionClick",
                "20": "ProductAddToWishlist",
                "21": "ProductRemoveFromWishlist",
                "22": "ProductImpression",
                "23": "Attribution",
            };
            let etValue = etDict[etType] ? etDict[etType] : etType;
            results.push({
                "key":   "etParsed",
                "field": "Event Type Value",
                "value": etValue,
                "group": "general"
            });    
        }
        
        // Data type value parsed
        let dataType = params.get("dt");
        if (dataType) {
            const dataTypeDict = {
                "1": "Session Start",
                "2": "Session End",
                "3": "Screen View",
                "4": "Custom Event",
                "5": "Crash Report",
                "6": "Opt Out",
                "10": "App State Transition",
                "14": "Profile Change Message",
                "16": "Commerce Event",
            };
            let dataTypeValue = dataTypeDict[dataType] ? dataTypeDict[dataType] : dataType;
            results.push({
                "key":   "dtvalue",
                "field": "Data Type Value",
                "value": dataTypeValue,
                "group": "general"
            });    
        }
        
        // Event Name (n) value parsed to requesttype
        let eventType = params.get("n");
        const eventDict = {
            "pageView" : "Page View",
            "1" : "Session Start",
            "2" : "Session End",
            "10": "State Transition"
        };
        let eventTypeValue = eventDict[eventType] ? eventDict[eventType] : eventType;
        results.push({
            "key":   "requestTypeParsed",
            "field": "Request Type",
            "value": eventTypeValue,
            "group": "general"
        });

        // uid
        const identityTypeDict = {
            "0": "other",
            "1": "customerid",
            "2": "facebook",
            "3": "twitter",
            "4": "google",
            "5": "microsoft",
            "6": "yahoo",
            "7": "email",
            "8": "facebookcustomaudienceid",
            "9": "other2",
            "10": "other3",
            "11": "other4"
        };

        let uiArray = [];
        for (let p of params.entries()) {
            let k = p[0],
                v = p[1];
            if (k.indexOf("ui[") === 0) {
                uiArray.push(k);
                uiArray.push(v);
            }
        }
        
        let output = [];
        uiArray.map( (e, idx) => {
            if (idx === 0 || idx % 4 === 0) {
                output.push([e, uiArray[idx+1], uiArray[idx+2], uiArray[idx+3]]);
            }
        });

        output.forEach(e => {
            let idValue = e.toString().split(",")[1];
            let typeValue = e.toString().split(",")[3];
            results.push({
                "key":   identityTypeDict[typeValue] ? identityTypeDict[typeValue] : typeValue,
                "field": `Identity: ${identityTypeDict[typeValue]} (${typeValue})`,
                "value": idValue,
                "group": "userattributes"
            });
        });

        return results;
    }
} // class
/**
 * Optimizely
 * https://www.optimizely.com/
 *
 * @class
 * @extends BaseProvider
 */
class OptimizelyXProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "OPTIMIZELYX";
        this._pattern    = /\.optimizely\.com\/log\/event/;
        this._name       = "Optimizely X";
        this._type       = "testing";
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "mbox"
        };
    }


    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {

        };
    }
}
/**
 * Piwik PRO
 * https://piwik.pro
 *
 * @class
 * @extends BaseProvider
 */
class PiwikPROProvider extends BaseProvider {
    constructor() {
        super();
        this._key = "PIWIKPRO";
        this._pattern = /\/ppms\.php\?/;
        this._name = "Piwik PRO";
        this._type = "analytics";
        this._keywords = ["piwikpro", "matomo"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping() {
        return {
            "account": "trackingServer",
            "requestType": "requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups() {
        return [
            {
                "key": "general",
                "name": "General"
            },
            {
                "key": "dimensions",
                "name": "Dimensions"
            },
            {
                "key": "custom",
                "name": "Custom Variables"
            },
            {
                "key": "ecommerce",
                "name": "E-commerce"
            },
            {
                "key": "events",
                "name": "Events"
            },
            {
                "key": "content",
                "name": "Content"
            },
            {
                "key": "media",
                "name": "Media"
            },
            {
                "key": "rum",
                "name": "Real User Monitoring"
            }
        ];
    }

    /**+
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys() {
        return {
            "idsite": {
                "name": "Website ID",
                "group": "general"
            },
            "rec": {
                "name": "Required for Tracking",
                "group": "other"
            },
            "action_name": {
                "name": "Action Name",
                "group": "general"
            },
            "url": {
                "name": "Page URL",
                "group": "general"
            },
            "_id": {
                "name": "Visitor ID",
                "group": "general"
            },
            "r": {
                "name": "Cache Buster",
                "group": "other"
            },
            "apiv": {
                "name": "API Version",
                "group": "other"
            },
            "urlref": {
                "name": "Page Referrer",
                "group": "general"
            },
            "_idvc": {
                "name": "Visit Number",
                "group": "general"
            },
            "_viewts": {
                "name": "Previous Visit Timestamp",
                "group": "other"
            },
            "_idts": {
                "name": "First Visit Timestamp",
                "group": "other"
            },
            "_idn": {
                "name": "New Visitor",
                "group": "generalx"
            },
            "_rcn": {
                "name": "Campaign Name",
                "group": "general"
            },
            "_rck": {
                "name": "Campaign Keyword",
                "group": "general"
            },
            "res": {
                "name": "Screen Resolution",
                "group": "other"
            },
            "h": {
                "name": "Browser Time (Hour)",
                "group": "other"
            },
            "m": {
                "name": "Browser Time (Minute)",
                "group": "other"
            },
            "s": {
                "name": "Browser Time (Sectond)",
                "group": "other"
            },
            "fla": {
                "name": "Has Plugin: Flash",
                "group": "other"
            },
            "java": {
                "name": "Has Plugin: Java",
                "group": "other"
            },
            "dir": {
                "name": "Has Plugin: Director",
                "group": "other"
            },
            "qt": {
                "name": "Has Plugin: Quicktime",
                "group": "other"
            },
            "realp": {
                "name": "Has Plugin: Real Player",
                "group": "other"
            },
            "pdf": {
                "name": "Has Plugin: PDF",
                "group": "other"
            },
            "wma": {
                "name": "Has Plugin: Windows Media Player",
                "group": "other"
            },
            "gears": {
                "name": "Has Plugin: Gears",
                "group": "other"
            },
            "ag": {
                "name": "Has Plugin: Silverlight",
                "group": "other"
            },
            "cookie": {
                "name": "Browser Supports Cookies",
                "group": "other"
            },
            "ua": {
                "name": "User Agent",
                "group": "general"
            },
            "lang": {
                "name": "Browser Language",
                "group": "general"
            },
            "uid": {
                "name": "User ID",
                "group": "general"
            },
            "cid": {
                "name": "Visitor ID",
                "group": "general"
            },
            "new_visit": {
                "name": "Force New Visit",
                "group": "general"
            },
            "exit": {
                "name": "Exit Link",
                "group": "general"
            },
            "link": {
                "name": "Exit Link",
                "group": "general"
            },
            "download": {
                "name": "Download Link",
                "group": "general"
            },
            "search": {
                "name": "Site Search Keyword",
                "group": "general"
            },
            "search_cat": {
                "name": "Site Search Category",
                "group": "general"
            },
            "search_count": {
                "name": "Site Search Results Count",
                "group": "general"
            },
            "pv_id": {
                "name": "Page View ID",
                "group": "general"
            },
            "idgoal": {
                "name": "Goal ID",
                "group": "general"
            },
            "revenue": {
                "name": "Revenue",
                "hidden": true
            },
            "gt_ms": {
                "name": "Action Generation Time (ms)",
                "group": "other"
            },
            "e_c": {
                "name": "Event Category",
                "group": "events"
            },
            "e_a": {
                "name": "Event Action",
                "group": "events"
            },
            "e_n": {
                "name": "Event Name",
                "group": "events"
            },
            "e_v": {
                "name": "Event Value",
                "group": "events"
            },
            "c_n": {
                "name": "Content Name",
                "group": "content"
            },
            "c_p": {
                "name": "Content Piece",
                "group": "content"
            },
            "c_t": {
                "name": "Content Target",
                "group": "content"
            },
            "c_i": {
                "name": "Content Interaction",
                "group": "content"
            },
            "ec_id": {
                "name": "Order ID",
                "group": "ecommerce"
            },
            "ec_st": {
                "name": "Sub-total",
                "group": "ecommerce"
            },
            "ec_tx": {
                "name": "Tax",
                "group": "ecommerce"
            },
            "ec_sh": {
                "name": "Shipping",
                "group": "ecommerce"
            },
            "ec_dt": {
                "name": "Discount",
                "group": "ecommerce"
            },
            "_ects": {
                "name": "Previous Order Timestamp",
                "group": "ecommerce"
            },
            "token_auth": {
                "name": "API Token",
                "group": "other"
            },
            "cip": {
                "name": "Visitor IP",
                "group": "other"
            },
            "cdt": {
                "name": "Request Timestamp",
                "group": "other"
            },
            "country": {
                "name": "Country",
                "group": "general"
            },
            "region": {
                "name": "Region",
                "group": "general"
            },
            "city": {
                "name": "City",
                "group": "general"
            },
            "lat": {
                "name": "Latitude",
                "group": "general"
            },
            "long": {
                "name": "Longitude",
                "group": "general"
            },
            "queuedtracking": {
                "name": "Queue Tracking",
                "group": "other",
            },
            "ping": {
                "name": "Ping",
                "group": "other"
            },
            "ma_id": {
                "name": "Media ID",
                "group": "media"
            },
            "ma_ti": {
                "name": "Media Title",
                "group": "media"
            },
            "ma_re": {
                "name": "Media Resource",
                "group": "media"
            },
            "ma_mt": {
                "name": "Media Type",
                "group": "media"
            },
            "ma_pn": {
                "name": "Media Player Name",
                "group": "media"
            },
            "ma_st": {
                "name": "Media Duration (sec)",
                "group": "media"
            },
            "ma_ps": {
                "name": "Current Position",
                "group": "media"
            },
            "ma_ttp": {
                "name": "Time Until Media Played",
                "group": "media"
            },
            "ma_w": {
                "name": "Media Width",
                "group": "media"
            },
            "ma_h": {
                "name": "Media Height",
                "group": "media"
            },
            "ma_fs": {
                "name": "Fullscreen Media",
                "group": "media"
            },
            "ma_se": {
                "name": "Media Positions Played",
                "group": "media"
            },
            "t_us": {
                "name": "Unload Event Start",
                "group": "rum"
            },
            "t_ue": {
                "name": "Unload Event End",
                "group": "rum"
            },
            "t_rs": {
                "name": "Redirect Start",
                "group": "rum"
            },
            "t_re": {
                "name": "Redirect End",
                "group": "rum"
            },
            "t_fs": {
                "name": "Fetch Start",
                "group": "rum"
            },
            "t_ss": {
                "name": "Secure Connection Start",
                "group": "rum"
            },
            "t_ds": {
                "name": "Domain Lookup Start",
                "group": "rum"
            },
            "t_cs": {
                "name": "Connect Start",
                "group": "rum"
            },
            "t_ce": {
                "name": "Connect End",
                "group": "rum"
            },
            "t_qs": {
                "name": "Request Start Start",
                "group": "rum"
            },
            "t_as": {
                "name": "Response Start",
                "group": "rum"
            },
            "t_ae": {
                "name": "Response End",
                "group": "rum"
            },
            "t_dl": {
                "name": "DOM Loading",
                "group": "rum"
            },
            "t_di": {
                "name": "DOM Interactive",
                "group": "rum"
            },
            "t_ls": {
                "name": "DOM Content Loaded Event Start",
                "group": "rum"
            },
            "t_le": {
                "name": "DOM Content Loaded Event End",
                "group": "rum"
            },
            "t_dc": {
                "name": "DOM Complete",
                "group": "rum"
            },
            "t_ee": {
                "name": "Load Event End",
                "group": "rum"
            }
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value) {
        let result = {};
        if (name === "_cvar") {
            result = {
                "key": "_cvar",
                "hidden": true
            };
        } else if (name === "cvar") {
            result = {
                "key": "cvar",
                "hidden": true
            };
        } else if (name === "ec_items") {
            result = {
                "key": "ec_items",
                "hidden": true
            };
        } else if (/^dimension(\d+)$/.test(name)) {
            result = {
                "key": name,
                "field": `Dimension ${RegExp.$1}`,
                "value": value,
                "group": "dimensions"
            };
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params) {
        let results = [],
            revenue = params.get("revenue"),
            _cvar = params.get("_cvar"),
            cvar = params.get("cvar"),
            ec_items = params.get("ec_items"),
            requestType = "Page View";

        // Change the revenue group/name based on if an ecom order was placed
        if (revenue) {
            if (params.get("ec_id")) {
                results.push({
                    "key": "revenue",
                    "field": "Order Revenue",
                    "value": params.get("revenue"),
                    "group": "ecommerce"
                });
            } else if (params.get("ec_items")) {
                results.push({
                    "key": "revenue",
                    "field": "Cart Revenue",
                    "value": params.get("revenue"),
                    "group": "ecommerce"
                });
            } else {
                results.push({
                    "key": "revenue",
                    "field": "Goal Revenue",
                    "value": params.get("revenue"),
                    "group": "general"
                });
            }

        }

        // Custom Variables
        if (_cvar) {
            try {
                let customVars = JSON.parse(_cvar);
                /* istanbul ignore else: do nothing when it's null/empty */
                if (typeof customVars === "object" && customVars) {
                    Object.entries(customVars).forEach(([key, [name, value]]) => {
                        results.push({
                            "key": `_cvar${key}n`,
                            "field": `Custom Visit Variable ${key} Name`,
                            "value": name,
                            "group": "custom"
                        }, {
                            "key": `_cvar${key}v`,
                            "field": `Custom Visit Variable ${key} Value`,
                            "value": value,
                            "group": "custom"
                        });
                    });
                }
            } catch (e) {
                /* istanbul ignore next: push the full value to the key */
                results.push({
                    "key": "_cvar",
                    "field": "Custom Visit Variables",
                    "value": _cvar,
                    "group": "custom"
                });
            }
        }

        if (cvar) {
            try {
                let customVars = JSON.parse(cvar);
                /* istanbul ignore else: do nothing when it's null/empty */
                if (typeof customVars === "object" && customVars) {
                    Object.entries(customVars).forEach(([key, [name, value]]) => {
                        results.push({
                            "key": `cvar${key}n`,
                            "field": `Custom Action Variable ${key} Name`,
                            "value": name,
                            "group": "custom"
                        }, {
                            "key": `cvar${key}v`,
                            "field": `Custom Action Variable ${key} Value`,
                            "value": value,
                            "group": "custom"
                        });
                    });
                }
            } catch (e) {
                /* istanbul ignore next: push the full value to the key */
                results.push({
                    "key": "cvar",
                    "field": "Custom Action Variables",
                    "value": cvar,
                    "group": "custom"
                });
            }
        }

        // Ecommerce products
        if (ec_items) {
            try {
                let products = JSON.parse(ec_items);
                /* istanbul ignore else: do nothing when it's null/empty */
                if (typeof products === "object" && products.length) {
                    products.forEach(([sku, name, category, price, qty], i) => {
                        let j = i + 1;
                        results.push({
                            "key": `ec_item${j}s`,
                            "field": `Product ${j} SKU`,
                            "value": sku,
                            "group": "ecommerce"
                        }, {
                            "key": `ec_item${j}n`,
                            "field": `Product ${j} Name`,
                            "value": name,
                            "group": "ecommerce"
                        }, {
                            "key": `ec_item${j}c`,
                            "field": `Product ${j} Category`,
                            "value": (typeof category === "object" && category.length) ? category.join(", ") : category,
                            "group": "ecommerce"
                        }, {
                            "key": `ec_item${j}p`,
                            "field": `Product ${j} Price`,
                            "value": price.toString(),
                            "group": "ecommerce"
                        }, {
                            "key": `ec_item${j}q`,
                            "field": `Product ${j} Quantity`,
                            "value": qty.toString(),
                            "group": "ecommerce"
                        });
                    });
                }
            } catch (e) {
                /* istanbul ignore next: push the full value to the key */
                results.push({
                    "key": "ec_items",
                    "field": "Products",
                    "value": ec_items,
                    "group": "ecommerce"
                });
            }
        }

        // Figure out the request type
        if (params.get("search")) {
            requestType = "Site Search";
        } else if (params.get("idgoal") === "0") {
            requestType = "Ecommerce";
        } else if (params.get("idgoal")) {
            requestType = "Goal";
        } else if (params.get("exit") || params.get("link")) {
            requestType = "Exit Click";
        } else if (params.get("download")) {
            requestType = "Download Click";
        } else if (params.get("c_i")) {
            requestType = "Content Interaction";
        } else if (params.get("e_c")) {
            requestType = "Custom Event";
        } else if (params.get("ping")) {
            requestType = "Ping";
        }

        results.push({
            "key": "requestType",
            "value": requestType,
            "hidden": "true"
        });

        // Where the request was sent
        results.push({
            "key": "trackingServer",
            "field": "Tracking Server",
            "value": url.hostname,
            "group": "general"
        });

        return results;
    }
}
/**
 * Piwik PRO
 * https://piwik.pro/tag-manager/
 *
 * @class
 * @extends BaseProvider
 */
class PiwikPROTagManagerProvider extends BaseProvider {
    constructor() {
        super();
        this._key = "PIWIKPROTMS";
        this._pattern = /\.piwik\.pro\/containers\/[a-z0-9-]+\.js/;
        this._name = "Piwik PRO Tag Manager";
        this._type = "tagmanager";
        this._keywords = ["piwik", "matomo", "tms"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping() {
        return {
            "account": "container_id",
            "requestType": "requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups() {
        return [
            {
                "key": "general",
                "name": "General"
            }
        ];
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params) {
        let matches = url.pathname.match(/^\/containers\/([a-z0-9-]+)\.js/),
            id = (matches && matches[1]) ? matches[1] : /* istanbul ignore next: should never happen, but it's a simple string default */ "";

        return [
            {
                "key": "requestType",
                "value": "Load",
                "hidden": true
            }, {
                "key": "container_id",
                "field": "Container ID",
                "value": id,
                "group": "general"
            }
        ];
    }
}
/**
 * Segment
 * https://segment.com/
 *
 * @class
 * @extends BaseProvider
 */
class SegmentProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "SEGMENT";
        this._pattern    = /api\.segment\.io\//;
        this._name       = "Segment";
        this._type       = "analytics";
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "requestType":  "omnibug_requestType"
        };
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {

        };
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {Array}
     */
    handleCustom(url, params)
    {
        let results = [],
            action = url.pathname.match(/\/v1\/([^/]+)$/);
        if(action) {
            let type = action[1].toLowerCase();
            if(type === "p" || type === "page") {
                type = "Page";
            } else if(type === "i" || type === "identify") {
                type = "Identify";
            } else if(type === "t" || type === "track") {
                type = "Track";
            } else if(type === "s" || type === "screen") {
                type = "Screen";
            } else if(type === "g" || type === "group") {
                type = "Group";
            } else if(type === "a" || type === "alias") {
                type = "Alias";
            } else if(type === "b" || type === "batch") {
                type = "Batch";
            }

            results.push({
                "key":   "omnibug_requestType",
                "value": type,
                "hidden": true
            });
        }
        return results;
    }
}
/**
 * Tealium IQ
 * https://tealium.com/products/tealium-iq-tag-management-system/
 *
 * @class
 * @extends BaseProvider
 */
class TealiumIQProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "TEALIUMIQ";
        this._pattern    = /tags\.tiqcdn\.com\/utag\/((?=.*utag\.js)|(?=.*utag\.sync\.js))/;
        this._name       = "Tealium IQ";
        this._type       = "tagmanager";
        this._keywords   = ["tms"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":      "omnibug_account",
            "requestType":  "requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            }
        ];
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {void|Array}
     */
    handleCustom(url, params)
    {
        let matches =  url.pathname.match(/^\/utag\/([^/]+)\/([^/]+)\/([^/]+)\/(utag(?:\.sync)?\.js)/),
            results = [];
        /* istanbul ignore else */
        if(matches !== null && matches.length === 5) {
            results.push({
                "key":   "omnibug_account",
                "value": `${matches[1]} / ${matches[2]}`,
                "hidden": true
            });
            results.push({
                "key":   "acccount",
                "field": "Account",
                "value": matches[1],
                "group": "general"
            });
            results.push({
                "key":   "profile",
                "field": "Profile",
                "value": matches[2],
                "group": "general"
            });
            results.push({
                "key":   "environment",
                "field": "Environment",
                "value": matches[3],
                "group": "general"
            });
            results.push({
                "key":   "requestType",
                "value": (matches[4] === "utag.js") ? "Async" : "Sync",
                "hidden": true
            });
        }

        return results;
    }
}
/**
 * Universal Analytics
 * https://developers.google.com/analytics/devguides/collection/analyticsjs/
 *
 * @class
 * @extends BaseProvider
 */
class UniversalAnalyticsProvider extends BaseProvider
{
    constructor()
    {
        super();
        this._key        = "UNIVERSALANALYTICS";
        this._pattern    = /\.google-analytics\.com\/([rg]\/)?collect(?:[/?]+|$)/;
        this._name       = "Universal Analytics";
        this._type       = "analytics";
        this._keywords   = ["google", "google analytics", "ua", "ga"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping()
    {
        return {
            "account":     "tid",
            "requestType": "omnibug_requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups()
    {
        return [
            {
                "key": "general",
                "name": "General"
            },
            {
                "key": "campaign",
                "name": "Campaign"
            },
            {
                "key": "events",
                "name": "Events"
            },
            {
                "key": "ecommerce",
                "name": "Ecommerce"
            },
            {
                "key": "timing",
                "name": "Timing"
            },
            {
                "key": "dimension",
                "name": "Custom Dimensions"
            },
            {
                "key": "metric",
                "name": "Custom Metrics"
            },
            {
                "key": "promo",
                "name": "Promotions"
            },
            {
                "key": "optimize",
                "name": "Google Optimize"
            },
            {
                "key": "contentgroup",
                "name": "Content Group"
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys()
    {
        return {
            "v": {
                "name": "Protocol Version",
                "group": "general"
            },
            "tid": {
                "name": "Tracking ID",
                "group": "general"
            },
            "aip": {
                "name": "Anonymize IP",
                "group": "general"
            },
            "qt": {
                "name": "Queue Time",
                "group": "general"
            },
            "z": {
                "name": "Cache Buster",
                "group": "general"
            },
            "cid": {
                "name": "Client ID",
                "group": "general"
            },
            "sc": {
                "name": "Session Control",
                "group": "general"
            },
            "dr": {
                "name": "Document Referrer",
                "group": "general"
            },
            "cn": {
                "name": "Campaign Name",
                "group": "campaign"
            },
            "cs": {
                "name": "Campaign Source",
                "group": "campaign"
            },
            "cm": {
                "name": "Campaign Medium",
                "group": "campaign"
            },
            "ck": {
                "name": "Campaign Keyword",
                "group": "campaign"
            },
            "cc": {
                "name": "Campaign Content",
                "group": "campaign"
            },
            "ci": {
                "name": "Campaign ID",
                "group": "campaign"
            },
            "gclid": {
                "name": "Google AdWords ID",
                "group": "campaign"
            },
            "dclid": {
                "name": "Google Display Ads ID",
                "group": "campaign"
            },
            "sr": {
                "name": "Screen Resolution",
                "group": "general"
            },
            "vp": {
                "name": "Viewport Size",
                "group": "general"
            },
            "de": {
                "name": "Document Encoding",
                "group": "general"
            },
            "sd": {
                "name": "Screen Colors",
                "group": "general"
            },
            "ul": {
                "name": "User Language",
                "group": "general"
            },
            "je": {
                "name": "Java Enabled",
                "group": "general"
            },
            "fl": {
                "name": "Flash Version",
                "group": "general"
            },
            "t": {
                "name": "Hit Type",
                "group": "general"
            },
            "en": {
                "name": "Hit Type",
                "group": "general"
            },
            "ni": {
                "name": "Non-Interaction Hit",
                "group": "events"
            },
            "dl": {
                "name": "Document location URL",
                "group": "general"
            },
            "dh": {
                "name": "Document Host Name",
                "group": "general"
            },
            "dp": {
                "name": "Document Path",
                "group": "general"
            },
            "dt": {
                "name": "Document Title",
                "group": "general"
            },
            "cd": {
                "name": "Content Description",
                "group": "general"
            },
            "an": {
                "name": "Application Name",
                "group": "general"
            },
            "av": {
                "name": "Application Version",
                "group": "general"
            },
            "ec": {
                "name": "Event Category",
                "group": "events"
            },
            "ea": {
                "name": "Event Action",
                "group": "events"
            },
            "el": {
                "name": "Event Label",
                "group": "events"
            },
            "ev": {
                "name": "Event Value",
                "group": "events"
            },
            "ti": {
                "name": "Transaction ID",
                "group": "ecommerce"
            },
            "ta": {
                "name": "Transaction Affiliation",
                "group": "ecommerce"
            },
            "tr": {
                "name": "Transaction Revenue",
                "group": "ecommerce"
            },
            "ts": {
                "name": "Transaction Shipping",
                "group": "ecommerce"
            },
            "tt": {
                "name": "Transaction Tax",
                "group": "ecommerce"
            },
            "in": {
                "name": "Item Name",
                "group": "ecommerce"
            },
            "ip": {
                "name": "Item Price",
                "group": "ecommerce"
            },
            "iq": {
                "name": "Item Quantity",
                "group": "ecommerce"
            },
            "ic": {
                "name": "Item Code",
                "group": "ecommerce"
            },
            "iv": {
                "name": "Item Category",
                "group": "ecommerce"
            },
            "cu": {
                "name": "Currency Code",
                "group": "ecommerce"
            },
            "sn": {
                "name": "Social Network",
                "group": "events"
            },
            "sa": {
                "name": "Social Action",
                "group": "events"
            },
            "st": {
                "name": "Social Action Target",
                "group": "events"
            },
            "utc": {
                "name": "User Timing Category",
                "group": "timing"
            },
            "utv": {
                "name": "User Timing Variable Name",
                "group": "timing"
            },
            "utt": {
                "name": "User Timing Time",
                "group": "timing"
            },
            "utl": {
                "name": "User timing Label",
                "group": "timing"
            },
            "plt": {
                "name": "Page load time",
                "group": "timing"
            },
            "dns": {
                "name": "DNS time",
                "group": "timing"
            },
            "pdt": {
                "name": "Page download time",
                "group": "timing"
            },
            "rrt": {
                "name": "Redirect response time",
                "group": "timing"
            },
            "tcp": {
                "name": "TCP connect time",
                "group": "timing"
            },
            "srt": {
                "name": "Server response time",
                "group": "timing"
            },
            "exd": {
                "name": "Exception description",
                "group": "events"
            },
            "exf": {
                "name": "Is exception fatal?",
                "group": "events"
            },
            "ds": {
                "name": "Data Source",
                "group": "general"
            },
            "uid": {
                "name": "User ID",
                "group": "general"
            },
            "linkid": {
                "name": "Link ID",
                "group": "general"
            },
            "pa": {
                "name": "Product Action",
                "group": "ecommerce"
            },
            "tcc": {
                "name": "Coupon Code",
                "group": "ecommerce"
            },
            "pal": {
                "name": "Product Action List",
                "group": "ecommerce"
            },
            "cos": {
                "name": "Checkout Step",
                "group": "ecommerce"
            },
            "col": {
                "name": "Checkout Step Option",
                "group": "ecommerce"
            },
            "promoa": {
                "name": "Promotion Action",
                "group": "ecommerce"
            },
            "xid": {
                "name": "Content Experiment ID",
                "group": "optimize"
            },
            "xvar": {
                "name": "Content Experiment Variant",
                "group": "optimize"
            },
            "_r": {
                "name": "Display Features Enabled",
                "group": "general"
            },
            "requestType": {
                "hidden": true
            }
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value)
    {
        let result = {};
        if(/^cd(\d+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": `Custom Dimension ${RegExp.$1}`,
                "value": value,
                "group": "dimension"
            };
        } else if(/^cm(\d+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": `Custom Metric ${RegExp.$1}`,
                "value": value,
                "group": "metric"
            };
        } else if(/^cg(\d+)$/i.test(name)) {
            result = {
                "key":   name,
                "field": `Content Group ${RegExp.$1}`,
                "value": value,
                "group": "contentgroup"
            };
        } else if(/^promo(\d+)([a-z]{2})$/i.test(name)) {
            let lookup = {
                    "id": "ID",
                    "nm": "Name",
                    "cr": "Creative",
                    "ps": "Position"
                },
                type = lookup[RegExp.$2] || "";
            result = {
                "key":   name,
                "field": `Promotion ${RegExp.$1} ${type}`,
                "value": value,
                "group": "promo"
            };
        } else if(/^pr(\d+)([a-z]{2})$/i.test(name)) {
            let lookup = {
                    "id": "ID",
                    "nm": "Name",
                    "br": "Brand",
                    "ca": "Category",
                    "va": "Variant",
                    "pr": "Price",
                    "qt": "Quantity",
                    "cc": "Coupon Code",
                    "ps": "Position"
                },
                type = lookup[RegExp.$2] || "";
            result = {
                "key":   name,
                "field": `Product ${RegExp.$1} ${type}`,
                "value": value,
                "group": "ecommerce"
            };
        } else if(/^pr(\d+)(cd|cm)(\d+)$/i.test(name)) {
            let lookup = {
                    "cd": "Dimension",
                    "cm": "Metric"
                },
                type = lookup[RegExp.$2] || "";
            result = {
                "key":   name,
                "field": `Product ${RegExp.$1} ${type} ${RegExp.$3}`,
                "value": value,
                "group": "ecommerce"
            };
        } else if(/^il(\d+)nm$/i.test(name)) {
            result = {
                "key":   name,
                "field": `Impression List ${RegExp.$1}`,
                "value": value,
                "group": "ecommerce"
            };
        } else if(/^il(\d+)pi(\d+)(cd|cm)(\d+)$/i.test(name)) {
            let lookup = {
                    "cd": "Dimension",
                    "cm": "Metric"
                },
                type = lookup[RegExp.$3] || "";
            result = {
                "key":   name,
                "field": `Impression List ${RegExp.$1} Product ${RegExp.$2} ${type} ${RegExp.$4}`,
                "value": value,
                "group": "ecommerce"
            };
        } else if(/^il(\d+)pi(\d+)([a-z]{2})$/i.test(name))
        {
            let lookup = {
                    "id": "ID",
                    "nm": "Name",
                    "br": "Brand",
                    "ca": "Category",
                    "va": "Variant",
                    "pr": "Price",
                    "ps": "Position"
                },
                type = lookup[RegExp.$3] || "";
            result = {
                "key": name,
                "field": `Impression List ${RegExp.$1} Product ${RegExp.$2} ${type}`,
                "value": value,
                "group": "ecommerce"
            };
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse any POST data into param key/value pairs
     *
     * @param postData
     * @return {Array|Object}
     */
    parsePostData(postData = "") {
        let params = [];
        // Handle POST data first, if applicable (treat as query params)
        if (typeof postData === "string" && postData !== "") {
            let keyPairs = postData.split("&");
            keyPairs.forEach((keyPair) => {
                let splitPair = keyPair.split("=");
                params.push([splitPair[0], decodeURIComponent(splitPair[1] || "")]);
            });
        } else if (typeof postData === "object") {
            Object.entries(postData).forEach((entry) => {
                // @TODO: consider handling multiple values passed?
                params.push([entry[0], entry[1].toString()]);
            });
        }
        return params;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {Array}
     */
    handleCustom(url, params)
    {
        let results = [],
            hitType = params.get("t") || params.get("en") || "page view",
            requestType = "";

        hitType = hitType.toLowerCase();
        if(hitType === "pageview" || hitType === "screenview" || hitType === "page_view") {
            requestType = "Page View";
        } else if(hitType === "transaction" || hitType === "item") {
            requestType = "Ecommerce " + hitType.charAt(0).toUpperCase() + hitType.slice(1);
        } else if(hitType.indexOf("_")) {
            requestType = hitType.replace(/_/g, " ");
        } else {
            requestType = hitType.charAt(0).toUpperCase() + hitType.slice(1);
        }
        results.push({
            "key":    "omnibug_requestType",
            "value":  requestType,
            "hidden": true
        });

        return results;
    }
}

/**
 * WebTrends OnDemand
 * https://www.webtrends.com/
 *
 * @class
 * @extends BaseProvider
 */
class WebtrendsOnDemandProvider extends BaseProvider {
    constructor() {
        super();
        this._key = "WEBTRENDSONDEMAND";
        this._pattern = /\/dcs\.gif/;
        this._name = "Webtrends OnDemand";
        this._type = "analytics";
        this._keywords = ["webtrends", "analytics", "ondemand", "on demand"];
    }

    /**
     * Retrieve the column mappings for default columns (account, event type)
     *
     * @return {{}}
     */
    get columnMapping() {
        return {
            "account": "accountID",
            "requestType": "requestType"
        };
    }

    /**
     * Retrieve the group names & order
     *
     * @returns {*[]}
     */
    get groups() {
        return [
            {
                "key": "general",
                "name": "General",
            },
            {
                "key": "marketing",
                "name": "Marketing / Traffic Source",
            },
            {
                "key": "scenario",
                "name": "Scenario Analysis",
            },
            {
                "key": "ecom",
                "name": "E-commerce",
            },
            {
                "key": "clicks",
                "name": "Click Event",
            },
            {
                "key": "search",
                "name": "Site Search",
            },
            {
                "key": "headers",
                "name": "Captured HTTP Headers",
            }
        ];
    }

    /**
     * Get all of the available URL parameter keys
     *
     * @returns {{}}
     */
    get keys() {
        return {
            "WT.vt_tlv": {
                "name": "Time of last visit (SDC)",
                "group": "other"
            },
            "WT.vt_f_tlv": {
                "name": "Time of last visit (cookie)",
                "group": "other"
            },
            "WT.vt_f_tlh": {
                "name": "Time of last hit",
                "group": "other"
            },
            "WT.vt_d": {
                "name": "First visitor hit today (EA)",
                "group": "other"
            },
            "WT.vt_a_d": {
                "name": "First visitor hit today (ARDS)",
                "group": "other"
            },
            "WT.s": {
                "name": "First visitor hit this account (ARDS)",
                "group": "other"
            },
            "WT.vt_f_d": {
                "name": "First visitor hit today (cookie)",
                "group": "other"
            },
            "WT.vt_s": {
                "name": "First visitor hit this session",
                "group": "other"
            },
            "WT.vt_f_s": {
                "name": "First visitor hit this session (cookie)",
                "group": "other"
            },
            "WT.vt_f": {
                "name": "First visitor hit (cookie)",
                "group": "other"
            },
            "WT.vt_f_a": {
                "name": "First visitor hit this account (cookie)",
                "group": "other"
            },
            "WT.vtid": {
                "name": "Session ID",
                "group": "general"
            },
            "WT.dcsvid": {
                "name": "User ID",
                "group": "general"
            },
            "WT.vtvs": {
                "name": "Visitor session (timestamp)",
                "group": "other"
            },
            "WT.co": {
                "name": "Client accepting cookies",
                "group": "other"
            },
            "WT.ce": {
                "name": "Cookie type (first/third party)",
                "group": "other"
            },
            "WT.co_d": {
                "name": "Session stitching ID",
                "group": "other"
            },
            "WT.co_a": {
                "name": "Multi account rollup ID",
                "group": "general"
            },
            "WT.co_f": {
                "name": "Visitor session ID",
                "group": "general"
            },
            "WT.tu": {
                "name": "Metrics URL truncated",
                "group": "other"
            },
            "WT.hdr": {
                "name": "Custom HTTP header tracking",
                "group": "other"
            },
            "WT.tv": {
                "name": "Webtrends JS tag version",
                "group": "general"
            },
            "WT.site": {
                "name": "Site ID",
                "group": "general"
            },
            "WT.tsrc": {
                "name": "Custom traffic source",
                "group": "marketing"
            },
            "WT.nv": {
                "name": "Parent div/table ID",
                "group": "clicks"
            },
            "WT.es": {
                "name": "Event source",
                "group": "clicks"
            },
            "WT.dcs_id": {
                "name": "DCSID",
                "group": "general"
            },
            "WT.cg_n": {
                "name": "Content group name",
                "group": "general"
            },
            "WT.cg_s": {
                "name": "Content sub-group name",
                "group": "general"
            },
            "WT.mc_id": {
                "name": "Marketing campaign",
                "group": "marketing"
            },
            "WT.mc_ev": {
                "name": "Marketing campaign clickthrough",
                "group": "marketing"
            },
            "WT.ad": {
                "name": "Advertising view",
                "group": "marketing"
            },
            "WT.ac": {
                "name": "Advertising click",
                "group": "marketing"
            },
            "WT.sv": {
                "name": "Server name",
                "group": "general"
            },
            "WT.si_n": {
                "name": "Scenario name",
                "group": "scenario"
            },
            "WT.si_p": {
                "name": "Scenario step name",
                "group": "scenario"
            },
            "WT.si_x": {
                "name": "Scenario step position",
                "group": "scenario"
            },
            "WT.si_cs": {
                "name": "Scenario conversion",
                "group": "scenario"
            },
            "WT.ti": {
                "name": "Page title",
                "group": "general"
            },
            "WT.sp": {
                "name": "Split log file",
                "group": "general"
            },
            "WT.srch": {
                "name": "Search engine type",
                "group": "marketing"
            },
            "WT.tz": {
                "name": "Browser time zone",
                "group": "other"
            },
            "WT.bh": {
                "name": "Browser time (hour)",
                "group": "other"
            },
            "WT.ul": {
                "name": "Browser language",
                "group": "other"
            },
            "WT.cd": {
                "name": "Color depth",
                "group": "other"
            },
            "WT.sr": {
                "name": "Screen resolution",
                "group": "other"
            },
            "WT.js": {
                "name": "JavaScript enabled",
                "group": "other"
            },
            "WT.jv": {
                "name": "JavaScript version",
                "group": "other"
            },
            "WT.jo": {
                "name": "Java enabled",
                "group": "other"
            },
            "WTT.jo": {
                "name": "Cookie type",
                "group": "other"
            },
            "WT.slv": {
                "name": "Silverlight enabled",
                "group": "other"
            },
            "WT.fv": {
                "name": "Flash version",
                "group": "other"
            },
            "WT.ct": {
                "name": "Connection Type",
                "group": "other"
            },
            "WT.hp": {
                "name": "Page is browser's homepage",
                "group": "other"
            },
            "WT.bs": {
                "name": "Browser resolution",
                "group": "other"
            },
            "WT.le": {
                "name": "Browser charset",
                "group": "other"
            },
            "WT.pn_sku": {
                "name": "Product SKU",
                "group": "ecom"
            },
            "WT.pn_id": {
                "name": "Product ID",
                "group": "ecom"
            },
            "WT.pn_fa": {
                "name": "Product family",
                "group": "ecom"
            },
            "WT.pn_gr": {
                "name": "Product group",
                "group": "ecom"
            },
            "WT.pn_sc": {
                "name": "Product sub-category",
                "group": "ecom"
            },
            "WT.pn_ma": {
                "name": "Product manufacturer",
                "group": "ecom"
            },
            "WT.pn_su": {
                "name": "Product supplier",
                "group": "ecom"
            },
            "WT.tx_u": {
                "name": "Transaction total quantity",
                "group": "ecom"
            },
            "WT.tx_s": {
                "name": "Transaction total cost",
                "group": "ecom"
            },
            "WT.tx_e": {
                "name": "Transaction type",
                "group": "ecom"
            },
            "WT.tx_i": {
                "name": "Transaction ID",
                "group": "ecom"
            },
            "WT.tx_id": {
                "name": "Transaction date",
                "group": "ecom"
            },
            "WT.tx_it": {
                "name": "Transaction time",
                "group": "ecom"
            },
            "WT.pi": {
                "name": "Page ID",
                "group": "general"
            },
            "WT.oss": {
                "name": "Site search term",
                "group": "search"
            },
            "WT.oss_r": {
                "name": "Site search result count",
                "group": "search"
            },
            "WT.rv": {
                "name": "Registered visitor",
                "group": "general"
            },
            "dcsid": {
                "name": "Account ID",
                "group": "general"
            },
            "dcsref": {
                "name": "Page referer",
                "group": "general"
            },
            "dcssip": {
                "name": "Page domain",
                "group": "general"
            },
            "dcsuri": {
                "name": "Page path",
                "group": "general"
            },
            "dcsua": {
                "name": "User-Agent ",
                "group": "other"
            },
            "dcspro": {
                "name": "Page protocol",
                "group": "general"
            },
            "dcsqry": {
                "name": "Page query string",
                "group": "general"
            },
            "dcsaut": {
                "name": "Auth username",
                "group": "general"
            },
            "dcsmet": {
                "name": "Method",
                "group": "other"
            },
            "dcssta": {
                "name": "Status",
                "group": "other"
            },
            "dcsbyt": {
                "name": "Request size",
                "group": "other"
            },
            "dcscip": {
                "name": "IP Address",
                "group": "other"
            },
            "dcsdat": {
                "name": "Cache buster",
                "group": "other"
            },
            "WT.ssl": {
                "name": "Page is SSL",
                "group": "other"
            },
        };
    }

    /**
     * Parse a given URL parameter into human-readable form
     *
     * @param {string}  name
     * @param {string}  value
     *
     * @returns {void|{}}
     */
    handleQueryParam(name, value) {
        // Double encoded values plague WT params...
        value = decodeURIComponent(value);

        let result = {};
        if (name === "WT.dl") {
            result = {
                "key": name,
                "field": "Event Type",
                "value": `${value} (${this._getRequestType(value)})`,
                "group": "general"
            };
        } else if (/^WT\.hdr\.(.*)/i.test(name)) {
            result = {
                "key": name,
                "field": RegExp.$1,
                "value": value,
                "group": "headers"
            };
        } else if (/^(?:WT\.seg_)(\d+)$/i.test(name)) {
            result = {
                "key": name,
                "field": "Segment of interest " + RegExp.$1,
                "value": value,
                "group": "general"
            };
        } else {
            result = super.handleQueryParam(name, value);
        }
        return result;
    }

    /**
     * Parse custom properties for a given URL
     *
     * @param    {string}   url
     * @param    {object}   params
     *
     * @returns {Array}
     */
    handleCustom(url, params) {
        let results = [],
            accountID = url.pathname.match(/^\/([^/]+)\/dcs\.gif/),
            requestType = this._getRequestType(params.get("WT.dl"));

        if (accountID) {
            results.push({
                "key": "accountID",
                "field": "Account ID",
                "value": accountID[1],
                "group": "general",
            });
        }

        results.push({
            "key": "requestType",
            "value": requestType,
            "hidden": true
        });
        return results;
    }

    /**
     * Get the request type based on the key
     * https://help.webtrends.com/legacy/en/Analytics10/event_tracking.html
     *
     * @param key
     * @returns string
     * @private
     */
    _getRequestType(key) {
        let table = {
            0: "Page View",
            20: "Download Click",
            21: "Anchor Click",
            22: "javascript: Click",
            23: "mailto: Click",
            24: "Exit Click",
            25: "Right-Click",
            26: "Form Submit - GET",
            27: "Form Submit - POST",
            28: "Form Button Click - Input",
            29: "Form Button Click - Button",
            30: "Image Map Click"
        };
        return table[key] || key;
    }
}

OmnibugProvider.addProvider(new AdobeAnalyticsProvider());
OmnibugProvider.addProvider(new AdobeAudienceManagerProvider());
OmnibugProvider.addProvider(new AdobeDynamicTagManagerProvider());
OmnibugProvider.addProvider(new AdobeExperienceIDProvider());
OmnibugProvider.addProvider(new AdobeHeartbeatProvider());
OmnibugProvider.addProvider(new AdobeLaunchProvider());
OmnibugProvider.addProvider(new AdobeTargetProvider());
OmnibugProvider.addProvider(new ATInternetProvider());
OmnibugProvider.addProvider(new ComscoreProvider());
OmnibugProvider.addProvider(new EnsightenManageProvider());
OmnibugProvider.addProvider(new FacebookPixelProvider());
OmnibugProvider.addProvider(new GoogleAdsProvider());
OmnibugProvider.addProvider(new GoogleDoubleClickProvider());
OmnibugProvider.addProvider(new GoogleTagManagerProvider());
OmnibugProvider.addProvider(new MatomoProvider());
OmnibugProvider.addProvider(new MparticleProvider());
OmnibugProvider.addProvider(new OptimizelyXProvider());
OmnibugProvider.addProvider(new PiwikPROProvider());
OmnibugProvider.addProvider(new PiwikPROTagManagerProvider());
OmnibugProvider.addProvider(new SegmentProvider());
OmnibugProvider.addProvider(new TealiumIQProvider());
OmnibugProvider.addProvider(new UniversalAnalyticsProvider());
OmnibugProvider.addProvider(new WebtrendsOnDemandProvider());