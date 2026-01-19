const { addonBuilder } = require("stremio-addon-sdk");
const fetch = require("node-fetch");

const OMDB_KEY = process.env.OMDB_KEY;

const genres = [
  "Action","Adventure","Animation","Biography","Comedy","Crime","Documentary", "Drama", "Family","Fantasy","History", "Horror","Mystery","Romance", "Sci-Fi","Sport" , "Thriller" , "War" ,"Western"
];

const ratings = [
  { id: "6-7", min: 6, max: 7 },
  { id: "7-8", min: 7, max: 8 },
  { id: "8-9", min: 8, max: 9 },
  { id: "9-10", min: 9, max: 10 }
];

const builder = new addonBuilder({
  id: "org.imdb.omdb.catalog.v2",
  version: "2.0.0",
  name: "IMDb OMDb 6+ Movies & Series",
  description: "Movies & Series IMDb 6+ with Rating and Genre filters",
  resources: ["catalog"],
  types: ["movie", "series"],
  catalogs: [
    {
      type: "movie",
      id: "movies6",
      name: "Movies 6+",
      extra: [
        { name: "rating", options: ratings.map(r => r.id) },
        { name: "genre", options: genres }
      ]
    },
    {
      type: "series",
      id: "series6",
      name: "Series 6+",
      extra: [
        { name: "rating", options: ratings.map(r => r.id) },
        { name: "genre", options: genres }
      ]
    }
  ]
});

builder.defineCatalogHandler(async ({ type, extra }) => {
  const ratingFilter = ratings.find(r => r.id === extra.rating) || ratings[0];
  const genre = extra.genre || "";

  const url = `https://www.omdbapi.com/?apikey=${OMDB_KEY}&s=${genre || "the"}&type=${type}`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.Search) return { metas: [] };

  const metas = [];

  for (const item of data.Search) {
    const detailRes = await fetch(
      `https://www.omdbapi.com/?apikey=${OMDB_KEY}&i=${item.imdbID}`
    );
    const details = await detailRes.json();

    const imdb = parseFloat(details.imdbRating);
    if (isNaN(imdb)) continue;

    if (imdb >= ratingFilter.min && imdb < ratingFilter.max) {
      metas.push({
        id: details.imdbID,
        type,
        name: details.Title,
        poster: details.Poster !== "N/A" ? details.Poster : null,
        imdbRating: imdb,
        releaseInfo: details.Year
      });
    }
  }

  return { metas };
});

module.exports = builder.getInterface();
