/*!
  * =============================================================
  * Ender: open module JavaScript framework (https://ender.no.de)
  * Build: ender build reqwest ../
  * =============================================================
  */

/*!
  * Ender: open module JavaScript framework (client-lib)
  * copyright Dustin Diaz & Jacob Thornton 2011 (@ded @fat)
  * http://ender.no.de
  * License MIT
  */
!function (context) {

  // a global object for node.js module compatiblity
  // ============================================

  context['global'] = context

  // Implements simple module system
  // losely based on CommonJS Modules spec v1.1.1
  // ============================================

  var modules = {}
    , old = context.$

  function require (identifier) {
    var module = modules[identifier] || window[identifier]
    if (!module) throw new Error("Requested module '" + identifier + "' has not been defined.")
    return module
  }

  function provide (name, what) {
    return (modules[name] = what)
  }

  context['provide'] = provide
  context['require'] = require

  // Implements Ender's $ global access object
  // =========================================

  function aug(o, o2) {
    for (var k in o2) k != 'noConflict' && k != '_VERSION' && (o[k] = o2[k])
    return o
  }

  function boosh(s, r, els) {
    // string || node || nodelist || window
    if (ender._select && (typeof s == 'string' || s.nodeName || s.length && 'item' in s || s == window)) {
      els = ender._select(s, r)
      els.selector = s
    } else els = isFinite(s.length) ? s : [s]
    return aug(els, boosh)
  }

  function ender(s, r) {
    return boosh(s, r)
  }

  aug(ender, {
      _VERSION: '0.3.4'
    , fn: boosh // for easy compat to jQuery plugins
    , ender: function (o, chain) {
        aug(chain ? boosh : ender, o)
      }
    , _select: function (s, r) {
        return (r || document).querySelectorAll(s)
      }
  })

  aug(boosh, {
    forEach: function (fn, scope, i) {
      // opt out of native forEach so we can intentionally call our own scope
      // defaulting to the current item and be able to return self
      for (i = 0, l = this.length; i < l; ++i) i in this && fn.call(scope || this[i], this[i], i, this)
      // return self for chaining
      return this
    },
    $: ender // handy reference to self
  })

  ender.noConflict = function () {
    context.$ = old
    return this
  }

  if (typeof module !== 'undefined' && module.exports) module.exports = ender
  // use subscript notation as extern for Closure compilation
  context['ender'] = context['$'] = context['ender'] || ender

}(this);

!function () {

  var module = { exports: {} }, exports = module.exports;

  /*!
    * Reqwest! A general purpose XHR connection manager
    * (c) Dustin Diaz 2011
    * https://github.com/ded/reqwest
    * license MIT
    */
  
  !function (name, definition) {
    if (typeof define == 'function') define(definition)
    else if (typeof module != 'undefined') module.exports = definition()
    else this[name] = definition()
  }('reqwest', function () {
  
    var context = this
      , win = window
      , doc = document
      , old = context.reqwest
      , twoHundo = /^20\d$/
      , byTag = 'getElementsByTagName'
      , readyState = 'readyState'
      , contentType = 'Content-Type'
      , head = doc[byTag]('head')[0]
      , uniqid = 0
      , lastValue // data stored by the most recent JSONP callback
      , xhr = ('XMLHttpRequest' in win) ?
          function () {
            return new XMLHttpRequest()
          } :
          function () {
            return new ActiveXObject('Microsoft.XMLHTTP')
          }
  
    function handleReadyState(o, success, error) {
      return function () {
        if (o && o[readyState] == 4) {
          if (twoHundo.test(o.status)) {
            success(o)
          } else {
            error(o)
          }
        }
      }
    }
  
    function setHeaders(http, o) {
      var headers = o.headers || {}
      headers.Accept = headers.Accept || 'text/javascript, text/html, application/xml, text/xml, */*'
  
      // breaks cross-origin requests with legacy browsers
      if (!o.crossOrigin) {
        headers['X-Requested-With'] = headers['X-Requested-With'] || 'XMLHttpRequest'
      }
      headers[contentType] = headers[contentType] || 'application/x-www-form-urlencoded'
      for (var h in headers) {
        headers.hasOwnProperty(h) && http.setRequestHeader(h, headers[h])
      }
    }
  
    function getCallbackName(o, reqId) {
      var callbackVar = o.jsonpCallback || "callback"
      if (o.url.slice(-(callbackVar.length + 2)) == (callbackVar + "=?")) {
        // Generate a guaranteed unique callback name
        var callbackName = "reqwest_" + reqId
  
        // Replace the ? in the URL with the generated name
        o.url = o.url.substr(0, o.url.length - 1) + callbackName
        return callbackName
      } else {
        // Find the supplied callback name
        var regex = new RegExp(callbackVar + "=([\\w]+)")
        return o.url.match(regex)[1]
      }
    }
  
    // Store the data returned by the most recent callback
    function generalCallback(data) {
      lastValue = data
    }
  
    function getRequest(o, fn, err) {
      if (o.type == 'jsonp') {
        var script = doc.createElement('script')
          , loaded = 0
          , reqId = uniqid++
  
        // Add the global callback
        win[getCallbackName(o, reqId)] = generalCallback
  
        // Setup our script element
        script.type = 'text/javascript'
        script.src = o.url
        script.async = true
        if (typeof script.onreadystatechange !== 'undefined') {
            // need this for IE due to out-of-order onreadystatechange(), binding script
            // execution to an event listener gives us control over when the script
            // is executed. See http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
            script.event = 'onclick'
            script.htmlFor = script.id = '_reqwest_' + reqId
        }
  
        script.onload = script.onreadystatechange = function () {
          if ((script[readyState] && script[readyState] !== "complete" && script[readyState] !== "loaded") || loaded) {
            return false
          }
          script.onload = script.onreadystatechange = null
          script.onclick && script.onclick()
          // Call the user callback with the last value stored
          // and clean up values and scripts.
          o.success && o.success(lastValue)
          lastValue = undefined
          head.removeChild(script)
          loaded = 1
        }
  
        // Add the script to the DOM head
        head.appendChild(script)
      } else {
        var http = xhr()
          , method = (o.method || 'GET').toUpperCase()
          , url = (typeof o === 'string' ? o : o.url)
          // convert non-string objects to query-string form unless o.processData is false 
          , data = o.processData !== false && o.data && typeof o.data !== 'string'
            ? reqwest.toQueryString(o.data)
            : o.data || null
  
        // if we're working on a GET request and we have data then we should append
        // query string to end of URL and not post data
        method == 'GET' && data && data !== '' && (url += (/\?/.test(url) ? '&' : '?') + data) && (data = null)
        http.open(method, url, true)
        setHeaders(http, o)
        http.onreadystatechange = handleReadyState(http, fn, err)
        o.before && o.before(http)
        http.send(data)
        return http
      }
    }
  
    function Reqwest(o, fn) {
      this.o = o
      this.fn = fn
      init.apply(this, arguments)
    }
  
    function setType(url) {
      if (/\.json$/.test(url)) {
        return 'json'
      }
      if (/\.jsonp$/.test(url)) {
        return 'jsonp'
      }
      if (/\.js$/.test(url)) {
        return 'js'
      }
      if (/\.html?$/.test(url)) {
        return 'html'
      }
      if (/\.xml$/.test(url)) {
        return 'xml'
      }
      return 'js'
    }
  
    function init(o, fn) {
      this.url = typeof o == 'string' ? o : o.url
      this.timeout = null
      var type = o.type || setType(this.url)
        , self = this
      fn = fn || function () {}
  
      if (o.timeout) {
        this.timeout = setTimeout(function () {
          self.abort()
        }, o.timeout)
      }
  
      function complete(resp) {
        o.timeout && clearTimeout(self.timeout)
        self.timeout = null
        o.complete && o.complete(resp)
      }
  
      function success(resp) {
        var r = resp.responseText
        if (r) {
          switch (type) {
          case 'json':
            try {
              resp = win.JSON ? win.JSON.parse(r) : eval('(' + r + ')')          
            } catch(err) {
              return error(resp, 'Could not parse JSON in response', err)
            }
            break;
          case 'js':
            resp = eval(r)
            break;
          case 'html':
            resp = r
            break;
          }
        }
  
        fn(resp)
        o.success && o.success(resp)
  
        complete(resp)
      }
  
      function error(resp, msg, t) {
        o.error && o.error(resp, msg, t)
        complete(resp)
      }
  
      this.request = getRequest(o, success, error)
    }
  
    Reqwest.prototype = {
      abort: function () {
        this.request.abort()
      }
  
    , retry: function () {
        init.call(this, this.o, this.fn)
      }
    }
  
    function reqwest(o, fn) {
      return new Reqwest(o, fn)
    }
  
    // normalize newline variants according to spec -> CRLF
    function normalize(s) {
      return s ? s.replace(/\r?\n/g, '\r\n') : ''
    }
  
    var isArray = typeof Array.isArray == 'function' ? Array.isArray : function(a) {
      return Object.prototype.toString.call(a) == '[object Array]'
    }
  
    function serial(el, cb) {
      var n = el.name
        , t = el.tagName.toLowerCase()
        , o
  
      // don't serialize elements that are disabled or without a name
      if (el.disabled || !n) return;
  
      switch (t) {
      case 'input':
        if (!/reset|button|image|file/i.test(el.type)) {
          var ch = /checkbox/i.test(el.type)
            , ra = /radio/i.test(el.type)
            , val = el.value;
          // WebKit gives us "" instead of "on if a checkbox has no value, so correct it here
          (!(ch || ra) || el.checked) && cb(n, normalize(ch && val === '' ? 'on' : val))
        }
        break;
      case 'textarea':
        cb(n, normalize(el.value))
        break;
      case 'select':
        if (el.type.toLowerCase() === 'select-one') {
          o = el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null
          o && !o.disabled && cb(n, normalize(o.value || o.text))
        } else {
          for (var i = 0; el.length && i < el.length; i++) {
            o = el.options[i]
            o.selected && !o.disabled && cb(n, normalize(o.value || o.text))
          }
        }
        break;
      }
    }
  
    // collect up all form elements found from the passed argument elements all
    // the way down to child elements; pass a '<form>' or form fields.
    // called with 'this'=callback to use for serial() on each element
    function eachFormElement() {
      var cb = this
        , serializeSubtags = function(e, tags) {
          for (var i = 0; i < tags.length; i++) {
            var fa = e[byTag](tags[i])
            for (var j = 0; j < fa.length; j++) serial(fa[j], cb)
          }
        }
  
      for (var i = 0; i < arguments.length; i++) {
        var e = arguments[i]
        if (/input|select|textarea/i.test(e.tagName)) serial(e, cb);
        serializeSubtags(e, [ 'input', 'select', 'textarea' ])
      }
    }
  
    // standard query string style serialization
    function serializeQueryString() {
      return reqwest.toQueryString(reqwest.serializeArray.apply(null, arguments))
    }
  
    // { 'name': 'value', ... } style serialization
    function serializeHash() {
      var hash = {}
      eachFormElement.apply(function(name, value) {
        if (name in hash) {
          hash[name] && !isArray(hash[name]) && (hash[name] = [hash[name]])
          hash[name].push(value)
        } else hash[name] = value
      }, arguments)
      return hash
    }
  
    // [ { name: 'name', value: 'value' }, ... ] style serialization
    reqwest.serializeArray = function () {
      var arr = []
      eachFormElement.apply(function(name, value) {
        arr.push({name: name, value: value})
      }, arguments)
      return arr 
    }
  
    reqwest.serialize = function () {
      if (arguments.length === 0) return "";
      var opt, fn
        , args = Array.prototype.slice.call(arguments, 0)
  
      opt = args.pop()
      opt && opt.nodeType && args.push(opt) && (opt = null)
      opt && (opt = opt.type)
  
      if (opt == 'map') fn = serializeHash
      else if (opt == 'array') fn = reqwest.serializeArray
      else fn = serializeQueryString
  
      return fn.apply(null, args)
    }
  
    reqwest.toQueryString = function(o) {
      var qs = '', i
        , enc = encodeURIComponent
        , push = function(k, v) {
            qs += enc(k) + '=' + enc(v) + '&'
          }
  
      if (isArray(o)) {
        for (i = 0; o && i < o.length; i++) push(o[i].name, o[i].value)
      } else {
        for (var k in o) {
          if (!Object.hasOwnProperty.call(o, k)) continue;
          var v = o[k]
          if (isArray(v)) {
            for (i = 0; i < v.length; i++) push(k, v[i])
          } else push(k, o[k])
        }
      }
  
      // spaces should be + according to spec
      return qs.replace(/&$/, '').replace(/%20/g,'+')
    }
  
    reqwest.noConflict = function () {
      context.reqwest = old
      return this
    }
  
    return reqwest
  })

  provide("reqwest", module.exports);

  !function ($) {
    var r = require('reqwest')
      , integrate = function(method) {
        return function() {
          var args = (this && this.length > 0 ? this : []).concat(Array.prototype.slice.call(arguments, 0))
          return r[method].apply(null, args)
        }
      }
      , s = integrate('serialize')
      , sa = integrate('serializeArray')
  
    $.ender({
      ajax: r
      , serialize: s
      , serializeArray: sa
      , toQueryString: r.toQueryString
    })
  
    $.ender({
      serialize: s
      , serializeArray: sa
    }, true)
  }(ender);
  

}();

!function () {

  var module = { exports: {} }, exports = module.exports;

  /*!
    * Module.js - a ui module loader 
    * v0.0.1
    * https://github.com/jgallen23/modulejs
    * copyright JGA 2011
    * MIT License
    */
  
  !function (name, definition) {
    if (typeof module != 'undefined' && module.exports) module.exports = definition();
    else if (typeof define == 'function' && typeof define.amd == 'object') define(definition);
    else this[name] = definition();
  }('m', function() {
  
  /*!
    * Resistance - A javascript flow controller 
    * v1.2.0
    * https://github.com/jgallen23/resistance
    * copyright JGA 2011
    * MIT License
    */
  
  !function(obj) {
  
    var runSeries = function(fns, callback) {
      if (fns.length === 0) return callback();
      var completed = 0;
      var data = [];
      var iterate = function() {
        fns[completed](function(results) {
          data[completed] = results;
          if (++completed == fns.length) {
            if (callback) callback(data);
          } else {
            iterate();
          }
        });
      };
      iterate();
    };
    
    var runParallel = function(fns, callback) {
      if (fns.length === 0) return callback();
      var started = 0;
      var completed = 0;
      var data = [];
      var iterate = function() {
        fns[started]((function(i) {
          return function(results) {
            data[i] = results;
            if (++completed == fns.length) {
              if (callback) callback(data);
              return;
            }
          };
        })(started));
        if (++started != fns.length) iterate();
      };
      iterate();
    };
  
    var queue = function(fn, parallel) {
      var q = [];
      return {
        push: function(obj) {
          q.push(function(cb) {
            fn(obj, cb);
          });
        },
        run: function(cb) {
          if (parallel)
            runParallel(q, cb);
          else
            runSeries(q, cb);
        }
      };
    };
  
    var orig = obj.R;
    obj.R = {
      noConflict: function() {
        obj.R = orig;
        return this;
      },
      series: runSeries,
      parallel: runParallel,
      queue: queue
    };
  }(typeof exports === 'undefined' ? this : exports);
  
  var m = function() {
    var head = document.getElementsByTagName('head')[0];
    var scripts = {};
  
    var poll = function(path, cb) {
      setTimeout(function() {
        if (scripts[path] == 2)
          if (cb) cb();
        else
          poll(path, cb);
      }, 20);
    };
  
    var getScript = function(path, cb) {
      if (scripts[path]) {
        poll(path, cb);
        return;
      }
  
      scripts[path] = 1;
      var el = document.createElement('script');
      el.onload = el.onerror = el.onreadystatechange = function () {
        if ((el.readyState && !(/^c|loade/.test(el.readyState)))) return;
        el.onload = el.onreadystatechange = null;
        scripts[path] = 2;
        if (cb) cb();
      };
      el.async = 1;
      el.src = path;
      head.insertBefore(el, head.firstChild);
    };
  
  
    var getScripts = function(scripts, cb) {
      var q = R.queue(function(path, cb) {
        getScript(path, cb);
      });
      for (var i = 0, c = scripts.length; i < c; i++) {
        q.push(scripts[i]);
      }
      q.run(function() {
        cb();
      });
    };
  
    var getStyle = function(path, cb) {
      var link = document.createElement('link');
      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = path;
      head.appendChild(link);
      cb();
    };
  
    var getStyles = function(css, cb) {
      var q = R.queue(function(path, cb) {
        getStyle(path, cb);
      });
      for (var i = 0, c = css.length; i < c; i++) {
        q.push(css[i]);
      }
      q.run(function() {
        cb();
      });
    };
  
    var getHtml = function(tmps, cb) {
      var q = R.queue(function(path, cb) {
        $.get(path, cb);
      });
      for (var i = 0, c = tmps.length; i < c; i++) {
        q.push(tmps[i]);
      }
      q.run(function(html) {
        cb(html);
      });
    };
  
    return {
      require: function(deps, cb) {
        var q = [];
        if (deps.js) q.push(function(cb) { getScripts(deps.js, cb); });
        if (deps.css) q.push(function(cb) { getStyles(deps.css, cb); });
        if (deps.html) q.push(function(cb) { getHtml(deps.html, cb); });
        R.parallel(q, function(data) {
          cb((deps.html)?data[2]:null);
        });
      },
      load: function(path) {
        getScript(path);
      }
    };
  }();
  
    return m;
  });
  

  provide("loadr", module.exports);

  $.ender(module.exports);

}();