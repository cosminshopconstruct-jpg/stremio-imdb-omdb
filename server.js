const { addonBuilder, serveHTTP } = require("stremio-addon-sdk")
const fetch = require("node-fetch")

// 🔑 OMDb KEY (mai bine din env)
const OMDB_KEY = process.env.OMDB_KEY || "a6e0bfcf"

// 🔧 ADDON MANIFEST
const builder = new addonBuilder({
  id: "org.imdb.omdb.catalog.v1",
  version: "1.0.0",
  name: "IMDb OMDb Catalog",
  description: "Movies & Series with IMDb rating >= 7",
  resources: ["catalog"],
  types: ["movie", "series"],
  catalogs: [
    {
      type: "movie",
      id: "imdb_movies",
      name: "IMDb Movies (7+)",
      extra: [
        { name: "rating", options: ["7-8", "8-9", "9-10"] }
      ]
    },
    {
      type: "series",
      id: "imdb_series",
      name: "IMDb Series (7+)",
      extra: [
        { name: "rating", options: ["7-8", "8-9", "9-10"] }
      ]
    }
  ]
})

/*
  🔹 Luăm lista de bază din Cinemeta (FĂRĂ CHEIE)
  🔹 Apoi pentru fiecare item luăm IMDb rating REAL din OMDb
*/
async function fetchFromCinemeta(type) {
  const url = `https://v3-cinemeta.strem.io/catalog/${type}/top.json`
  const res = await fetch(url)
  const json = await res.json()
  return json.metas || []
}

async function fetchIMDbRating(imdbId) {
  const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`
  const res = await fetch(url)
  const json = await res.json()

  if (json && json.imdbRating && json.imdbRating !== "N/A") {
    return parseFloat(json.imdbRating)
  }
  return null
}

// ⭐ CATALOG HANDLER
builder.defineCatalogHandler(async ({ type, extra }) => {
  const baseMetas = await fetchFromCinemeta(type)

  let min = 0
  let max = 10
  if (extra.rating) {
    ;[min, max] = extra.rating.split("-").map(Number)
  }

  const metas = []

  // limităm ca să nu spargem OMDb free tier
  for (const item of baseMetas.slice(0, 20)) {
    const rating = await fetchIMDbRating(item.id)
    if (rating && rating >= min && rating < max) {
      metas.push({
        id: item.id,
        type,
        name: item.name,
        poster: item.poster,
        imdbRating: rating
      })
    }
  }

  return { metas }
})

// 🚀 SERVER
serveHTTP(builder.getInterface(), {
  port: process.env.PORT || 7000
})
