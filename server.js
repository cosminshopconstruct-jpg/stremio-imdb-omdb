const express = require("express");
const addonInterface = require("./addon");

const app = express();

app.get("/manifest.json", (req, res) => {
  res.json(addonInterface.manifest);
});

app.use("/", addonInterface.router);

const port = process.env.PORT || 7000;
app.listen(port, () => {
  console.log("Addon running on port " + port);
});
