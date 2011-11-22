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
