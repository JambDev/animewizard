# animewizard
A Node.js interface for downloading anime. 
## animixplay.to
Usage
```js
const { AnimixPlay } = require("animewizard");

const animixPlay = new AnimixPlay();
(async () => {
    // search for animes
    let animes = await animixPlay.search("Jujutsu Kaisen");

    // get episodes of anime
    let anime = await animixPlay.resolve(animes[0]);
    console.log(anime.episodes);

    // download first episode
    let stream = await animixPlay.download(anime.episodes[0]);
    const fs = require("fs");
    stream.pipe(fs.createWriteStream(anime.episodes[0].name + ".mp4"));
})
```