var titles = require('../conf')

const goLaravel = function(name, params, absolute, customZiggy){
    return new Router(name, params, absolute, customZiggy);
}
const goto = (page, params) => {
    let _url = window.Ziggy===undefined ? page+'.html': route(titles[page]['route'], params).url()
    location.assign(_url)
};

class UrlBuilder {
    constructor(name, absolute, ziggyObject) {

        this.name = name;
        this.ziggy = ziggyObject;
        this.route = this.ziggy.namedRoutes[this.name];

        if (typeof this.name === 'undefined') {
            throw new Error('Ziggy Error: You must provide a route name');
        } else if (typeof this.route === 'undefined') {
            throw new Error(`Ziggy Error: route '${this.name}' is not found in the route list`);
        }

        this.absolute = typeof absolute === 'undefined' ? true : absolute;
        this.domain = this.setDomain();
        this.path = this.route.uri.replace(/^\//, '');
    }

    setDomain() {
        if (!this.absolute)
            return '/';

        if (!this.route.domain)
            return this.ziggy.baseUrl.replace(/\/?$/, '/');

        let host = (this.route.domain || this.ziggy.baseDomain).replace(/\/+$/, '');

        if (this.ziggy.basePort && (host.replace(/\/+$/, '') === this.ziggy.baseDomain.replace(/\/+$/, '')))
            host = this.ziggy.baseDomain + ':' + this.ziggy.basePort;

        return this.ziggy.baseProtocol + '://' + host + '/';
    }

    construct() {
        return this.domain + this.path
    }
}

class Router extends String {
    constructor(name, params, absolute, customZiggy=null) {
        super();

        this.name           = name;
        this.absolute       = absolute;
        this.ziggy          = customZiggy ? customZiggy : Ziggy;
        this.template       = this.name ? new UrlBuilder(name, absolute, this.ziggy).construct() : '',
            this.urlParams      = this.normalizeParams(params);
        this.queryParams    = this.normalizeParams(params);
    }

    normalizeParams(params) {
        if (typeof params === 'undefined')
            return {};

        // If you passed in a string or integer, wrap it in an array
        params = typeof params !== 'object' ? [params] : params;

        // If the tags object contains an ID and there isn't an ID param in the
        // url template, they probably passed in a single model object and we should
        // wrap this in an array. This could be slightly dangerous and I want to find
        // a better solution for this rare case.

        if (params.hasOwnProperty('id') && this.template.indexOf('{id}') == -1) {
            params = [params.id];
        }

        this.numericParamIndices = Array.isArray(params);
        return Object.assign({}, params);
    }

    with(params) {
        this.urlParams = this.normalizeParams(params);
        return this;
    }

    withQuery(params) {
        Object.assign(this.queryParams, params);
        return this;
    }

    hydrateUrl() {
        let tags = this.urlParams,
            paramsArrayKey = 0,
            params = this.template.match(/{([^}]+)}/gi),
            needDefaultParams = false;

        if (params && params.length != Object.keys(tags).length) {
            needDefaultParams = true
        }

        return this.template.replace(
            /{([^}]+)}/gi,
            (tag, i) => {
                let keyName = this.trimParam(tag),
                    key = this.numericParamIndices ? paramsArrayKey : keyName,
                    defaultParameter = this.ziggy.defaultParameters[keyName];

                if (defaultParameter && needDefaultParams) {
                    if (this.numericParamIndices) {
                        tags = Object.values(tags)
                        tags.splice(key, 0, defaultParameter)
                    } else {
                        tags[key] = defaultParameter
                    }
                }

                paramsArrayKey++;
                if (typeof tags[key] !== 'undefined') {
                    delete this.queryParams[key];
                    return tags[key].id || encodeURIComponent(tags[key]);
                }
                if (tag.indexOf('?') === -1) {
                    throw new Error(`Ziggy Error: '${keyName}' key is required for route '${this.name}'`);
                } else {
                    return '';
                }
            }
        );
    }

    matchUrl() {
        let windowUrl = window.location.hostname + (window.location.port ? ':' + window.location.port : '') + window.location.pathname;

        // Strip out optional parameters
        let optionalTemplate = this.template.replace(/(\/\{[^\}]*\?\})/g, '/')
            .replace(/(\{[^\}]*\})/gi, '[^\/\?]+')
            .replace(/\/?$/, '')
            .split('://')[1];

        let searchTemplate = this.template.replace(/(\{[^\}]*\})/gi, '[^\/\?]+').split('://')[1];
        let urlWithTrailingSlash = windowUrl.replace(/\/?$/, '/');

        const regularSearch = new RegExp("^" + searchTemplate + "\/$").test(urlWithTrailingSlash);
        const optionalSearch = new RegExp("^" + optionalTemplate + "\/$").test(urlWithTrailingSlash);

        return regularSearch || optionalSearch;
    }

    constructQuery() {
        if (Object.keys(this.queryParams).length === 0)
            return '';

        let queryString = '?';

        Object.keys(this.queryParams).forEach(function(key, i) {
            if (this.queryParams[key] !== undefined && this.queryParams[key] !== null) {
                queryString = i === 0 ? queryString : queryString + '&';
                queryString += key + '=' + encodeURIComponent(this.queryParams[key]);
            }
        }.bind(this));

        return queryString;
    }

    current(name = null) {
        let routeNames = Object.keys(this.ziggy.namedRoutes);

        let currentRoute = routeNames.filter(name => {
            if (this.ziggy.namedRoutes[name].methods.indexOf('GET') === -1) {
                return false;
            }

            return new Router(name, undefined, undefined, this.ziggy).matchUrl();
        })[0];

        if (name) {
            const pattern = new RegExp(name.replace('*', '.*').replace('.', '\.'), 'i');
            return pattern.test(currentRoute);
        }

        return currentRoute;
    }

    extractParams(uri, template, delimiter) {
        const uriParts = uri.split(delimiter);
        const templateParts = template.split(delimiter);

        return templateParts.reduce((params, param, i) => (
            param.indexOf('{') === 0 && param.indexOf('}') !== -1 && uriParts[i]
                ? Object.assign(params, { [this.trimParam(param)]: uriParts[i] })
                : params
        ), {});
    }

    get params() {
        const namedRoute = this.ziggy.namedRoutes[this.current()];

        return Object.assign(
            this.extractParams(window.location.hostname, namedRoute.domain || '', '.'),
            this.extractParams(window.location.pathname.slice(1), namedRoute.uri, '/'),
        );
    }

    parse() {
        this.return = this.hydrateUrl() + this.constructQuery();
    }

    url() {
        this.parse();
        return this.return;
    }

    toString() {
        return this.url();
    }

    trimParam(param) {
        return param.replace(/{|}|\?/g, '');
    }

    valueOf() {
        return this.url();
    }
}

export default goto
