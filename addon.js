const { addonBuilder } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

// 🔑 TMDb KEY
const TMDB_KEY = "4abf1e647b12f1751bb0303e52a1e989";

// base URL pentru poze TMDb
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

// limbi acceptate
const LANGUAGES = [
  "en","es","ca","fr","de","it","pt","ro",
  "sv","no","da","cs","pl","nl","el","sr"
];

const MIN_YEAR = 1980;
const CURRENT_YEAR = new Date().getFullYear();

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

// MANIFEST
const manifest = {
  id: "org.imdb.omdb.other.full",
  version: "3.1.0",
  name: "IMDb OMDb (Other) - TMDb",
  description: "Movies & Series by rating, genre, language & year (TMDb)",
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
};

const builder = new addonBuilder(manifest);

// TMDb genre mapping
const TMDB_GENRES = {
  "Action": 28,
  "Adventure": 12,
  "Animation": 16,
  "Biography": 1,
  "Comedy": 35,
  "Crime": 80,
  "Documentary": 99,
  "Drama": 18,
  "Family": 10751,
  "Fantasy": 14,
  "History": 36,
  "Horror": 27,
  "Mystery": 9648,
  "Romance": 10749,
  "Sci-Fi": 878,
  "Sport": 10762,
  "Thriller": 53,
  "War": 10752,
  "Western": 37
};

async function fetchFromTMDb(type, genre, minRating, maxRating, pages = 2) {
  const kind = type === "movie" ? "movie" : "tv";
  const results = [];
  const dateField = type === "movie"
    ? "primary_release_date"
    : "first_air_date";

  for (const lang of LANGUAGES) {
    for (let page = 1; page <= pages; page++) {
      const url = new URL(`https://api.themoviedb.org/3/discover/${kind}`);
      url.searchParams.set("api_key", TMDB_KEY);
      url.searchParams.set("language", "en-US");
      url.searchParams.set("sort_by", "vote_average.desc");
      url.searchParams.set("vote_count.gte", "150");
      url.searchParams.set("vote_average.gte", String(minRating));
      url.searchParams.set("vote_average.lt", String(maxRating));
      url.searchParams.set("with_original_language", lang);
      url.searchParams.set(`${dateField}.gte`, `${MIN_YEAR}-01-01`);
      url.searchParams.set(`${dateField}.lte`, `${CURRENT_YEAR}-12-31`);
      url.searchParams.set("page", String(page));

      if (genre && TMDB_GENRES[genre]) {
        url.searchParams.set("with_genres", String(TMDB_GENRES[genre]));
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(url.toString(), { signal: controller.signal });
        if (!res.ok) continue;

        const json = await res.json();
        results.push(...(json.results || []));

      } catch (e) {
        continue;
      } finally {
        clearTimeout(timeout);
      }
    }
  }

  return results;
}

builder.defineCatalogHandler(async ({ id, extra }) => {
  const catalog = manifest.catalogs.find(c => c.id === id);
  if (!catalog) return { metas: [] };

  const genre = extra?.genre || null;

  const base = await fetchFromTMDb(
    catalog.typeFilter,
    genre,
    catalog.ratingMin,
    catalog.ratingMax,
    2
  );

  const seen = new Set();

  const metas = base
    .filter(item => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .map(item => {
      const rating = parseFloat(item.vote_average);
      return {
        id: catalog.typeFilter === "movie"
          ? `tmdb:movie:${item.id}`
          : `tmdb:tv:${item.id}`,
        type: catalog.typeFilter,
        name: catalog.typeFilter === "movie" ? item.title : item.name,
        poster: item.poster_path
          ? `${TMDB_IMAGE_BASE}${item.poster_path}`
          : null,
        imdbRating: parseFloat(rating.toFixed(3))
      };
    });

  return { metas };
});

module.exports = builder;
