const { off } = require("process");
const config = require("./config.json");
const SpotifyWebApi = require("spotify-web-api-node");
const util = require("util");
const fs = require("fs");
const { promises } = require("dns");

const {
  values: { output, playlist, all_artists },
} = util.parseArgs({
  options: {
    output: {
      type: "string",
      short: "o",
    },
    playlist: {
      type: "string",
      short: "p",
    },
    all_artists: {
      type: "boolean",
      short: "a",
    },
  },
});

let error = false;

if (!config.clientId) {
  console.error(`The clientID is missing from the config.json file`);
  error = true;
}

if (!config.clientSecret) {
  console.error(`The clientSecret is missing from the config.json file`);
  error = true;
}

if (!output) {
  console.error(`An output file location (-o=<file>) is required!`);
  error = true;
}

if (!playlist) {
  console.error(`A playlist (-p=<id>) is required!`);
  error = true;
}

if (error) {
  process.exit(1);
}

const spotifyApi = new SpotifyWebApi(config);

let resolveAllTracks = (trackCount) => {
  let offsets = Math.floor(trackCount / 100);
  let promises = [];

  for (let i = 0; i <= offsets; i++) {
    promises.push(
      spotifyApi.getPlaylistTracks(playlist, {
        offset: 0 + i * 100,
      })
    );
  }
  return Promise.all(promises);
};

let resolveAllAlbums = (artistId, albumCount) => {
  let offsets = Math.floor(albumCount / 20);
  let promises = [];

  for (let i = 0; i <= offsets; i++) {
    promises.push(
      spotifyApi.getArtistAlbums(artistId, {
        offset: 0 + i * 20,
      })
    );
  }
  return Promise.all(promises);
};

let resolveAllArtistsAlbums = (artistIDs) => {
  let promises = [];
  artistIDs.forEach((artistID) =>
    promises.push(
      spotifyApi
        .getArtistAlbums(artistID)
        .then((response) => resolveAllAlbums(artistID, response.body.total))
        .then((response) => {
          return new Promise((resolve) => {
            // console.log(response)
            resolve(response.flatMap((res) => res.body.items));
          });
        })
    )
  );
  return Promise.all(promises);
};

spotifyApi
  .clientCredentialsGrant()
  .then(
    (data) => {
      spotifyApi.setAccessToken(data.body.access_token);
    },
    (err) => {
      if (err.statusCode == 401) {
        console.error(
          "It looks like you forgot to set you client token and secret!"
        );
        console.error("They can be set in the config.json file");
      } else {
        console.error("An unknown error was encountered:");
        console.error(err);
      }
    }
  )
  .then(() => {
    spotifyApi
      .getPlaylistTracks(playlist)
      .then(
        (data) => {
          return resolveAllTracks(data.body.total);
        },
        (err) => {
          if (err.statusCode == 404) {
            console.error(
              `The specified playlist with ID: ${playlist} could not be found`
            );
          }
        }
      )
      .then((allTracks) => {
        if (!all_artists) {
          const uniqAlbumsIDs = [
            ...new Set(
              allTracks.flatMap((response) => {
                return response.body.items.map((track) => track.track.album.id);
              })
            ),
          ].sort();
          fs.writeFileSync(output, uniqAlbumsIDs.join("\n"));
          console.log(`Done writing ${uniqAlbumsIDs.length} unique album IDs`);
          process.exit(0);
        } else {
          const uniqArtistIDs = [
            ...new Set(
              allTracks.flatMap((response) => {
                return response.body.items.flatMap((track) =>
                  track.track.artists.map((artist) => {
                    return artist.id;
                  })
                );
              })
            ),
          ];
          return resolveAllArtistsAlbums(uniqArtistIDs);
        }
      })
      .then((allArtistsAlbums) => {
        const uniqAlbumsIDs = [
          ...new Set(
            allArtistsAlbums.flatMap((albums) =>
              albums.flatMap((album) => album.id)
            )
          ),
        ].sort();
        fs.writeFileSync(output, uniqAlbumsIDs.join("\n"));
        console.log(`Done writing ${uniqAlbumsIDs.length} unique album IDs`);
        process.exit(0);
      });
  });
