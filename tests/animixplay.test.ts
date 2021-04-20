import { expect } from "chai";
import { AnimixPlay } from "../lib";
import * as fs from "fs";
import * as path from "path";
import { AnimixAnime, AnimixUnresolvedAnime } from "../lib/services/AnimixPlay";

describe("AnimixPlay test", () => {
	const animixPlay = new AnimixPlay();
	let unresolvedAnimes: AnimixUnresolvedAnime[];
	it("searching for Jujutsu Kaisen", async () => {
		unresolvedAnimes = await animixPlay.search("Jujutsu Kaisen");
		// dub, sub, and for some reason dr. stone
		expect(unresolvedAnimes).to.have.lengthOf(3);
	});
	let anime: AnimixAnime;
	it("get episodes of Jujutsu Kaisen", async () => {
		anime = await animixPlay.resolve(unresolvedAnimes[0]);
		expect(anime.episodes).to.have.lengthOf(24);
	});
	it("download first episode", done => {
		animixPlay.download(anime.episodes[0]).then(stream => {
			const file = path.join(__dirname, `out/${anime.episodes[0].name}.mp4`);
			stream.pipe(fs.createWriteStream(file)).on("finish", done);
		})
	}).timeout(1 * 60 * 1000);
})