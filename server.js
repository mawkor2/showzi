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
app.get('/fonts/*', function(req, res){
    console.log(req);
    res.sendfile('.'+ req.url);
});
app.get('/', function(req, res){
    res.render('index', {
        pageTitle: 'Showzi - Find events in your area'
    })
});
app.get('/widget/js/*.js', function(req, res){
    console.log(req);
    res.sendfile('.'+ req.url);
});
app.listen(3000);
