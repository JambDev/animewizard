import got from "got/dist/source";
import AnimeService, { Anime, AnimeEpisode, UnresolvedAnime } from "./animeservice";
import { JSDOM } from "jsdom";
import Request from "got/dist/source/core";
type AnimixAPISearchResponse = { result: string };
type AnimixEpisodeList = { [episodeNumber: string]: string } & { eptotal: number };

export interface AnimixUnresolvedAnime extends UnresolvedAnime {
	url: string;
}

export interface AnimixEpisode extends AnimeEpisode {
	url: string;
}

export interface AnimixAnime extends AnimixUnresolvedAnime {
	episodes: AnimixEpisode[]
}

const AnimixPlayURL = "https://animixplay.to";
const CDN = "https://cdn.animixplay.to";

export default class AnimixPlay extends AnimeService {
	public async search(keywords: string): Promise<AnimixUnresolvedAnime[]> {
		let { body }: { body: AnimixAPISearchResponse } = await got.post(CDN + "/api/search", {
			form: {
				"qfast": keywords
			},
			responseType: 'json'
		});
		let dom = new JSDOM(body.result);
		let document = dom.window.document;
		let animes = document.querySelectorAll("li");
		let unresolvedAnimes: AnimixUnresolvedAnime[] = [];
		for (let elem of animes)
			unresolvedAnimes.push({
				name: elem.querySelector(".name")?.textContent as string,
				url: elem.querySelector(".searchimg")?.querySelector("a")?.getAttribute("href") as string,
			});
		return unresolvedAnimes;
	}

	public async resolve(anime: AnimixUnresolvedAnime): Promise<AnimixAnime> {
		let { body } = await got(AnimixPlayURL + anime.url);
		let dom = new JSDOM(body);
		let document = dom.window.document;
		let eps: AnimixEpisodeList = JSON.parse(document.querySelector("#epslistplace")?.textContent as string);
		let episodes: AnimixEpisode[] = [];
		for (let epNumber in eps) {
			if (epNumber === "eptotal") continue;
			let epContent = eps[epNumber];
			episodes.push({
				episodeNumber: parseInt(epNumber),
				name: decodeURIComponent(epContent.slice(epContent.indexOf("title=") + "title=".length).replace(/\+/g, '%20')),
				url: epContent,
			});
		}
		return { ...anime, episodes };
	}

	public async download(episode: AnimixEpisode): Promise<Request> {
		let episodeStr = episode.url;

		let episodeID = episodeStr.slice(episodeStr.indexOf("?id=") + 4, episodeStr.indexOf("&"));
		let videoDataURL = AnimixPlayURL + "/api/live" + Buffer.from(episodeID + "LTXs3GrU8we9O" + Buffer.from(episodeID).toString('base64')).toString('base64');

		let { body } = await got(videoDataURL);
		let dom = new JSDOM(body);
		let document = dom.window.document;
		let targetURL: string | null = null;
		for (let scriptElem of document.querySelectorAll("script")) {
			let script = scriptElem.innerHTML.trim();
			if(!script.startsWith("var video=")) continue;
			targetURL = script.slice(script.indexOf("video=") + "video=".length + 1, script.indexOf(`",`));
		}
		if(!targetURL)
			throw "failed to retrieve video url";
		return got.stream(targetURL);
	}
}