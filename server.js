const http = require('http'),
	https = require('https'),
	fs = require('fs'),
	config = require('./config.json'),
	proxy = new (require('./lib/index'))(config.prefix, {
		localAddress: config.localAddresses ? config.localAddresses : false,
		blacklist: config.blockedHostnames ? config.blockedHostnames : false
	}),
	index_file = 'index.html',
	atob = str => new Buffer.from(str, 'base64').toString('utf-8'),
	app = (req, res) => {

		// HTTP(S) proxy.
		if (req.url.startsWith(config.prefix)) return proxy.http(req, res); 

			req.pathname = req.url.split('#')[0].split('?')[0];
			req.query = {};
			req.url.split('#')[0].split('?').slice(1).join('?').split('&').forEach(query => req.query[query.split('=')[0]] = query.split('=').slice(1).join('='));

			if (req.query.url && (req.pathname == '/prox' || req.pathname == '/prox/' || req.pathname == '/session' || req.pathname == '/session/')) {
				var url = atob(req.query.url);

				if (!url.includes('.')) {
					url.replace(' ', '+');
					url = `https://google.com/search?q=${url}`;
				}
				else if (url.startsWith('https://') || url.startsWith('http://')) url = url;
				else if (url.startsWith('//')) url = 'http:' + url;
				else url = 'http://' + url;

				return (res.writeHead(301, { location: config.prefix + proxy.proxifyRequestURL(url) }), res.end(''));
			}


			// General file server.
			const publicPath = __dirname + '/public' + req.pathname;

			const error = () => (res.statusCode = 404, res.end(fs.readFileSync(__dirname + '/lib/error.html', 'utf-8').replace('%ERR%', `Cannot ${req.method} ${req.pathname}`)))

			fs.lstat(publicPath, (err, stats) => {

			if (err) return error();

			if (stats.isDirectory()) fs.existsSync(publicPath + index_file) ? fs.createReadStream(publicPath + index_file).pipe(res) : error();
			else if (stats.isFile()) !publicPath.endsWith('/') ? fs.createReadStream(publicPath).pipe(res) : error();
			else error();
		});
	},
	server = http.createServer(app);

// Websocket proxy.
proxy.ws(server);

server.listen(process.env.PORT || config.port, config.ip)
console.log(`http://${config.ip}:${config.port}`)

