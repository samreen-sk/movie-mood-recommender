// ======= CONFIG =======
const API_KEY = '250b880f1323b93f616c1ed11e892e31'; // <-- PUT your TMDb API KEY here (or leave blank to use fallback)
const posterBase = 'https://image.tmdb.org/t/p/w342';

// Map moods -> TMDb genre IDs
// Map moods -> TMDb genre IDs
// Map moods -> TMDb genre IDs
// Map moods -> TMDb genre IDs
const moodGenres = {
  happy: [35],                // Comedy
  sad: [18, 10751],           // Drama + Family
  inspired: [12, 28, 14],     // Adventure, Action, Fantasy
  love: [10749, 10751, 35],   // Romance + Family + Comedy (cleaner)
  thriller: [53]              // Thriller
};



// Simple fallback list (used when no API key provided)
const fallbackMovies = [
  { id: 9001, title: "Amélie", poster_path: null, vote_average: 8.3 },
  { id: 9002, title: "The Intouchables", poster_path: null, vote_average: 8.5 },
  { id: 9003, title: "The Grand Budapest Hotel", poster_path: null, vote_average: 8.1 },
  { id: 9004, title: "La La Land", poster_path: null, vote_average: 8.0 },
  { id: 9005, title: "Inception", poster_path: null, vote_average: 8.7 }
];

// ======= DOM =======
const movieContainer = document.getElementById('movieContainer');
const moodButtons = document.querySelectorAll('.mood-btn');
const watchlistBtn = document.getElementById('watchlistBtn');
const watchCount = document.getElementById('watchCount');
const watchlistModal = document.getElementById('watchlistModal');
const watchlistItems = document.getElementById('watchlistItems');

// ======= STATE =======
let watchlist = JSON.parse(localStorage.getItem('watchlist') || '[]');

// ======= HELPERS =======
function showToast(msg){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(()=> t.classList.add('visible'));
  setTimeout(()=> t.classList.remove('visible'), 1800);
  setTimeout(()=> t.remove(), 2400);
}
function escapeHtml(s){ return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : ''; }
function updateWatchCount(){ watchCount.textContent = watchlist.length; }

// ======= MOOD VISUALS =======
const moodGradients = {
  happy: 'linear-gradient(135deg,#FFE29F,#FFA99F)',       // warm sunshine
  sad: 'linear-gradient(135deg,#cfd9df,#e2ebf0)',         // soft grey-blue
  inspired: 'linear-gradient(135deg,#a8edea,#fed6e3)',    // mint + peach
  love: 'linear-gradient(135deg,#fbc2eb,#fde2e4)',        // soft pink + blush
  thriller: 'linear-gradient(135deg,#d7d2cc,#f8f9d2)'     // light grey + pale yellow
};

function setMoodBackground(mood){
  document.body.style.background = moodGradients[mood] || '';
}

// ======= FETCH / RENDER =======
async function fetchMoviesByMood(mood){
  movieContainer.innerHTML = '<div class="loader">Loading movies…</div>';
  try{
    let movies = [];
    if(API_KEY && API_KEY.trim()){
      const genreIds = moodGenres[mood].join(',');
      let allResults = [];

      // fetch multiple pages (40 movies total)
      for(let page=1; page<=2; page++){
        const url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&with_genres=${genreIds}&sort_by=popularity.desc&language=en-US&include_adult=false&page=${page}`;
        const res = await fetch(url);
        const data = await res.json();
        allResults = allResults.concat(data.results || []);
      }

      // 🔒 Extra filtering:
      movies = allResults
        .filter(m => !m.adult) // filter explicit
        .filter(m => {
          // keywords check (title filtering for safety)
          const badWords = ["erotic","porn","sex","nude","xxx","lust","adult","desire"];
          const t = (m.title || "").toLowerCase();
          return !badWords.some(word => t.includes(word));
        })
        .slice(0,35);

    } else {
      movies = fallbackMovies;
    }
    renderMovies(movies);
  } catch(err){
    console.error(err);
    movieContainer.innerHTML = '<div class="empty">Could not load movies. Try again later.</div>';
  }
}


function renderMovies(movies){
  if(!movies || movies.length === 0){
    movieContainer.innerHTML = '<div class="empty">No movies found for this mood.</div>';
    return;
  }
  movieContainer.innerHTML = movies.map(m => {
    const poster = m.poster_path ? (posterBase + m.poster_path) : `https://via.placeholder.com/342x513?text=${encodeURIComponent(m.title)}`;
    const rating = m.vote_average ? Number(m.vote_average).toFixed(1) : '—';
    return `
      <article class="movie-card" data-id="${m.id}">
        <img class="poster" src="${poster}" alt="${escapeHtml(m.title)} poster" loading="lazy">
        <div class="info">
          <h3>${escapeHtml(m.title)}</h3>
          <div class="meta">
            <span class="rating">⭐ ${rating}</span>
            <button class="watch-btn ${isInWatchlist(m.id) ? 'remove' : ''}" data-id="${m.id}">
  ${isInWatchlist(m.id) ? 'Remove' : '➕ Watch'}
</button>

          </div>
        </div>
      </article>
    `;
  }).join('');

  // attach watch buttons
  document.querySelectorAll('.watch-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = Number(btn.dataset.id);
      const movieEl = btn.closest('.movie-card');
      // find movie data from DOM or fallback: simplest approach: build a minimal movie object
      const title = movieEl.querySelector('h3').textContent;
      const img = movieEl.querySelector('img').src;
      const ratingText = movieEl.querySelector('.rating').textContent.replace('⭐','').trim();
      const movieObj = { id, title, poster_path: img.startsWith('http') ? img : null, vote_average: ratingText };
      toggleWatchlist(movieObj, btn);
    });
  });
}

function isInWatchlist(id){
  return watchlist.some(m => m.id === id);
}

function toggleWatchlist(movie, btn){
  if(isInWatchlist(movie.id)){
    watchlist = watchlist.filter(m => m.id !== movie.id);
    btn.textContent = '➕ Watch';
    btn.classList.remove('remove');
    showToast('Removed from watchlist');
  } else {
    watchlist.push({ id: movie.id, title: movie.title, poster_path: movie.poster_path, vote_average: movie.vote_average });
    btn.textContent = 'Remove';
    btn.classList.add('remove');
    showToast('Added to watchlist');
  }
  localStorage.setItem('watchlist', JSON.stringify(watchlist));
  updateWatchCount();
}


// ===== Watchlist modal =====
function renderWatchlist(){
  if(watchlist.length === 0){
    watchlistItems.innerHTML = '<p class="empty">Your watchlist is empty.</p>';
    return;
  }
  watchlistItems.innerHTML = watchlist.map(m => {
    const img = m.poster_path && m.poster_path.startsWith('http') ? m.poster_path : `https://via.placeholder.com/80x120?text=${encodeURIComponent(m.title)}`;
    return `
      <div class="wl-item">
        <img src="${img}" alt="${escapeHtml(m.title)}">
        <div style="flex:1">
          <h4 style="margin:0 0 6px">${escapeHtml(m.title)}</h4>
          <button class="rm" data-id="${m.id}">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  // attach remove handlers
  document.querySelectorAll('#watchlistItems .rm').forEach(b => {
    b.addEventListener('click', () => {
      const id = Number(b.dataset.id);
      watchlist = watchlist.filter(x => x.id !== id);
      localStorage.setItem('watchlist', JSON.stringify(watchlist));
      updateWatchCount();
      renderWatchlist();
    });
  });
}

// ===== UI wiring =====
moodButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    moodButtons.forEach(b => b.classList.remove('active'));
    moodButtons.forEach(b => b.setAttribute('aria-pressed','false'));
    btn.classList.add('active');
    btn.setAttribute('aria-pressed','true');
    const mood = btn.dataset.mood;
    setMoodBackground(mood);
    fetchMoviesByMood(mood);
  });
});

// watchlist open/close
watchlistBtn.addEventListener('click', () => {
  watchlistModal.style.display = 'flex';
  watchlistModal.setAttribute('aria-hidden','false');
  renderWatchlist();
});
document.querySelector('.modal .close').addEventListener('click', () => {
  watchlistModal.style.display = 'none';
  watchlistModal.setAttribute('aria-hidden','true');
});
watchlistModal.addEventListener('click', (e) => {
  if(e.target === watchlistModal){
    watchlistModal.style.display = 'none';
    watchlistModal.setAttribute('aria-hidden','true');
  }
});

// init
updateWatchCount();
if(moodButtons.length) moodButtons[0].click();


// ===== Cursor Animation =====
const cursorDot = document.querySelector('.cursor-dot');
const cursorOutline = document.querySelector('.cursor-outline');

window.addEventListener('mousemove', e => {
  const { clientX: x, clientY: y } = e;
  cursorDot.style.transform = `translate(${x}px, ${y}px)`;
  cursorOutline.style.transform = `translate(${x}px, ${y}px)`;
});

// Landing page elements
const landingPage = document.getElementById('landingPage');
const mainPage = document.getElementById('mainPage');
const moodSelect = document.getElementById('moodSelect');
const goMoodBtn = document.getElementById('goMoodBtn');

goMoodBtn.addEventListener('click', () => {
  const selectedMood = moodSelect.value;

  // Fade-out landing
  landingPage.style.opacity = '0';
  setTimeout(() => {
    landingPage.style.display = 'none';

    // Show main page
    mainPage.style.display = 'block';
    mainPage.style.opacity = '0';
    setTimeout(() => mainPage.style.opacity = '1', 50);

    // Load movies for chosen mood
    setMoodBackground(selectedMood);
    fetchMoviesByMood(selectedMood);
  }, 600);
});

