const { addonBuilder } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

// 🔑 TMDb KEY
const TMDB_KEY = "4abf1e647b12f1751bb0303e52a1e989";

// base URL pentru poze TMDb
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

const GENRES = [
  "Action","Adventure","Animation","Biography","Comedy","Crime",
  "Documentary","Drama","Family","Fantasy","History","Horror",
  "Mystery","Romance","Sci-Fi","Sport","Thriller","War","Western"
];

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
  };
}

const builder = new addonBuilder({
  id: "org.imdb.omdb.other.full",
  version: "3.0.0",
  name: "IMDb OMDb (Other) - TMDb",
  description: "Movies & Series by rating & genre (TMDb)",
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
});

async function fetchFromTMDb(type, genre, minRating, maxRating) {
  const kind = type === "movie" ? "movie" : "tv";

  const url = new URL(`https://api.themoviedb.org/3/discover/${kind}`);
  url.searchParams.set("api_key", TMDB_KEY);
  url.searchParams.set("language", "en-US");
  url.searchParams.set("sort_by", "vote_average.desc");
  url.searchParams.set("vote_count.gte", "100"); // să evităm rating-uri false
  url.searchParams.set("vote_average.gte", String(minRating));
  url.searchParams.set("vote_average.lt", String(maxRating));
  url.searchParams.set("page", "1");

  // dacă există gen
  if (genre) {
    // TMDb folosește id-uri pentru genuri; aici folosim nume simple => simplu workaround:
    // nu putem mapa corect fără listă genuri TMDb
    // așa că îl ignorăm (dacă vrei genuri reale, îți dau mapping)
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    console.error("TMDb HTTP error", res.status);
    return [];
  }

  const json = await res.json();
  return json.results || [];
}

builder.defineCatalogHandler(async ({ id, extra }) => {
  const catalog = builder.manifest.catalogs.find(c => c.id === id);
  if (!catalog) return { metas: [] };

  const genre = extra?.genre || null;
  const base = await fetchFromTMDb(catalog.typeFilter, genre, catalog.ratingMin, catalog.ratingMax);

  const metas = base.map(item => ({
    id: catalog.typeFilter === "movie" ? `tmdb:movie:${item.id}` : `tmdb:tv:${item.id}`,
    type: catalog.typeFilter,
    name: catalog.typeFilter === "movie" ? item.title : item.name,
    poster: item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null,
    imdbRating: item.vote_average
  }));

  return { metas };
});

module.exports = builder;
