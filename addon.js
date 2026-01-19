const { addonBuilder } = require("stremio-addon-sdk")
const fetch = require("node-fetch")

// 🔑 OMDb KEY (hardcoded, cum ai cerut)
const OMDB_KEY = "a6e0bfcf"

const GENRES = [
  "Action","Adventure","Animation","Biography","Comedy","Crime",
  "Documentary","Drama","Family","Fantasy","History","Horror",
  "Mystery","Romance","Sci-Fi","Sport","Thriller","War","Western"
]

// helper pt generare catalog
function makeCatalog(id, name, type, min, max) {
  return {
    type: "other",
    id,
    name,
    extra: [
      {
        name: "genre",
        options: GENRES,
        isRequired: false
      }
    ],
    extraSupported: ["genre"],
    typeFilter: type,
    ratingMin: min,
    ratingMax: max
  }
}

// ================= MANIFEST =================
const builder = new addonBuilder({
  id: "org.imdb.omdb.other.full",
  version: "3.0.0",
  name: "IMDb OMDb (Other)",
  description: "Movies & Series by rating & genre",
  resources: ["catalog"],
  types: ["other"],
  catalogs: [
    makeCatalog("movies_6_7", "Movies 6-7", "movie", 6, 7),
    makeCatalog("movies_7_8", "Movies 7-8", "movie", 7, 8),
    makeCatalog("movies_8_9", "Movies 8-9", "movie", 8, 9),
    makeCatalog("movies_9_10", "Movies 9-10", "movie", 9, 10),

    makeCatalog("series_6_7", "Series 6-7", "series", 6, 7),
    makeCatalog("series_7_8", "Series 7-8", "series", 7, 8),
    makeCatalog("series_8_9", "Series 8-9", "series", 8, 9),
    makeCatalog("series_9_10", "Series 9-10", "series", 9, 10)
  ]
})

// ================= HELPERS =================
async function fetchFromCinemeta(type) {
  const url = `https://v3-cinemeta.strem.io/catalog/${type}/top.json`
  const res = await fetch(url)
  const json = await res.json()
  return json.metas || []
}

async function fetchOMDb(imdbId) {
  const url = `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_KEY}`
  const res = await fetch(url)
  return res.json()
}

// ================= CATALOG HANDLER =================
builder.defineCatalogHandler(async ({ id, extra }) => {
  const catalog = builder.manifest.catalogs.find(c => c.id === id)
  if (!catalog) return { metas: [] }

  const base = await fetchFromCinemeta(catalog.typeFilter)
  const metas = []

  for (const item of base.slice(0, 30)) {
    const omdb = await fetchOMDb(item.id)
    const rating = parseFloat(omdb.imdbRating)

    if (!rating || rating < catalog.ratingMin || rating >= catalog.ratingMax) continue
    if (extra.genre && !omdb.Genre?.includes(extra.genre)) continue

    metas.push({
      id: item.id,
      type: catalog.typeFilter,
      name: item.name,
      poster: item.poster,
      imdbRating: rating
    })
  }

  return { metas }
})

module.exports = builder
