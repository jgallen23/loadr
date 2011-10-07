m.require({
  js: ['module/dep.js', 'module/dep2.js'],
  css: ['module/style.css'],
  html: ['module/view.html']
}, function(html) {
  console.log("ready", depValue, dep2Value, html);
});
