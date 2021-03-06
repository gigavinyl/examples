/* global console */
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const Moonboots = require('moonboots-express');
const compress = require('compression');
const config = require('getconfig');
const semiStatic = require('semi-static');
const serveStatic = require('serve-static');
const stylizer = require('stylizer');
const templatizer = require('templatizer');
const app = express();

// a little helper for fixing paths for constious environments
const fixPath = (pathString) => {
  return path.resolve(path.normalize(pathString));
};


// -----------------
// Configure express
// -----------------
app.use(compress());
app.use(serveStatic(fixPath('public')));

// we only want to expose tests in dev
if (config.isDev) {
  app.use(serveStatic(fixPath('test/assets')));
  app.use(serveStatic(fixPath('test/spacemonkey')));
}

app.use(cookieParser());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

// in order to test this with spacemonkey we need frames
if (!config.isDev) {
  app.use(helmet.xframe());
}
app.use(helmet.xssFilter());
app.use(helmet.nosniff());

app.set('view engine', 'jade');


// -----------------
// Set up our little demo API
// -----------------
const api = require('./fakeApi');
app.get('/api/people', api.list);
app.get('/api/people/:id', api.get);
app.delete('/api/people/:id', api.delete);
app.put('/api/people/:id', api.update);
app.post('/api/people', api.add);


// -----------------
// Enable the functional test site in development
// -----------------
if (config.isDev) {
  app.get('/test*', semiStatic({
    folderPath: fixPath('test'),
    root: '/test'
  }));
}


// -----------------
// Set our client config cookie
// -----------------
app.use((req, res, next) => {
  res.cookie('config', JSON.stringify(config.client));
  next();
});


// ---------------------------------------------------
// Configure Moonboots to serve our client application
// ---------------------------------------------------
new Moonboots({
  moonboots: {
    jsFileName: 'es6ified-ampersand',
    cssFileName: 'es6ified-ampersand',
    main: fixPath('client/app.js'),
    developmentMode: config.isDev,
    libraries: [],
    stylesheets: [
      fixPath('stylesheets/bootstrap.css'),
      fixPath('stylesheets/app.css')
    ],
    browserify: {
      debug: config.isDev,
      transform: 'babelify'
    },
    beforeBuildJS() {
      // This re-builds our template files from jade each time the app's main
      // js file is requested. Which means you can seamlessly change jade and
      // refresh in your browser to get new templates.
      if (config.isDev) {
        templatizer(fixPath('templates'), fixPath('client/templates.js'));
      }
    },
    beforeBuildCSS(done) {
      // This re-builds css from stylus each time the app's main
      // css file is requested. Which means you can seamlessly change stylus files
      // and see new styles on refresh.
      if (config.isDev) {
        stylizer({
          infile: fixPath('stylesheets/app.styl'),
          outfile: fixPath('stylesheets/app.css'),
          development: true
        }, done);
      } else {
        done();
      }
    }
  },
  server: app
});


// listen for incoming http requests on the port as specified in our config
app.listen(config.http.port);
console.log('ES6ified ampersand is running at: http://localhost:' + config.http.port + ' Yep. That\'s pretty awesome.');
