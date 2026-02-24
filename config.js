// config.js - 설정 파일 (gitignore, 서버에서만 관리)

export const CONFIG = {
  dataUrl: './data.json',
  cacheKey: 'epg_cache_v11',
  posterCacheKey: 'poster_cache_v3',
  detailCacheKey: 'detail_cache_v1',
  cacheAgeMin: 30,
  updateSchedule: [0, 6, 12, 18],
  tmdbKey: '0a3e13faef62e13445d8744883186dbb',
  tmdbImg: 'https://image.tmdb.org/t/p/w200',
};
