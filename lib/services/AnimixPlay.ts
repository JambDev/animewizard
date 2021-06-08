import got from "got/dist/source";
import AnimeService, { Anime, AnimeEpisode, UnresolvedAnime } from "./animeservice";
import { JSDOM } from "jsdom";
import Request from "got/dist/source/core";
type AnimixAPISearchResponse = { result: string };
type AnimixEpisodeList = { [episodeNumber: string]: string } & { eptotal: number };
interface AnimixVideoConfig { [key: string]: string | undefined, video: string, backup: string, useiframe: string, iframesrc: string, error: string, useajax: string };
interface StreamAniResponse {
	advertising: any[],
	linkiframe: string,
	source: [{ file: string, label: string, type: string }],
	source_bk: [{ file: string, label: string, type: string }],
	track: any[]
}

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
			let epName = decodeURIComponent(epContent.slice(epContent.indexOf("title=") + "title=".length).replace(/\+/g, '%20'));
			if (epName.startsWith("//"))
				continue;
			if (epName.includes("&typesub="))
				epName = epName.slice(0, -"&typesub=DUB".length);
			episodes.push({
				episodeNumber: parseInt(epNumber),
				name: epName,
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
			if (!script.startsWith("var video=")) continue;
			// honestly i'm horrible with regex but im proud of this
			let VarPattern = /\w+="([^"]?)+"/g;
			let varStrs = script.match(VarPattern);
			if (!varStrs) continue;
			let variables: AnimixVideoConfig = {} as AnimixVideoConfig;
			for (let varStr of varStrs) {
				variables[varStr.slice(0, varStr.indexOf("="))] = JSON.parse(varStr.slice(varStr.indexOf("=") + 1));
			}
			if (variables.video.length !== 0)
				targetURL = variables.video;
			else if (variables.iframesrc.length !== 0) {
				// https://streamani.net/ajax.php?id=VIDEO_ID&refer=none
				let name = variables.iframesrc;
				let isolatedID = name.substr(0, name.indexOf("&"));
				let ajaxRes = await got("https://streamani.net/ajax.php?id=" + isolatedID);
				let objRes: StreamAniResponse = JSON.parse(ajaxRes.body);
				let checkSources = async (useBak = false) => {
					for (let source of useBak?objRes.source:objRes.source_bk) {
						// check if its valid by sending a HEAD request
						let headReq = await got(source.file, {
							method: "HEAD",
							followRedirect: true,
						});
						if(headReq.statusCode === 200) {
							targetURL = source.file;
							break;
						}
					}
				};
				await checkSources(false);
				if (!targetURL) await checkSources(true);
			}
			// TODO: "backup" property
		}
		if (!targetURL)
			throw "failed to retrieve video url";
		return got.stream(targetURL);
	}
}