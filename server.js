const { serveHTTP } = require("stremio-addon-sdk")
const builder = require("./addon")

serveHTTP(builder.getInterface(), {
  port: process.env.PORT || 7000,
  host: "0.0.0.0"
})
