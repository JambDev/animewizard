import Request from "got/dist/source/core";

export interface AnimeEpisode {
    name: string;
    episodeNumber: number;
}

export interface UnresolvedAnime {
    name: string;
}

export interface Anime extends UnresolvedAnime {
    episodes: AnimeEpisode[];
}

export default abstract class AnimeService {
    /** Searches for animes */
    public abstract search(keywords: string): Promise<UnresolvedAnime[]>;

    /** Fetches the episodes for an anime */
    public abstract resolve(anime: UnresolvedAnime): Promise<Anime>;
    
    /** Downloads episode from anime */
    public abstract download(episode: AnimeEpisode): Promise<Request>;
}