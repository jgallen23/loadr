/*!
  * loadr.js - a ui module loader 
  * v0.0.1
  * https://github.com/jgallen23/loadr
  * copyright JGA 2011
  * MIT License
  */

!function (name, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition();
  else if (typeof define == 'function' && typeof define.amd == 'object') define(definition);
  else this[name] = definition();
}('loadr', function() {

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
  if (typeof scripts === "string")
    scripts = [scripts];
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
  if (typeof css === "string")
    css = [css];
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

var loadr = function(deps, cb) {
  if (typeof deps == "string")
    deps = { js: [deps] };
  var q = [];
  if (deps.js) q.push(function(cb) { getScripts(deps.js, cb); });
  if (deps.css) q.push(function(cb) { getStyles(deps.css, cb); });
  if (deps.html) q.push(function(cb) { getHtml(deps.html, cb); });
  R.parallel(q, function(data) {
    if (cb) cb((deps.html)?data[2]:null);
  });
};
return loadr;

  return m;
});
