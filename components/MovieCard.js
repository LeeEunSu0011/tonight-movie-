// components/MovieCard.js

import { AgeBadge } from './AgeBadge.js';
import { loadMovieInfoToCard } from '../tmdb.js';

export function MovieCard(p, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.style.animationDelay = `${index * 60}ms`;

  const hasRealPlot = p.plot && p.plot !== p.title && !p.plot.match(/^\s*\d+회\s*$/);
  const plotHtml = hasRealPlot ? `<div class="plot">${p.plot}</div>` : '';
  const runtimeHtml = p.runtimeMin ? `<div class="runtime">⏱ ${p.runtimeMin}분</div>` : '';

  // 장르 태그 (항상 첫 번째, 골드색)
  const genreSkip = new Set(['Movie / Drama']);
  const genres = (p.genres || []).filter(g => !genreSkip.has(g)).slice(0, 2);
  const genreHtml = genres.map(g => `<span class="tag tag-genre">${g}</span>`).join('');

  card.innerHTML = `
    <div class="card-inner">
      <div class="poster-wrap">
        <img class="poster-img" src="" alt="${p.title}" style="display:none" loading="lazy" />
        <div class="poster-placeholder">🎬</div>
      </div>
      <div class="card-body">
        <div class="time-row">
          <span class="time">${p.start}${p.end ? ` ~ ${p.end}` : ''}</span>
          <span class="channel-badge">${p.channel}</span>
        </div>
        <div class="title-row">
          <span class="title">${p.title}</span>
          ${AgeBadge(p.age)}
          <span class="movie-rating" style="display:none"></span>
        </div>
        <div class="movie-meta">
          <span class="movie-director" style="display:none"></span>
          <span class="movie-cast" style="display:none"></span>
        </div>
        <div class="tags">
          ${genreHtml}
          <span class="movie-keywords" style="display:none; gap:6px; flex-wrap:wrap;"></span>
        </div>
        ${plotHtml}
        ${runtimeHtml}
      </div>
    </div>
  `;

  loadMovieInfoToCard(card, p.title);

  return card;
}
