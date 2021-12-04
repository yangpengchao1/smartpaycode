const Koa = require('koa');
const Router = require('koa-router');
const static = require('koa-static');
const body = require('koa-better-body');
const path = require('path');

let server = new Koa();
server.listen(8080);

//middleware
server.use(body({
    uploadDir: path.resolve(__dirname, './static/upload')
}));

let router = new Router();

// Internal Server Error
router.use(async (ctx, next) => {
    try {
        await next();
    } catch (e) {
        console.log(e)
        ctx.throw(406, e.message)
    }
});

//router api
router.use("/api", require('./routers/api'));

//static resource
router.all(/((\.html)|(\.htm))$/i, static('./static'));

server.use(router.routes());