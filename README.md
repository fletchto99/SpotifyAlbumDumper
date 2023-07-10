# SpotifyAlbumDumper

I wrote this so that I can dump albums from a spotify playlist to then use [a-tisket](https://atisket.pulsewidth.org.uk/) to import albums into musicbrainz.

### Usage

Take a spotify playlist ID and convert it to a list of albums for the tracks in said playlist.

#### Required Parameters

`--playlist <id>` or `-p <id>`- The ID of the playlist you wish to parse
`--output <file>` or `-o <file>`- The location you wish to output the metadata

#### Optional Parameters

`--all-artists` or `-a` - If set, it will find all the albums for all the artists in the playlist, not just the albums for the tracks in the playlist.