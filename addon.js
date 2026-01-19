const { addonBuilder } = require("stremio-addon-sdk")
const fetch = require("node-fetch")

const TMDB_KEY = "4abf1e647b12f1751bb0303e52a1e989"

const GENRES = [
  "Action","Adventure","Animation","Biography","Comedy","Crime",
  "Documentary","Drama","Family","Fantasy","History","Horror",
  "Mystery","Romance","Sci-Fi","Sport","Thriller","War","Western"
]

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

// ======== TIMEOUT FETCH ========
async function fetchFromTMDb(type, page) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000) // 8 sec timeout

  try {
    const url = `https://api.themoviedb.org/3/${type}/top_rated?api_key=${TMDB_KEY}&language=en-US&page=${page}`
    const res = await fetch(url, { signal: controller.signal })
    const json = await res.json()
    return json
  } catch (e) {
    return { results: [], total_pages: 1 }
  } finally {
    clearTimeout(timeout)
  }
}

// ======== HANDLER ========
builder.defineCatalogHandler(async ({ id, extra, pagination }) => {
  const catalog = builder.manifest.catalogs.find(c => c.id === id)
  if (!catalog) return { metas: [] }

  const page = (pagination && pagination.page) ? pagination.page : 1
  const type = catalog.typeFilter === "movie" ? "movie" : "tv"

  const base = await fetchFromTMDb(type, page)
  const metas = []

  for (const item of (base.results || [])) {
    const rating = parseFloat(item.vote_average)

    // filtrare corectă (nu mai sare peste interval)
    if (!rating || rating < catalog.ratingMin || rating >= catalog.ratingMax) continue

    // filtrare gen
    if (extra.genre) {
      const genreId = getGenreId(extra.genre)
      if (genreId && !item.genre_ids?.includes(genreId)) continue
    }

    // rating 3 zecimale doar pentru afișare
    const rating3 = parseFloat(rating.toFixed(3))

    metas.push({
      id: `tmdb:${item.id}`,
      type: catalog.typeFilter,
      name: catalog.typeFilter === "movie" ? item.title : item.name,
      poster: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
      imdbRating: rating3
    })
  }

  return {
    metas,
    cacheMaxAge: 3600,
    metasPerPage: 20,
    page: page,
    totalPages: base.total_pages || 1
  }
})

// ======== GENRE MAP (TMDb) ========
function getGenreId(genreName) {
  const map = {
    Action: 28,
    Adventure: 12,
    Animation: 16,
    Biography: 0,
    Comedy: 35,
    Crime: 80,
    Documentary: 99,
    Drama: 18,
    Family: 10751,
    Fantasy: 14,
    History: 36,
    Horror: 27,
    Mystery: 9648,
    Romance: 10749,
    "Sci-Fi": 878,
    Sport: 0,
    Thriller: 53,
    War: 10752,
    Western: 37
  }
  return map[genreName] || null
}

module.exports = builder
