var app = require('express').createServer();
app.set('view engine', 'jade');
app.set('view options', {
    layout: false
});
app.get('/js/*.js', function(req, res){
    console.log(req);
    res.sendfile('.'+ req.url);
});
app.get('/images/*', function(req, res){
    console.log(req);
    res.sendfile('.'+ req.url);
});
app.get('/', function(req, res){
    res.render('index', {
        pageTitle: 'showzi'
    })
});
app.get(/\/widget\/(*)\.jade/, function(req, res){
    res.render(req.params[0], {
        pageTitle: req.params[0] + "_render"
    })
});
app.get('/widget/js/*.js', function(req, res){
    console.log(req);
    res.sendfile('.'+ req.url);
});
app.listen(3000);
