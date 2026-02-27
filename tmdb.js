// tmdb.js - TMDB API (포스터 + 상세정보 + 장르)

import { CONFIG } from './config.js';
import { loadFromStorage, saveToStorage } from './utils/cache.js';

const memCache = {};

export async function fetchMovieBasic(title) {
  const cacheKey = `tmdb_basic_${title}`;
  if (memCache[cacheKey] !== undefined) return memCache[cacheKey];

  const disk = loadFromStorage(CONFIG.posterCacheKey) || {};
  if (disk[title] !== undefined) {
    memCache[cacheKey] = disk[title];
    return disk[title];
  }

  try {
    const q = encodeURIComponent(title);
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${CONFIG.tmdbKey}&query=${q}&language=ko-KR&page=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const movie = data.results?.[0];
    const result = movie ? {
      id: movie.id,
      poster_path: movie.poster_path || null,
      vote_average: movie.vote_average || null,
      genres: movie.genre_ids || [],
    } : null;

    memCache[cacheKey] = result;
    disk[title] = result;
    saveToStorage(CONFIG.posterCacheKey, disk);
    return result;
  } catch {
    memCache[cacheKey] = null;
    return null;
  }
}

export async function fetchMovieDetail(movieId) {
  if (!movieId) return null;
  const cacheKey = `tmdb_detail_${movieId}`;
  if (memCache[cacheKey] !== undefined) return memCache[cacheKey];

  const detailCache = loadFromStorage(CONFIG.detailCacheKey) || {};
  if (detailCache[movieId] !== undefined) {
    memCache[cacheKey] = detailCache[movieId];
    return detailCache[movieId];
  }

  try {
    // 영화 상세정보(장르 포함) + 크레딧 동시 요청
    const [detailRes, creditsRes] = await Promise.all([
      fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${CONFIG.tmdbKey}&language=ko-KR`),
      fetch(`https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${CONFIG.tmdbKey}&language=ko-KR`)
    ]);

    const detailData = detailRes.ok ? await detailRes.json() : {};
    const creditsData = creditsRes.ok ? await creditsRes.json() : {};

    const director = creditsData.crew?.find(c => c.job === 'Director')?.name || null;
    const cast = creditsData.cast?.slice(0, 3).map(c => c.name) || [];
    const genres = detailData.genres?.slice(0, 3).map(g => g.name) || [];

    const result = { director, cast, genres };
    memCache[cacheKey] = result;
    detailCache[movieId] = result;
    saveToStorage(CONFIG.detailCacheKey, detailCache);
    return result;
  } catch {
    memCache[cacheKey] = null;
    return null;
  }
}

export async function loadMovieInfoToCard(cardEl, title) {
  const basic = await fetchMovieBasic(title);
  if (!basic) return;

  // 포스터
  if (basic.poster_path) {
    const imgEl = cardEl.querySelector('.poster-img');
    const placeholderEl = cardEl.querySelector('.poster-placeholder');
    if (imgEl) {
      imgEl.src = CONFIG.tmdbImg + basic.poster_path;
      imgEl.style.display = 'block';
      if (placeholderEl) placeholderEl.style.display = 'none';
    }
  }

  // 평점
  if (basic.vote_average) {
    const ratingEl = cardEl.querySelector('.movie-rating');
    if (ratingEl) {
      ratingEl.textContent = `★ ${basic.vote_average.toFixed(1)}`;
      ratingEl.style.display = 'inline';
    }
  }

  // 감독 + 출연진 + TMDB 장르 태그
  const detail = await fetchMovieDetail(basic.id);
  if (detail) {
    if (detail.director) {
      const directorEl = cardEl.querySelector('.movie-director');
      if (directorEl) {
        directorEl.textContent = `감독  ${detail.director}`;
        directorEl.style.display = 'block';
      }
    }
    if (detail.cast?.length) {
      const castEl = cardEl.querySelector('.movie-cast');
      if (castEl) {
        castEl.textContent = `출연  ${detail.cast.join(', ')}`;
        castEl.style.display = 'block';
      }
    }
    if (detail.genres?.length) {
      const keywordsEl = cardEl.querySelector('.movie-keywords');
      if (keywordsEl) {
        keywordsEl.innerHTML = detail.genres
          .map(g => `<span class="tag tag-keyword">${g}</span>`)
          .join('');
        keywordsEl.style.display = 'flex';
      }
    }
  }
}
