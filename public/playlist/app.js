// --- BEATPORT GENRES LIST ---
const BEATPORT_GENRES = [
    {"id": 0, "name": "Tous les genres (All)", "slug": "all"},
    {"id": 89, "name": "Afro House", "slug": "afro-house"},
    {"id": 90, "name": "Melodic House & Techno", "slug": "melodic-house-techno"},
    {"id": 96, "name": "Mainstage", "slug": "mainstage"},
    {"id": 12, "name": "Deep House", "slug": "deep-house"},
    {"id": 11, "name": "Tech House", "slug": "tech-house"},
    {"id": 15, "name": "Progressive House", "slug": "progressive-house"},
    {"id": 14, "name": "Minimal / Deep Tech", "slug": "minimal-deep-tech"},
    {"id": 6, "name": "Techno (Peak / Driving)", "slug": "techno-peak-time-driving"},
    {"id": 92, "name": "Techno (Raw / Deep / Hypnotic)", "slug": "techno-raw-deep-hypnotic"},
    {"id": 2, "name": "Hard Techno", "slug": "hard-techno"},
    {"id": 5, "name": "House", "slug": "house"},
    {"id": 93, "name": "Organic House", "slug": "organic-house"},
    {"id": 98, "name": "Amapiano", "slug": "amapiano"},
    {"id": 1, "name": "Drum & Bass", "slug": "drum-bass"},
    {"id": 7, "name": "Trance (Main Floor)", "slug": "trance-main-floor"},
    {"id": 99, "name": "Trance (Raw / Deep / Hypnotic)", "slug": "trance-raw-deep-hypnotic"},
    {"id": 13, "name": "Psy-Trance", "slug": "psy-trance"},
    {"id": 9, "name": "Breaks / Breakbeat / UK Bass", "slug": "breaks-breakbeat-uk-bass"},
    {"id": 86, "name": "UK Garage / Bassline", "slug": "uk-garage-bassline"},
    {"id": 91, "name": "Bass House", "slug": "bass-house"},
    {"id": 81, "name": "Funky House", "slug": "funky-house"},
    {"id": 85, "name": "Bass / Club", "slug": "bass-club"},
    {"id": 3, "name": "Electronica", "slug": "electronica"},
    {"id": 37, "name": "Indie Dance", "slug": "indie-dance"},
    {"id": 38, "name": "Trap / Future Bass", "slug": "trap-future-bass"},
    {"id": 39, "name": "Dance / Pop", "slug": "dance-pop"},
    {"id": 50, "name": "Nu Disco / Disco", "slug": "nu-disco-disco"},
    {"id": 63, "name": "Downtempo", "slug": "downtempo"},
    {"id": 94, "name": "Electro (Classic / Detroit / Modern)", "slug": "electro-classic-detroit-modern"},
    {"id": 95, "name": "140 / Deep Dubstep / Grime", "slug": "140-deep-dubstep-grime"},
    {"id": 97, "name": "Jackin House", "slug": "jackin-house"},
    {"id": 100, "name": "Ambient / Experimental", "slug": "ambient-experimental"},
    {"id": 101, "name": "Brazilian Funk", "slug": "brazilian-funk"},
    {"id": 102, "name": "African", "slug": "african"},
    {"id": 103, "name": "Caribbean", "slug": "caribbean"},
    {"id": 104, "name": "Country", "slug": "country"},
    {"id": 105, "name": "Hip-Hop", "slug": "hip-hop"},
    {"id": 8, "name": "Hard Dance / Hardcore", "slug": "hard-dance-hardcore-neo-rave"},
    {"id": 18, "name": "Dubstep", "slug": "dubstep"},
    {"id": 16, "name": "DJ Tools / Acapellas", "slug": "dj-tools-acapellas"}
];

// Sort genres alphabetically for UI display, keeping All and Afro House at the top
const sortedGenresForDropdown = [...BEATPORT_GENRES].sort((a, b) => {
    if (a.id === 0) return -1;
    if (b.id === 0) return 1;
    if (a.id === 89) return -1;
    if (b.id === 89) return 1;
    return a.name.localeCompare(b.name);
});

// --- APP STATE ---
let allTracks = [];
let filteredTracks = [];
let favorites = JSON.parse(localStorage.getItem('dj_favorites')) || []; // Session favorites
let playedTracks = JSON.parse(localStorage.getItem('dj_played_tracks')) || []; // Tracks already played
let currentPlayingTrack = null;
let isMuted = false;
let previousVolume = 0.8;

// Chargement automatique lors des transitions de page
let autoplayFirstTrackOnLoad = false;
let autoplayLastTrackOnLoad = false;

// WaveSurfer instance variable
let wavesurfer = null;

// Pagination variables
let currentPage = 1;
let currentGenreId = 89;
let currentGenreSlug = "afro-house";

// Base URL pour l'API. Bascule automatiquement sur Vercel si on est sur signaid.eu
const isLocal = window.location.hostname === 'localhost' || 
                window.location.hostname === '127.0.0.1' || 
                window.location.hostname.startsWith('192.168.');
const API_BASE = isLocal ? '' : 'https://beatport-backend-vercel.vercel.app';// --- DOM ELEMENTS ---
const genreSelect = document.getElementById('genre-select');
const genreBadge = document.getElementById('genre-badge');
const startDateInput = document.getElementById('start-date');
const endDateInput = document.getElementById('end-date');
const fetchBtn = document.getElementById('fetch-btn');

const artAllRadio = document.getElementById('art-all');
const artCollabRadio = document.getElementById('art-collab');
const artFavRadio = document.getElementById('art-fav'); // Favorites filter radio
const artUnplayedRadio = document.getElementById('art-unplayed'); // Unplayed filter radio
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search');
const collabBadge = document.getElementById('collab-badge');

const totalImportedSpan = document.getElementById('total-imported');
const totalFilteredSpan = document.getElementById('total-filtered');
const sortSelect = document.getElementById('sort-select');

const tracksGrid = document.getElementById('tracks-grid');
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const emptyState = document.getElementById('empty-state');

// Pagination UI Elements
const btnPrevPage = document.getElementById('btn-prev-page');
const btnNextPage = document.getElementById('btn-next-page');
const currentPageNum = document.getElementById('current-page-num');

const btnPrevPageBottom = document.getElementById('btn-prev-page-bottom');
const btnNextPageBottom = document.getElementById('btn-next-page-bottom');
const currentPageNumBottom = document.getElementById('current-page-num-bottom');

// Audio Player DOM Elements
const playerBar = document.getElementById('audio-player-bar');
const playerCover = document.getElementById('player-cover');
const playerTitle = document.getElementById('player-title');
const playerArtists = document.getElementById('player-artists');
const playerBeatportLink = document.getElementById('player-beatport-link');
const playerMetadataLink = document.getElementById('player-metadata-link');
const playerBtnFav = document.getElementById('player-btn-favorite');

const btnPrev = document.getElementById('btn-prev');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnNext = document.getElementById('btn-next');
const mainPlayIcon = document.getElementById('main-play-icon');
const mainPauseIcon = document.getElementById('main-pause-icon');

const playerTimeCurrent = document.getElementById('player-time-current');
const playerTimeTotal = document.getElementById('player-time-total');

const btnMute = document.getElementById('btn-mute');
const volumeIcon = document.getElementById('volume-icon');
const muteIcon = document.getElementById('mute-icon');
const volumeSlider = document.getElementById('volume-slider');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Read and apply initial theme (Light/Dark mode)
    const savedTheme = localStorage.getItem('dj_theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        const themeIconSun = document.getElementById('theme-icon-sun');
        const themeIconMoon = document.getElementById('theme-icon-moon');
        if (themeIconSun && themeIconMoon) {
            themeIconSun.classList.remove('hidden');
            themeIconMoon.classList.add('hidden');
        }
    }

    // Check if access token is passed in URL hash (e.g. from the bookmarklet)
    if (window.location.hash.startsWith('#access_token=')) {
        const hashToken = window.location.hash.substring('#access_token='.length);
        if (hashToken) {
            localStorage.setItem('bp_api_access_token', decodeURIComponent(hashToken));
            localStorage.setItem('bp_api_grant_type', 'auth_code');
            // Clear hash
            history.replaceState(null, "", window.location.pathname + window.location.search);
            alert("✓ Jeton d'accès Beatport importé avec succès !");
        }
    }
    initWaveSurfer();
    populateGenresDropdown();
    initDefaultDates();
    fetchTracks();
    setupEventListeners();
    setupAISystem();
    updateFavBadge(); // Populate favorites count badge on startup
    updateUnplayedBadge(); // Populate unplayed count badge on startup
});

// Global HTML5 Audio Element for iOS Media Session compatibility
let audio = null;

// Initialize WaveSurfer player
function initWaveSurfer() {
    if (typeof WaveSurfer === 'undefined') {
        console.error("WaveSurfer is not loaded! Retrying in 500ms...");
        setTimeout(initWaveSurfer, 500);
        return;
    }
    
    // Create native audio element to enable background play & Bluetooth key events on iOS
    audio = document.createElement('audio');
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.playsInline = true;
    audio.setAttribute('playsinline', 'true');
    audio.style.display = 'none';
    document.body.appendChild(audio);
    
    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        media: audio,                // Bind the native HTML5 audio element
        waveColor: '#2b243c',        // Deep muted purple background wave
        progressColor: '#f97316',    // Vibrant orange progress wave
        height: 45,
        responsive: true,
        barWidth: 2,
        barGap: 2,
        barRadius: 2,
        cursorColor: '#a855f7',      // Purple seek cursor
        cursorWidth: 2,
        normalize: true,             // Equalize peak visuals
    });

    // WaveSurfer Audio Events
    wavesurfer.on('ready', () => {
        const duration = wavesurfer.getDuration();
        playerTimeTotal.innerText = formatTime(duration);
        wavesurfer.play().catch(err => {
            console.warn('[Playback] Autoplay blocked by browser:', err.message);
            updatePlayerUI(false);
        });
        updatePlayerUI(true);
        updateMediaSessionPositionState();
    });

    wavesurfer.on('timeupdate', (currentTime) => {
        playerTimeCurrent.innerText = formatTime(currentTime);
        // Evite de surcharger les connexions Bluetooth en limitant l'envoi
        if (Math.round(currentTime * 4) % 2 === 0) {
            updateMediaSessionPositionState();
        }
    });

    wavesurfer.on('seeking', () => {
        updateMediaSessionPositionState();
    });

    wavesurfer.on('play', () => {
        updateMediaSessionPositionState();
    });

    wavesurfer.on('pause', () => {
        updateMediaSessionPositionState();
    });

    wavesurfer.on('finish', () => {
        playNextTrack(); // Auto-advance playlist
    });
}

// Fill the genre selection menu
function populateGenresDropdown() {
    genreSelect.innerHTML = '';
    sortedGenresForDropdown.forEach(g => {
        const option = document.createElement('option');
        option.value = g.id;
        option.innerText = g.name;
        if (g.id === 89) {
            option.selected = true;
        }
        genreSelect.appendChild(option);
    });
}

// Calculate date range (Last 7 days)
function initDefaultDates() {
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    startDateInput.value = formatDateString(sevenDaysAgo);
    endDateInput.value = formatDateString(today);
    
    startDateInput.max = formatDateString(today);
    endDateInput.max = formatDateString(today);
}

function formatDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// --- CACHE MANAGEMENT ---
const CACHE_KEY_PREFIX = 'bp_tracks_cache_';
const CACHE_META_KEY = 'bp_tracks_cache_meta';

function getCacheKey(genreId, genreSlug, start, end) {
    return `${CACHE_KEY_PREFIX}${genreId}_${genreSlug}_${start}_${end}`;
}

function saveToCache(genreId, genreSlug, start, end, tracks) {
    const key = getCacheKey(genreId, genreSlug, start, end);
    const entry = {
        tracks,
        savedAt: new Date().toISOString(),
        genreName: BEATPORT_GENRES.find(g => g.id === parseInt(genreId))?.name || genreSlug,
        dateRange: `${start} → ${end}`
    };
    try {
        localStorage.setItem(key, JSON.stringify(entry));
        // Store meta info so we can display it
        localStorage.setItem(CACHE_META_KEY, JSON.stringify({
            key, savedAt: entry.savedAt, genreName: entry.genreName, dateRange: entry.dateRange, count: tracks.length
        }));
        console.log(`[Cache] Saved ${tracks.length} tracks for ${genreSlug} (${start}→${end})`);
    } catch(e) {
        console.warn('[Cache] Could not save to localStorage:', e);
    }
}

function loadFromCache(genreId, genreSlug, start, end) {
    const key = getCacheKey(genreId, genreSlug, start, end);
    try {
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
    } catch(e) {}
    return null;
}

function loadBestAvailableCache(genreId, genreSlug) {
    // Try to find ANY cached result for this genre (ignore date range)
    const prefix = `${CACHE_KEY_PREFIX}${genreId}_${genreSlug}_`;
    let bestEntry = null;
    let bestDate = '';
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(prefix)) {
                const raw = localStorage.getItem(k);
                if (raw) {
                    const entry = JSON.parse(raw);
                    if (!bestDate || entry.savedAt > bestDate) {
                        bestDate = entry.savedAt;
                        bestEntry = entry;
                    }
                }
            }
        }
    } catch(e) {}
    return bestEntry;
}

function showCacheBanner(entry) {
    let banner = document.getElementById('cache-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'cache-banner';
        banner.style.cssText = 'background:linear-gradient(135deg,rgba(234,179,8,0.15),rgba(234,179,8,0.05));border:1px solid rgba(234,179,8,0.3);border-radius:0.75rem;padding:0.65rem 1rem;margin-bottom:1rem;font-size:0.8rem;color:#fbbf24;display:flex;align-items:center;gap:0.5rem;';
        banner.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg><span id="cache-banner-text"></span>';
        const container = document.querySelector('.controls-grid') || document.querySelector('.tracks-container') || document.getElementById('tracks-grid')?.parentNode;
        if (container) container.insertBefore(banner, container.firstChild);
    }
    const d = new Date(entry.savedAt);
    const savedStr = d.toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit'});
    document.getElementById('cache-banner-text').innerText = `⚠️ Beatport est temporairement inaccessible. Affichage du dernier cache : ${entry.genreName} · ${entry.dateRange} · sauvegardé le ${savedStr} (${entry.tracks.length} morceaux).`;
    banner.style.display = 'flex';
}

function hideCacheBanner() {
    const banner = document.getElementById('cache-banner');
    if (banner) banner.style.display = 'none';
}

// --- DIRECT BROWSER FETCH via CORS proxy (bypass datacenter IP block) ---
async function fetchViaCorsProxy(genreId, genreSlug, start, end, page) {
    const beatportUrl = `https://www.beatport.com/fr/genre/${genreSlug}/${genreId}/tracks?publish_date=${start}%3A${end}&page=${page}&per_page=150`;
    
    // Try multiple CORS proxies in order
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(beatportUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(beatportUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${beatportUrl}`,
    ];
    
    for (const proxyUrl of proxies) {
        try {
            console.log('[CorsProxy] Trying:', proxyUrl.split('?')[0]);
            const resp = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
            if (!resp.ok) { console.warn('[CorsProxy] HTTP', resp.status); continue; }
            const html = await resp.text();
            
            if (!html.includes('__NEXT_DATA__')) {
                console.warn('[CorsProxy] Response does not contain __NEXT_DATA__, skipping.');
                continue;
            }
            
            // Extract __NEXT_DATA__
            const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
            if (!match) { console.warn('[CorsProxy] __NEXT_DATA__ tag not found.'); continue; }
            
            const data = JSON.parse(match[1]);
            const queries = data?.props?.pageProps?.dehydratedState?.queries || [];
            let tracks = [];
            
            for (const q of queries) {
                const qdata = q?.state?.data;
                if (qdata && Array.isArray(qdata.results) && qdata.results.length > 0) {
                    // Check it's a tracks query
                    const qkey = q?.queryKey || [];
                    const isTracksQuery = qkey.some(k => typeof k === 'string' && k.startsWith('tracks'));
                    if (isTracksQuery || tracks.length === 0) {
                        tracks = qdata.results;
                    }
                }
            }
            
            if (tracks.length > 0) {
                console.log(`[CorsProxy] Got ${tracks.length} tracks via proxy!`);
                return tracks;
            } else {
                console.warn('[CorsProxy] Parsed OK but 0 tracks found in NEXT_DATA.');
            }
        } catch(err) {
            console.warn('[CorsProxy] Failed:', err.message);
        }
    }
    throw new Error('All CORS proxies failed or returned 0 tracks.');
}

// --- API FETCH ---
async function fetchTracks() {
    showState('loading');
    
    const start = startDateInput.value;
    const end = endDateInput.value;
    
    // Block future dates
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const endDate = new Date(end);
    if (endDate > today) {
        endDateInput.value = formatDateString(new Date());
        return fetchTracks(); // Re-run with corrected date
    }
    const startDate = new Date(start);
    if (startDate > today) {
        startDateInput.value = formatDateString(new Date());
        return fetchTracks();
    }
    
    currentPageNum.innerText = currentPage;
    currentPageNumBottom.innerText = currentPage;
    
    btnPrevPage.disabled = currentPage === 1;
    btnPrevPageBottom.disabled = currentPage === 1;
    
    let tracks = [];
    let fetchedFresh = false;
    
    // --- STEP 1: Try Vercel backend ---
    try {
        let apiParams = '';
        const grantType = localStorage.getItem('bp_api_grant_type') || 'auth_code';
        const accessToken = localStorage.getItem('bp_api_access_token');
        
        if (grantType === 'auth_code' && accessToken) {
            apiParams += `&access_token=${encodeURIComponent(accessToken)}`;
        } else {
            const clientId = localStorage.getItem('bp_api_client_id');
            const clientSecret = localStorage.getItem('bp_api_client_secret');
            const username = localStorage.getItem('bp_api_username');
            const password = localStorage.getItem('bp_api_password');
            
            if (clientId) {
                apiParams += `&grant_type=${encodeURIComponent(grantType || 'client_credentials')}`;
                apiParams += `&client_id=${encodeURIComponent(clientId)}`;
                if (clientSecret) apiParams += `&client_secret=${encodeURIComponent(clientSecret)}`;
                if (grantType === 'password') {
                    apiParams += `&username=${encodeURIComponent(username || '')}`;
                    apiParams += `&password=${encodeURIComponent(password || '')}`;
                }
            }
        }

        const apiUrl = `${API_BASE}/api/tracks?start_date=${start}&end_date=${end}&genre_id=${currentGenreId}&genre_slug=${currentGenreSlug}&page=${currentPage}${apiParams}`;
        console.log(`[Fetch] Fetching tracks from ${apiUrl.split('&client_secret=')[0].split('&access_token=')[0]} (credentials hidden)`);
        const response = await fetch(apiUrl, { signal: AbortSignal.timeout(25000) }); // Increased timeout for OAuth handshake
        const data = await response.json();
        if (data.success && Array.isArray(data.tracks) && data.tracks.length > 0) {
            // Check for OAuth or token error
            if (data.tracks.length === 1 && data.tracks[0].error) {
                const errMsg = data.tracks[0].error;
                console.warn('[Fetch] Backend API Error:', errMsg);
                if (errMsg.includes('OAuth') || errMsg.includes('token') || errMsg.includes('unauthorized')) {
                    localStorage.removeItem('bp_api_access_token');
                    console.log('[Fetch] Access token cleared due to API authentication failure.');
                }
            } else {
                tracks = data.tracks;
                fetchedFresh = true;
                console.log(`[Fetch] Backend: ${tracks.length} tracks OK.`);
            }
        } else {
            console.warn('[Fetch] Backend returned 0 tracks or API failed. Trying direct browser fallback...');
        }
    } catch (err) {
        console.warn('[Fetch] Backend error:', err.message);
    }
    
    // --- STEP 2: CORS proxy fetch from user's browser ---
    if (tracks.length === 0) {
        try {
            const proxyTracks = await fetchViaCorsProxy(currentGenreId, currentGenreSlug, start, end, currentPage);
            if (proxyTracks.length > 0) {
                tracks = proxyTracks;
                fetchedFresh = true;
                console.log(`[CorsProxy] Got ${tracks.length} tracks via browser proxy!`);
            }
        } catch(err) {
            console.warn('[CorsProxy] All proxies failed:', err.message);
        }
    }
    
    // --- STEP 3: Cache fallback ---
    if (tracks.length === 0) {
        console.warn('[Fetch] All live sources failed — trying localStorage cache...');
        let cached = loadFromCache(currentGenreId, currentGenreSlug, start, end);
        if (!cached) cached = loadBestAvailableCache(currentGenreId, currentGenreSlug);
        if (cached && cached.tracks.length > 0) {
            tracks = cached.tracks;
            showCacheBanner(cached);
            console.log(`[Cache] Fallback: loaded ${tracks.length} tracks from cache.`);
        } else {
            hideCacheBanner();
        }
    } else {
        hideCacheBanner();
        if (fetchedFresh) {
            saveToCache(currentGenreId, currentGenreSlug, start, end, tracks);
        }
    }
    
    allTracks = tracks;
    
    const collabCount = allTracks.filter(t => t.artists && t.artists.length >= 2).length;
    collabBadge.innerText = collabCount;
    updateUnplayedBadge();
    
    totalImportedSpan.innerText = allTracks.length;
    
    const hasNext = allTracks.length === 150;
    btnNextPage.disabled = !hasNext;
    btnNextPageBottom.disabled = !hasNext;
    
    applyFiltersAndRender();

    if (allTracks.length === 0) {
        // Show error only if all fallbacks exhausted
        showState('empty');
    }

    // Autoplay après changement de page automatique
    if (autoplayFirstTrackOnLoad) {
        autoplayFirstTrackOnLoad = false;
        if (filteredTracks.length > 0) togglePlayTrack(filteredTracks[0]);
    } else if (autoplayLastTrackOnLoad) {
        autoplayLastTrackOnLoad = false;
        if (filteredTracks.length > 0) togglePlayTrack(filteredTracks[filteredTracks.length - 1]);
    }
}

// --- STATE MANAGEMENT ---
function showState(state) {
    loadingState.classList.add('hidden');
    errorState.classList.add('hidden');
    emptyState.classList.add('hidden');
    tracksGrid.classList.add('hidden');
    
    if (state === 'loading') {
        loadingState.classList.remove('hidden');
    } else if (state === 'error') {
        errorState.classList.remove('hidden');
    } else if (state === 'empty') {
        emptyState.classList.remove('hidden');
    } else if (state === 'success') {
        tracksGrid.classList.remove('hidden');
    }
}

// --- FILTERING & SORTING LOGIC ---
function applyFiltersAndRender() {
    const artistFilterValue = document.querySelector('input[name="artist-filter"]:checked').value;
    const searchQuery = searchInput.value.toLowerCase().trim();
    
    let baseTracks = allTracks;
    if (artistFilterValue === 'favorites') {
        baseTracks = favorites;
    }
    
    filteredTracks = baseTracks.filter(track => {
        if (artistFilterValue === 'collab') {
            return track.artists && track.artists.length >= 2;
        } else if (artistFilterValue === 'unplayed') {
            return !playedTracks.includes(track.id);
        }
        return true;
    });
    
    if (searchQuery) {
        filteredTracks = filteredTracks.filter(track => {
            const title = (track.name || '').toLowerCase();
            const mixName = (track.mix_name || '').toLowerCase();
            const artists = (track.artists || []).map(a => a.name).join(' ').toLowerCase();
            const key = (track.key && track.key.name || '').toLowerCase();
            const bpm = String(track.bpm || '');
            const label = (track.release && track.release.label && track.release.label.name || '').toLowerCase();
            const release = (track.release && track.release.name || '').toLowerCase();
            
            return title.includes(searchQuery) || 
                   mixName.includes(searchQuery) || 
                   artists.includes(searchQuery) || 
                   key.includes(searchQuery) || 
                   bpm.includes(searchQuery) ||
                   label.includes(searchQuery) ||
                   release.includes(searchQuery);
        });
    }
    
    const sortVal = sortSelect.value;
    filteredTracks.sort((a, b) => {
        if (sortVal === 'newest') {
            return new Date(b.new_release_date || b.publish_date) - new Date(a.new_release_date || a.publish_date);
        } else if (sortVal === 'oldest') {
            return new Date(a.new_release_date || a.publish_date) - new Date(b.new_release_date || b.publish_date);
        } else if (sortVal === 'bpm-asc') {
            return (a.bpm || 0) - (b.bpm || 0);
        } else if (sortVal === 'bpm-desc') {
            return (b.bpm || 0) - (a.bpm || 0);
        } else if (sortVal === 'name-asc') {
            return (a.name || '').localeCompare(b.name || '');
        }
        return 0;
    });
    
    totalFilteredSpan.innerText = filteredTracks.length;
    
    if (filteredTracks.length === 0) {
        showState('empty');
    } else {
        renderTracksGrid();
        showState('success');
    }
}

// --- QUICK FILTER BY ARTIST OR LABEL (30 DAYS + COLLAB SUB-FILTER) ---
let activeQuickFilter = null;

function filterByArtistOrLabel(name, type = 'artist', event) {
    if (event) {
        if (typeof event.stopPropagation === 'function') event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    if (!name) return false;
    
    // 1. Calculate and set date range to last 30 days
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    startDateInput.value = formatDateString(thirtyDaysAgo);
    endDateInput.value = formatDateString(today);
    
    // 2. Set search input to target artist/label name
    searchInput.value = name;
    if (clearSearchBtn) clearSearchBtn.classList.remove('hidden');
    
    // 3. Set artist-filter to 'collab' radio button
    if (artCollabRadio) {
        artCollabRadio.checked = true;
    }
    
    // 4. Update banner state
    activeQuickFilter = { name, type };
    updateActiveQuickFilterBanner();
    
    // 5. Reset page and fetch tracks
    currentPage = 1;
    fetchTracks();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return false;
}

function isDateRange30Days(startStr, endStr) {
    if (!startStr || !endStr) return false;
    const start = new Date(startStr);
    const end = new Date(endStr);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 25 && diffDays <= 35;
}

function updateActiveQuickFilterBanner() {
    const banner = document.getElementById('quick-filter-banner');
    if (!banner) return;
    
    const targetName = activeQuickFilter ? activeQuickFilter.name : searchInput.value;
    const type = activeQuickFilter ? activeQuickFilter.type : 'artist';
    
    // Hide banner if no target and no special date/collab filter active
    if (!targetName && !activeQuickFilter && !isDateRange30Days(startDateInput.value, endDateInput.value)) {
        banner.classList.add('hidden');
        return;
    }
    
    const typeLabel = type === 'label' ? 'Label' : 'Artiste';
    const typeIcon = type === 'label' ? '🏷️' : '👤';
    
    const isCollabActive = artCollabRadio && artCollabRadio.checked;
    const is30Days = isDateRange30Days(startDateInput.value, endDateInput.value);
    
    let targetChipHTML = '';
    if (targetName) {
        targetChipHTML = `
            <button type="button" class="banner-sub-chip target-chip" onclick="clearTargetSearch()" title="Cliquer pour retirer la recherche ${typeLabel}">
                <span>${typeIcon} ${typeLabel} : <strong>"${targetName}"</strong></span>
                <span class="chip-remove">&times;</span>
            </button>
        `;
    }
    
    let dateChipHTML = '';
    if (is30Days) {
        dateChipHTML = `
            <button type="button" class="banner-sub-chip active" onclick="resetDatesToDefault()" title="Cliquer pour réinitialiser la période aux 7 jours par défaut">
                <span>📅 30 derniers jours</span>
                <span class="chip-remove">&times;</span>
            </button>
        `;
    }
    
    let subFilterChipHTML = '';
    if (isCollabActive) {
        subFilterChipHTML = `
            <button type="button" class="banner-sub-chip active" onclick="toggleCollabSubFilter(false)" title="Cliquer pour désactiver le sub-filtre Collab et voir TOUTES les pistes (Solo + Collab)">
                <span>👥 Sub-filtre : Collabs (2+)</span>
                <span class="chip-remove">&times;</span>
            </button>
        `;
    } else {
        subFilterChipHTML = `
            <button type="button" class="banner-sub-chip inactive" onclick="toggleCollabSubFilter(true)" title="Cliquer pour activer le sub-filtre Collabs (2+ artistes)">
                <span>+ Ajouter sub-filtre Collabs</span>
            </button>
        `;
    }
    
    banner.innerHTML = `
        <div class="quick-filter-info">
            <span class="quick-filter-badge">⚡ Filtres actifs</span>
            ${targetChipHTML}
            ${dateChipHTML}
            ${subFilterChipHTML}
        </div>
        <button type="button" class="btn-clear-quick-filter" onclick="clearQuickFilter()" title="Réinitialiser tous les filtres">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            <span>Tout réinitialiser</span>
        </button>
    `;
    banner.classList.remove('hidden');
}

function toggleCollabSubFilter(enable) {
    if (enable) {
        if (artCollabRadio) artCollabRadio.checked = true;
    } else {
        if (artAllRadio) artAllRadio.checked = true;
    }
    applyFiltersAndRender();
    updateActiveQuickFilterBanner();
}

function resetDatesToDefault() {
    initDefaultDates();
    fetchTracks();
}

function clearTargetSearch() {
    activeQuickFilter = null;
    searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    applyFiltersAndRender();
    updateActiveQuickFilterBanner();
}

function clearQuickFilter() {
    activeQuickFilter = null;
    const banner = document.getElementById('quick-filter-banner');
    if (banner) banner.classList.add('hidden');
    
    // Reset dates to default
    initDefaultDates();
    
    // Reset search input
    searchInput.value = '';
    if (clearSearchBtn) clearSearchBtn.classList.add('hidden');
    
    // Re-fetch tracks
    currentPage = 1;
    fetchTracks();
}

// --- RENDER GRID ---
function renderTracksGrid() {
    tracksGrid.innerHTML = '';
    
    filteredTracks.forEach((track, index) => {
        const isFav = favorites.some(t => t.id === track.id);
        const isPlayingThis = currentPlayingTrack && currentPlayingTrack.id === track.id;
        const isCurrentlyPlayingAudio = isPlayingThis && wavesurfer && wavesurfer.isPlaying();
        
        // Generate interactive chips for each artist
        const artistChipsHTML = (track.artists || []).map(a => {
            const escapedName = (a.name || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            return `<button type="button" class="artist-chip-btn" onclick="filterByArtistOrLabel('${escapedName}', 'artist', event)" title="Dernières sorties de ${a.name} (30j, Collab)">👤 ${a.name}</button>`;
        }).join(' ');

        // Generate interactive chip for label if available
        let labelChipHTML = '';
        if (track.release && track.release.label && track.release.label.name) {
            const labelName = track.release.label.name;
            const escapedLabel = labelName.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            labelChipHTML = `<button type="button" class="label-chip-btn" onclick="filterByArtistOrLabel('${escapedLabel}', 'label', event)" title="Dernières sorties du label ${labelName} (30j, Collab)">🏷️ ${labelName}</button>`;
        }
        
        let imageUri = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300' viewBox='0 0 300 300'%3E%3Crect width='300' height='300' fill='%231f1e26'/%3E%3C/svg%3E";
        if (track.image && track.image.uri) {
            imageUri = track.image.uri;
        }
        
        const isCollab = track.artists && track.artists.length >= 2;
        const collabBadgeHTML = isCollab ? `<div class="collab-tag">${track.artists.length} Artistes</div>` : '';
        
        const beatportUrl = track.url && track.url.includes('www.beatport.com') && !track.url.includes('api.beatport.com')
            ? track.url 
            : `https://www.beatport.com/track/${track.slug}/${track.id}`;
            
        const mixName = track.mix_name || "Original Mix";
        
        // Format publish date in French
        const rawDate = track.publish_date || track.new_release_date || '';
        let formattedDate = '';
        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d)) {
                formattedDate = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
            }
        }
        
        const artistFilterValue = document.querySelector('input[name="artist-filter"]:checked').value;
        const isFavView = artistFilterValue === 'favorites';
        
        const favButtonHTML = isFavView ? `
            <button class="btn-favorite" onclick="toggleFavorite(${JSON.stringify(track).replace(/"/g, '&quot;')}, event)" style="color:#ef4444;background:rgba(239, 68, 68, 0.05);border:1px solid rgba(239, 68, 68, 0.2);border-radius:var(--radius-sm);padding:0.2rem 0.45rem;display:inline-flex;align-items:center;gap:3px;" title="Retirer des favoris">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                <span style="font-size:0.65rem;font-weight:600;">Retirer</span>
            </button>
        ` : `
            <button class="btn-favorite" onclick="toggleFavorite(${JSON.stringify(track).replace(/"/g, '&quot;')}, event)" title="${isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}">
                <svg class="heart-icon ${isFav ? 'active' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            </button>
        `;

        const isPlayed = playedTracks.includes(track.id);

        const card = document.createElement('div');
        card.className = `track-card ${isPlayingThis ? 'playing' : ''} ${isPlayed ? 'played' : ''}`;
        card.dataset.id = track.id;
        card.style.animationDelay = `${index * 30}ms`;
        
        card.innerHTML = `
            ${collabBadgeHTML}
            <div class="thumbnail-wrapper" onclick="togglePlayTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})">
                <img src="${imageUri}" alt="${track.name}" class="track-cover" loading="lazy">
                <div class="play-overlay">
                    <button class="btn-play-card" aria-label="Lire/Pause">
                        ${isCurrentlyPlayingAudio ? 
                          `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>` : 
                          `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`
                        }
                    </button>
                </div>
            </div>
            <div class="track-info">
                <div class="track-name-row">
                    <h3 class="track-title" title="${track.name}">
                        <a href="${beatportUrl}" target="_blank" rel="noreferrer" class="track-title-link" onclick="event.stopPropagation();" title="Ouvrir sur Beatport : ${track.name}">
                            ${track.name}
                        </a>
                    </h3>
                    <div class="track-mix-name" title="${mixName}">${mixName}</div>
                </div>
                <div class="track-artists track-artists-chips">${artistChipsHTML}</div>
                
                <div class="track-meta-row">
                    ${track.bpm ? `<span class="meta-pill bpm">${track.bpm} BPM</span>` : ''}
                    ${track.key && track.key.name ? `<span class="meta-pill key">${track.key.name}</span>` : ''}
                    ${formattedDate ? `<span class="meta-pill date" title="Date de publication">📅 ${formattedDate}</span>` : ''}
                    ${favButtonHTML}
                    <a href="${beatportUrl}" target="_blank" rel="noreferrer" class="meta-pill beatport-link-pill" onclick="event.stopPropagation();" title="Ouvrir sur Beatport">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                        <span>Beatport</span>
                    </a>
                    <button class="btn-find-similar" onclick="findSimilarTracks(${JSON.stringify(track).replace(/"/g, '&quot;')}, event)" title="Trouver des morceaux similaires par IA">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                        <span>Similaires</span>
                    </button>
                    ${labelChipHTML}
                </div>
            </div>
        `;
        
        tracksGrid.appendChild(card);
    });
}


// --- AUDIO PLAYER LOGIC ---
function togglePlayTrack(track) {
    if (!track.sample_url) {
        alert("Aperçu audio non disponible pour ce morceau.");
        return;
    }
    
    startSilentKeepAlive(); // Keep browser awake in background
    
    if (!wavesurfer) {
        initWaveSurfer();
    }
    
    const isSameTrack = currentPlayingTrack && currentPlayingTrack.id === track.id;
    
    if (isSameTrack) {
        if (wavesurfer.isPlaying()) {
            wavesurfer.pause();
            updatePlayerUI(false);
        } else {
            wavesurfer.play().catch(err => {
                console.warn('[Playback] Play failed:', err.message);
                updatePlayerUI(false);
            });
            updatePlayerUI(true);
        }
    } else {
        currentPlayingTrack = track;
        addToPlayHistory(track); // Track history for AI assistant context
        addToPlayedTracks(track.id); // Mark track as played
        
        // Synchronously play & pause the global audio element to unlock it under user gesture context
        if (audio) {
            audio.play().then(() => {
                audio.pause();
            }).catch(e => {
                console.warn('[Audio] Failed to pre-play for unlock:', e.message);
            });
        }
        
        // Use backend audio proxy to guarantee CORS is allowed for Web Audio decoding
        const proxiedUrl = `${API_BASE}/api/audio-proxy?url=${encodeURIComponent(track.sample_url)}`;
        wavesurfer.load(proxiedUrl);
        
        // Show loading state
        playerTimeTotal.innerText = "Chargement...";
        wavesurfer.setVolume(isMuted ? 0 : parseFloat(volumeSlider.value));
        updatePlayerUI(true);
        
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: track.name,
                artist: (track.artists || []).map(a => a.name).join(', '),
                album: track.release ? track.release.name : '',
                artwork: [{ src: track.image ? track.image.uri : '' }]
            });
        }
    }
}

function updatePlayerUI(isPlaying) {
    const cards = document.querySelectorAll('.track-card');
    cards.forEach(card => {
        const cardId = parseInt(card.dataset.id);
        if (currentPlayingTrack && cardId === currentPlayingTrack.id) {
            card.classList.add('playing');
            const playBtn = card.querySelector('.btn-play-card');
            if (isPlaying) {
                card.classList.add('playing');
                playBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
            } else {
                playBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
            }
        } else {
            card.classList.remove('playing');
            const playBtn = card.querySelector('.btn-play-card');
            if (playBtn) {
                playBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
            }
        }
    });

    if (currentPlayingTrack) {
        playerBar.classList.remove('collapsed');
        playerTitle.innerText = currentPlayingTrack.name;
        playerTitle.title = currentPlayingTrack.name;
        playerArtists.innerText = (currentPlayingTrack.artists || []).map(a => a.name).join(', ');
        
        if (currentPlayingTrack.image && currentPlayingTrack.image.uri) {
            playerCover.src = currentPlayingTrack.image.uri;
        }
        
        const beatportUrl = currentPlayingTrack.url && currentPlayingTrack.url.includes('www.beatport.com') && !currentPlayingTrack.url.includes('api.beatport.com')
            ? currentPlayingTrack.url 
            : `https://www.beatport.com/track/${currentPlayingTrack.slug}/${currentPlayingTrack.id}`;
        playerBeatportLink.href = beatportUrl;
        if (playerMetadataLink) {
            playerMetadataLink.href = beatportUrl;
        }

        // Update player favorite button heart state
        const isFav = favorites.some(t => t.id === currentPlayingTrack.id);
        const playerFavBtn = document.getElementById('player-btn-favorite');
        if (playerFavBtn) {
            playerFavBtn.title = isFav ? "Retirer des favoris" : "Ajouter aux favoris";
            const heartIcon = playerFavBtn.querySelector('.heart-icon');
            if (heartIcon) {
                heartIcon.classList.toggle('active', isFav);
                heartIcon.setAttribute('fill', isFav ? 'currentColor' : 'none');
            }
        }
    }

    if (isPlaying) {
        mainPlayIcon.classList.add('hidden');
        mainPauseIcon.classList.remove('hidden');
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'playing';
        }
    } else {
        mainPlayIcon.classList.remove('hidden');
        mainPauseIcon.classList.add('hidden');
        if ('mediaSession' in navigator) {
            navigator.mediaSession.playbackState = 'paused';
        }
    }

    // Update real-time AI assistant state indicator
    updateAILiveStatus(isPlaying);
}

function playNextTrack() {
    if (filteredTracks.length === 0) return;
    
    let currentIndex = -1;
    if (currentPlayingTrack) {
        currentIndex = filteredTracks.findIndex(t => t.id === currentPlayingTrack.id);
    }
    
    let nextIndex = currentIndex + 1;
    
    // Si on arrive au dernier morceau de la liste sur cette page
    if (nextIndex >= filteredTracks.length) {
        const hasNext = allTracks.length === 150;
        if (hasNext) {
            currentPage++;
            autoplayFirstTrackOnLoad = true;
            fetchTracks();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        } else {
            // Boucler au premier morceau de la même page
            nextIndex = 0;
        }
    }
    
    togglePlayTrack(filteredTracks[nextIndex]);
}

function playPrevTrack() {
    if (filteredTracks.length === 0) return;
    
    let currentIndex = -1;
    if (currentPlayingTrack) {
        currentIndex = filteredTracks.findIndex(t => t.id === currentPlayingTrack.id);
    }
    
    let prevIndex = currentIndex - 1;
    
    // Si on recule avant le premier morceau de cette page
    if (prevIndex < 0) {
        if (currentPage > 1) {
            currentPage--;
            autoplayLastTrackOnLoad = true;
            fetchTracks();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        } else {
            // Boucler au dernier morceau de la même page
            prevIndex = filteredTracks.length - 1;
        }
    }
    
    togglePlayTrack(filteredTracks[prevIndex]);
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
    // Genre selection dropdown
    genreSelect.addEventListener('change', () => {
        const selectedId = parseInt(genreSelect.value);
        const selectedGenre = BEATPORT_GENRES.find(g => g.id === selectedId);
        if (selectedGenre) {
            currentGenreId = selectedGenre.id;
            currentGenreSlug = selectedGenre.slug;
            genreBadge.innerText = `${selectedGenre.name} Edition`;
            currentPage = 1;
            fetchTracks();
        }
    });

    // Fetch button
    fetchBtn.addEventListener('click', () => {
        currentPage = 1;
        fetchTracks();
    });
    retryBtn.addEventListener('click', fetchTracks);
    
    // Pagination controls (Top)
    btnPrevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchTracks();
        }
    });
    btnNextPage.addEventListener('click', () => {
        currentPage++;
        fetchTracks();
    });

    // Pagination controls (Bottom)
    btnPrevPageBottom.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            fetchTracks();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
    btnNextPageBottom.addEventListener('click', () => {
        currentPage++;
        fetchTracks();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
    // Sort and filtering events
    const handleFilterChange = () => {
        applyFiltersAndRender();
        updateActiveQuickFilterBanner();
    };
    
    artAllRadio.addEventListener('change', handleFilterChange);
    artCollabRadio.addEventListener('change', handleFilterChange);
    artFavRadio.addEventListener('change', handleFilterChange);
    artUnplayedRadio.addEventListener('change', handleFilterChange);
    sortSelect.addEventListener('change', applyFiltersAndRender);
    
    startDateInput.addEventListener('change', updateActiveQuickFilterBanner);
    endDateInput.addEventListener('change', updateActiveQuickFilterBanner);
    
    // Search behavior
    searchInput.addEventListener('input', () => {
        if (searchInput.value) {
            clearSearchBtn.classList.remove('hidden');
        } else {
            clearSearchBtn.classList.add('hidden');
        }
        handleFilterChange();
    });
    
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.classList.add('hidden');
        handleFilterChange();
    });
    
    // Player controls
    btnPlayPause.addEventListener('click', () => {
        if (currentPlayingTrack && wavesurfer) {
            if (wavesurfer.isPlaying()) {
                wavesurfer.pause();
                updatePlayerUI(false);
            } else {
                startSilentKeepAlive(); // Keep browser awake in background
                wavesurfer.play().catch(err => {
                    console.warn('[Playback] Play failed:', err.message);
                    updatePlayerUI(false);
                });
                updatePlayerUI(true);
            }
        } else if (filteredTracks.length > 0) {
            startSilentKeepAlive(); // Keep browser awake in background
            togglePlayTrack(filteredTracks[0]);
        }
    });
    
    btnNext.addEventListener('click', playNextTrack);
    btnPrev.addEventListener('click', playPrevTrack);
    
    if (playerBtnFav) {
        playerBtnFav.addEventListener('click', (e) => {
            if (currentPlayingTrack) {
                toggleFavorite(currentPlayingTrack, e);
            }
        });
    }
    
    // Volume controls
    volumeSlider.addEventListener('input', (e) => {
        if (!wavesurfer) return;
        const val = parseFloat(e.target.value);
        wavesurfer.setVolume(val);
        isMuted = val === 0;
        updateVolumeIcon();
    });
    
    btnMute.addEventListener('click', () => {
        if (!wavesurfer) return;
        isMuted = !isMuted;
        if (isMuted) {
            previousVolume = volumeSlider.value;
            volumeSlider.value = 0;
            wavesurfer.setVolume(0);
        } else {
            volumeSlider.value = previousVolume;
            wavesurfer.setVolume(parseFloat(previousVolume));
        }
        updateVolumeIcon();
    });

    document.addEventListener('keydown', (e) => {
        if (document.activeElement === searchInput) return;
        
        if (e.code === 'Space') {
            e.preventDefault();
            btnPlayPause.click();
        } else if (e.code === 'ArrowUp') {
            e.preventDefault();
            btnPrev.click();
        } else if (e.code === 'ArrowDown') {
            e.preventDefault();
            btnNext.click();
        } else if (e.code === 'ArrowRight' && e.ctrlKey) {
            e.preventDefault();
            btnNext.click();
        } else if (e.code === 'ArrowLeft' && e.ctrlKey) {
            e.preventDefault();
            btnPrev.click();
        } else if (e.code === 'ArrowRight' && !e.ctrlKey) {
            e.preventDefault();
            if (wavesurfer) {
                const duration = wavesurfer.getDuration();
                if (duration > 0) {
                    const currentTime = wavesurfer.getCurrentTime();
                    // Si on est à moins d'1.5 seconde de la fin, passer à la piste suivante
                    if (currentTime >= duration - 1.5) {
                        playNextTrack();
                    } else {
                        // Sinon avancer de 2 secondes
                        const newTime = Math.min(currentTime + 2, duration);
                        wavesurfer.seekTo(newTime / duration);
                        updateMediaSessionPositionState();
                    }
                }
            }
        } else if (e.code === 'ArrowLeft' && !e.ctrlKey) {
            e.preventDefault();
            if (wavesurfer) {
                const duration = wavesurfer.getDuration();
                if (duration > 0) {
                    const currentTime = wavesurfer.getCurrentTime();
                    // Si on est à moins d'1.5 seconde du début, passer à la piste précédente
                    if (currentTime <= 1.5) {
                        playPrevTrack();
                    } else {
                        // Sinon reculer de 2 secondes
                        const newTime = Math.max(currentTime - 2, 0);
                        wavesurfer.seekTo(newTime / duration);
                        updateMediaSessionPositionState();
                    }
                }
            }
        }
    });
    
    if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
            if (wavesurfer) {
                wavesurfer.play().catch(err => {
                    console.warn('[MediaSession] Play failed:', err.message);
                    updatePlayerUI(false);
                });
                updatePlayerUI(true);
            }
        });
        navigator.mediaSession.setActionHandler('pause', () => {
            if (wavesurfer) {
                wavesurfer.pause();
                updatePlayerUI(false);
            }
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
            playPrevTrack();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
            playNextTrack();
        });
        
        // Support du déplacement tactile direct depuis l'écran de la platine DJ !
        navigator.mediaSession.setActionHandler('seekto', (details) => {
            if (wavesurfer && details.seekTime !== undefined) {
                const duration = wavesurfer.getDuration();
                if (duration > 0) {
                    wavesurfer.seekTo(details.seekTime / duration);
                    updateMediaSessionPositionState();
                }
            }
        });
        
        navigator.mediaSession.setActionHandler('seekforward', (details) => {
            if (wavesurfer) {
                const offset = details.seekOffset || 5;
                const newTime = Math.min(wavesurfer.getCurrentTime() + offset, wavesurfer.getDuration());
                const duration = wavesurfer.getDuration();
                if (duration > 0) {
                    wavesurfer.seekTo(newTime / duration);
                    updateMediaSessionPositionState();
                }
            }
        });
        
        navigator.mediaSession.setActionHandler('seekbackward', (details) => {
            if (wavesurfer) {
                const offset = details.seekOffset || 5;
                const newTime = Math.max(wavesurfer.getCurrentTime() - offset, 0);
                const duration = wavesurfer.getDuration();
                if (duration > 0) {
                    wavesurfer.seekTo(newTime / duration);
                    updateMediaSessionPositionState();
                }
            }
        });
    }

    // Bookmarklet modal listeners
    const importBeatportBtn = document.getElementById('import-beatport-btn');
    const bookmarkletModal = document.getElementById('bookmarklet-modal');
    const bookmarkletClose = document.getElementById('bookmarklet-modal-close');
    const bookmarkletOpenBp = document.getElementById('bookmarklet-open-bp');
    const bookmarkletLink = document.getElementById('bookmarklet-link');
    const bookmarkletWaiting = document.getElementById('bookmarklet-waiting');

    if (importBeatportBtn && bookmarkletModal) {
        importBeatportBtn.addEventListener('click', () => {
            const currentOrigin = window.location.origin;
            const code = `javascript:(function(){const match=document.documentElement.innerHTML.match(/<script id="__NEXT_DATA__" type="application\\/json">([\\s\\S]*?)<\\/script>/);if(!match){alert("NEXT_DATA introuvable. Veuillez exécuter ce favori sur une page de morceaux Beatport.");return;}const data=JSON.parse(match[1]);const queries=data?.props?.pageProps?.dehydratedState?.queries||[];let tracks=[];for(const q of queries){const qd=q?.state?.data;if(qd&&Array.isArray(qd.results)&&qd.results.length>0){const qk=q?.queryKey||[];if(qk.some(k=>typeof k==="string"&&k.startsWith("tracks"))||tracks.length===0){tracks=qd.results;}}}if(tracks.length===0){alert("Aucun morceau trouvé dans les données de la page.");return;}window.opener.postMessage({type:"BP_IMPORT",tracks:tracks},"${currentOrigin}");alert("Importation réussie! "+tracks.length+" morceaux envoyés vers DJ Tool.");})();`;
            bookmarkletLink.href = code;
            bookmarkletModal.classList.remove('hidden');
        });
    }

    // Token bookmarklet link setup
    const tokenBookmarkletLink = document.getElementById('token-bookmarklet-link');
    if (tokenBookmarkletLink) {
        const currentOrigin = window.location.origin + window.location.pathname;
        const code = `javascript:(function(){
            var userStr = localStorage.getItem('bpuser');
            if (!userStr) {
                if (confirm("Vous n'êtes pas connecté sur Beatport. Ouvrir la page de connexion ?")) {
                    window.open('https://api.beatport.com/v4/docs/', '_blank');
                }
                return;
            }
            try {
                var user = JSON.parse(userStr);
                var token = user.token || user.access_token || (user.userData && user.userData.token);
                if (!token && user.userData) token = user.userData.access_token;
                if (!token) {
                    function findToken(obj) {
                        if (typeof obj !== 'object' || obj === null) return null;
                        if (obj.access_token) return obj.access_token;
                        if (obj.token) return obj.token;
                        for (var k in obj) {
                            var t = findToken(obj[k]);
                            if (t) return t;
                        }
                        return null;
                    }
                    token = findToken(user);
                }
                if (!token) {
                    alert("Jeton non trouvé. Veuillez vous déconnecter et vous reconnecter sur Beatport, puis réessayez.");
                    return;
                }
                window.location.href = '${currentOrigin}#access_token=' + encodeURIComponent(token);
            } catch(e) {
                alert("Erreur : " + e.message);
            }
        })();`;
        tokenBookmarkletLink.href = code.replace(/\s+/g, ' ');
    }

    if (bookmarkletClose) {
        bookmarkletClose.addEventListener('click', () => {
            bookmarkletModal.classList.add('hidden');
            bookmarkletWaiting.classList.add('hidden');
        });
    }

    if (bookmarkletOpenBp) {
        bookmarkletOpenBp.addEventListener('click', () => {
            const start = startDateInput.value;
            const end = endDateInput.value;
            const bpUrl = `https://www.beatport.com/fr/genre/${currentGenreSlug}/${currentGenreId}/tracks?publish_date=${start}%3A${end}&page=${currentPage}&per_page=150`;
            window.open(bpUrl, '_blank');
            bookmarkletWaiting.classList.remove('hidden');
        });
    }

    // Listen to message from bookmarklet popup
    window.addEventListener('message', (event) => {
        if (event.origin !== window.location.origin) return;
        if (event.data && event.data.type === 'BP_IMPORT' && Array.isArray(event.data.tracks)) {
            const tracks = event.data.tracks;
            console.log(`[Import] Received ${tracks.length} tracks from bookmarklet.`);
            const start = startDateInput.value;
            const end = endDateInput.value;
            saveToCache(currentGenreId, currentGenreSlug, start, end, tracks);
            
            allTracks = tracks;
            const collabCount = allTracks.filter(t => t.artists && t.artists.length >= 2).length;
            collabBadge.innerText = collabCount;
            totalImportedSpan.innerText = allTracks.length;
            
            const hasNext = allTracks.length === 150;
            btnNextPage.disabled = !hasNext;
            btnNextPageBottom.disabled = !hasNext;
            
            applyFiltersAndRender();
            hideCacheBanner();
            
            bookmarkletModal.classList.add('hidden');
            bookmarkletWaiting.classList.add('hidden');
            
            alert(`✓ ${tracks.length} morceaux importés avec succès depuis Beatport !`);
        }
    });

    // Settings modal events (simplified - auto-auth via Vercel env vars)
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsCloseBtn = document.getElementById('settings-modal-close');
    const settingsRefreshBtn = document.getElementById('settings-refresh-btn');

    if (settingsBtn && settingsModal) {
        settingsBtn.addEventListener('click', () => {
            settingsModal.classList.remove('hidden');
        });
    }

    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });
    }

    // Close on backdrop click
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) settingsModal.classList.add('hidden');
        });
    }

    if (settingsRefreshBtn) {
        settingsRefreshBtn.addEventListener('click', () => {
            settingsModal.classList.add('hidden');
            currentPage = 1;
            fetchTracks();
        });
    }

    // Theme toggle (Light/Dark mode)
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const themeIconSun = document.getElementById('theme-icon-sun');
    const themeIconMoon = document.getElementById('theme-icon-moon');

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            document.body.classList.toggle('light-mode');
            const isLight = document.body.classList.contains('light-mode');
            localStorage.setItem('dj_theme', isLight ? 'light' : 'dark');
            
            if (isLight) {
                themeIconSun.classList.remove('hidden');
                themeIconMoon.classList.add('hidden');
            } else {
                themeIconSun.classList.add('hidden');
                themeIconMoon.classList.remove('hidden');
            }
        });
    }
}

function updateVolumeIcon() {
    if (isMuted || volumeSlider.value == 0) {
        volumeIcon.classList.add('hidden');
        muteIcon.classList.remove('hidden');
    } else {
        volumeIcon.classList.remove('hidden');
        muteIcon.classList.add('hidden');
    }
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, '0')}`;
}

// Envoie la durée et la position actuelle de lecture à l'OS (et donc à la platine Denon DJ via Bluetooth)
function updateMediaSessionPositionState() {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && wavesurfer && currentPlayingTrack) {
        try {
            const duration = wavesurfer.getDuration();
            const position = wavesurfer.getCurrentTime();
            
            if (isFinite(duration) && duration > 0 && isFinite(position) && position >= 0 && position <= duration) {
                navigator.mediaSession.setPositionState({
                    duration: duration,
                    playbackRate: wavesurfer.getPlaybackRate() || 1,
                    position: position
                });
            }
        } catch (e) {
        }
    }
}

// --- AI ASSISTANT SYSTEM (Gemini 1.5 Flash Integration) ---
const GEMINI_API_KEY = "AIzaSyA72FVAbnQqyybCS6NMAesXVkjyV7D6ozc"; // Key from .env

let aiChatMessages = [];
let playHistory = []; // Tracks played during this session

function addToPlayHistory(track) {
    if (playHistory.length === 0 || playHistory[playHistory.length - 1].id !== track.id) {
        playHistory.push(track);
        // Limit to 8 items to save prompt context tokens
        if (playHistory.length > 8) playHistory.shift();
    }
}

// Generates real-time state information for the Gemini model
function getRealTimeContext() {
    let ctx = "--- CONTEXTE DJ EN TEMPS RÉEL (Session en cours) ---\n";
    
    // 1. Current track
    if (currentPlayingTrack) {
        const artists = currentPlayingTrack.artists.map(a => a.name).join(', ');
        const keyName = currentPlayingTrack.key ? `${currentPlayingTrack.key.name} (${currentPlayingTrack.key.camelot_number}${currentPlayingTrack.key.camelot_letter})` : 'Inconnue';
        const isPlaying = wavesurfer && wavesurfer.isPlaying();
        ctx += `Piste actuellement sur le deck : "${currentPlayingTrack.name}" par ${artists} | BPM: ${currentPlayingTrack.bpm || 'NC'} | Clé: ${keyName} | Statut: ${isPlaying ? 'EN LECTURE' : 'EN PAUSE'}\n`;
    } else {
        ctx += "Piste actuellement sur le deck : Aucun morceau n'est actuellement chargé.\n";
    }
    
    // 2. Play history
    if (playHistory.length > 0) {
        ctx += "Historique des morceaux joués lors de cette session DJ (dans l'ordre) :\n";
        playHistory.forEach((t, idx) => {
            const artists = t.artists.map(a => a.name).join(', ');
            ctx += `  - [Joué #${idx + 1}] "${t.name}" par ${artists}\n`;
        });
    }
    
    // 3. Queue suggestions from list
    if (filteredTracks.length > 0) {
        ctx += `Nombre total de morceaux chargés à l'écran : ${filteredTracks.length}\n`;
        if (currentPlayingTrack) {
            const currentIndex = filteredTracks.findIndex(t => t.id === currentPlayingTrack.id);
            if (currentIndex !== -1 && currentIndex < filteredTracks.length - 1) {
                ctx += "Prochains morceaux disponibles dans la liste Beatport :\n";
                const nextTracks = filteredTracks.slice(currentIndex + 1, currentIndex + 6);
                nextTracks.forEach((t, idx) => {
                    const artists = t.artists.map(a => a.name).join(', ');
                    const keyName = t.key ? `${t.key.name} (${t.key.camelot_number}${t.key.camelot_letter})` : 'Inconnue';
                    ctx += `  - [Suivant #${idx + 1}] "${t.name}" par ${artists} (BPM: ${t.bpm || 'NC'}, Clé: ${keyName})\n`;
                });
            }
        }
    }
    ctx += "----------------------------------------------------\n\n";
    return ctx;
}

function updateAILiveStatus(isPlaying) {
    const liveStatus = document.getElementById('ai-live-status');
    const liveStatusText = document.getElementById('ai-live-status-text');
    if (!liveStatus || !liveStatusText) return;
    
    if (currentPlayingTrack) {
        const artists = currentPlayingTrack.artists.map(a => a.name).join(', ');
        const keyName = currentPlayingTrack.key ? `${currentPlayingTrack.key.camelot_number}${currentPlayingTrack.key.camelot_letter}` : 'NC';
        const bpm = currentPlayingTrack.bpm ? `${currentPlayingTrack.bpm} BPM` : 'NC';
        
        if (isPlaying) {
            liveStatus.classList.add('playing');
            liveStatusText.innerText = `Joue : "${currentPlayingTrack.name}" (${artists}) [${keyName} | ${bpm}]`;
        } else {
            liveStatus.classList.remove('playing');
            liveStatusText.innerText = `Pause : "${currentPlayingTrack.name}" (${artists})`;
        }
    } else {
        liveStatus.classList.remove('playing');
        liveStatusText.innerText = "Lecteur inactif";
    }
}

// --- FIND SIMILAR TRACKS BY AI ---
window.findSimilarTracks = async function(track, event) {
    if (event) event.stopPropagation(); // Stop parent play event triggering
    
    // Open AI drawer
    const aiDrawer = document.getElementById('ai-drawer');
    if (aiDrawer) aiDrawer.classList.add('open');
    
    const aiResultsBox = document.getElementById('ai-results-box');
    const aiAnalysisText = document.getElementById('ai-analysis-text');
    if (!aiResultsBox || !aiAnalysisText) return;
    
    aiResultsBox.classList.remove('hidden');
    aiAnalysisText.innerHTML = `<span style="color: #c084fc;">Recherche de morceaux similaires par l'IA pour "${track.name}"...</span>`;
    
    try {
        const artists = track.artists.map(a => a.name).join(', ');
        const keyName = track.key ? `${track.key.name} (${track.key.camelot_number}${track.key.camelot_letter})` : 'Inconnue';
        
        const prompt = `Voici un morceau de musique :
Titre : "${track.name}"
Artistes : ${artists}
BPM : ${track.bpm || 'NC'}
Clé : ${keyName}

Propose-moi une liste de 5 morceaux similaires (bien connus, dans le même genre ou style musical) pour faire un set DJ. 
Pour chaque morceau suggéré, indique :
1. Titre et Artiste
2. Son BPM et sa clé Camelot probable
3. Une phrase expliquant pourquoi l'enchaînement avec notre morceau de départ serait techniquement et musicalement excellent (transition de clé, énergie, vibes).

Réponds de manière concise, structurée et professionnelle en français.`;

        const responseText = await callGeminiAPI([{"role": "user", "parts": [{"text": prompt}]}]);
        aiAnalysisText.innerText = responseText;
        
        // Populate chat history
        aiChatMessages = [
            {"role": "user", "parts": [{"text": `Trouve des morceaux similaires à "${track.name}" par ${artists}.`}]},
            {"role": "model", "parts": [{"text": responseText}]}
        ];
        
        const aiChatHistory = document.getElementById('ai-chat-history');
        if (aiChatHistory) {
            aiChatHistory.innerHTML = '';
            const bubbleUser = document.createElement('div');
            bubbleUser.className = 'chat-bubble user';
            bubbleUser.innerText = `Similaires à : ${track.name}`;
            
            const bubbleAI = document.createElement('div');
            bubbleAI.className = 'chat-bubble ai';
            bubbleAI.innerText = responseText;
            
            aiChatHistory.appendChild(bubbleUser);
            aiChatHistory.appendChild(bubbleAI);
            aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
        }
    } catch (err) {
        console.error(err);
        aiAnalysisText.innerHTML = `<span style="color: #fca5a5;">Erreur de recherche : ${err.message}</span>`;
    }
};

function setupAISystem() {
    const aiToggleBtn = document.getElementById('ai-toggle-btn');
    const aiCloseBtn = document.getElementById('ai-close-btn');
    const aiDrawer = document.getElementById('ai-drawer');
    const aiAnalyzeBtn = document.getElementById('ai-analyze-btn');
    const aiDesignBtn = document.getElementById('ai-design-btn');
    const aiResultsBox = document.getElementById('ai-results-box');
    const aiAnalysisText = document.getElementById('ai-analysis-text');
    const aiChatHistory = document.getElementById('ai-chat-history');
    const aiChatInput = document.getElementById('ai-chat-input');
    const aiChatSendBtn = document.getElementById('ai-chat-send-btn');
    
    if (!aiToggleBtn) return;
    
    // Open/Close Drawer
    aiToggleBtn.addEventListener('click', () => {
        aiDrawer.classList.toggle('open');
        if (aiDrawer.classList.contains('open')) {
            aiChatInput.focus();
            const isPlaying = wavesurfer && wavesurfer.isPlaying();
            updateAILiveStatus(isPlaying);
        }
    });
    
    aiCloseBtn.addEventListener('click', () => {
        aiDrawer.classList.remove('open');
    });
    
    // Close on click outside drawer
    document.addEventListener('click', (e) => {
        if (aiDrawer.classList.contains('open') && 
            !aiDrawer.contains(e.target) && 
            !aiToggleBtn.contains(e.target)) {
            aiDrawer.classList.remove('open');
        }
    });
    
    // Analyze Playlist Button Action
    aiAnalyzeBtn.addEventListener('click', async () => {
        if (filteredTracks.length === 0) {
            alert("Aucun morceau chargé dans la playlist à analyser.");
            return;
        }
        
        aiAnalyzeBtn.classList.add('loading');
        aiAnalyzeBtn.disabled = true;
        aiAnalyzeBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
            <span>Analyse...</span>
        `;
        
        try {
            const tracksSummary = filteredTracks.map((t, idx) => {
                const artists = t.artists.map(a => a.name).join(', ');
                const keyName = t.key ? `${t.key.name} (${t.key.camelot_number}${t.key.camelot_letter})` : 'Inconnue';
                return `${idx + 1}. "${t.name}" - ${artists} | BPM: ${t.bpm || 'NC'} | Clé: ${keyName}`;
            }).join('\n');
            
            const liveContext = getRealTimeContext();
            const systemPrompt = `${liveContext}Voici les morceaux de ma playlist Beatport actuelle :\n\n${tracksSummary}\n\nAgis comme un DJ professionnel expert en mixage harmonique. Analyse cette sélection et fournis :\n1. Une suggestion d'enchaînement (ordre de passage) optimisée pour monter en énergie ou maintenir une harmonie fluide (en te basant sur la clé Camelot et le BPM).\n2. Identifie les meilleures transitions (ex: 8A vers 9A ou 8A vers 8B).\n3. Propose des idées d'améliorations générales pour ce set de DJ (ex: si le BPM est trop homogène, s'il manque des collaborations, etc.).\n\nRédige une réponse claire, concise, structurée et motivante en français.`;
            
            const responseText = await callGeminiAPI([{"role": "user", "parts": [{"text": systemPrompt}]}]);
            
            aiAnalysisText.innerText = responseText;
            aiResultsBox.classList.remove('hidden');
            
            aiChatMessages = [
                {"role": "user", "parts": [{"text": "Analyse ma playlist Beatport en temps réel et propose un enchaînement DJ."}]},
                {"role": "model", "parts": [{"text": responseText}]}
            ];
            
            renderChatHistory();
            
        } catch (err) {
            console.error(err);
            aiAnalysisText.innerHTML = `<span style="color: #fca5a5;">Erreur d'analyse : ${err.message}</span>`;
            aiResultsBox.classList.remove('hidden');
        } finally {
            aiAnalyzeBtn.classList.remove('loading');
            aiAnalyzeBtn.disabled = false;
            aiAnalyzeBtn.innerHTML = `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
                <span>Analyser playlist</span>
            `;
        }
    });

    // Analyze Design & Layout (Multimodal screen capture analysis)
    if (aiDesignBtn) {
        aiDesignBtn.addEventListener('click', async () => {
            aiDesignBtn.classList.add('loading');
            aiDesignBtn.disabled = true;
            aiDesignBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>
                <span>Capture...</span>
            `;
            
            aiResultsBox.classList.remove('hidden');
            aiAnalysisText.innerHTML = `<span style="color: #c084fc;">Capture de l'écran en cours...</span>`;
            
            try {
                if (typeof html2canvas === 'undefined') {
                    throw new Error("La bibliothèque html2canvas n'a pas pu être chargée.");
                }
                
                // Close drawer momentarily for clean screenshot
                aiDrawer.classList.remove('open');
                await new Promise(r => setTimeout(r, 450));
                
                const canvas = await html2canvas(document.body, {
                    backgroundColor: "#08060d",
                    logging: false,
                    useCORS: true
                });
                
                // Reopen drawer and show thinking state
                aiDrawer.classList.add('open');
                aiAnalysisText.innerHTML = `<span style="color: #c084fc;">Analyse visuelle par Gemini 1.5 Flash...</span>`;
                
                const base64Image = canvas.toDataURL('image/jpeg', 0.85);
                const base64Data = base64Image.split(',')[1];
                
                const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
                const prompt = "Voici une capture d'écran de l'interface de mon outil de playlist Beatport Collab Finder. Analyse son design, son apparence, ses couleurs, ses contrastes, son ergonomie visuelle (notamment pour un DJ sur mobile) et propose 5 conseils d'optimisations très concrets et structurés pour améliorer l'apparence et l'usage de cette application.";
                
                const response = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                {
                                    inlineData: {
                                        mimeType: "image/jpeg",
                                        data: base64Data
                                    }
                                }
                            ]
                        }]
                    })
                });
                
                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    throw new Error(errData.error?.message || `HTTP ${response.status}`);
                }
                
                const responseData = await response.json();
                const responseText = responseData.candidates?.[0]?.content?.parts?.[0]?.text || "Aucune réponse générée.";
                
                aiAnalysisText.innerText = responseText;
                
                aiChatMessages = [
                    {"role": "user", "parts": [{"text": "Analyse le design de l'interface."}]},
                    {"role": "model", "parts": [{"text": responseText}]}
                ];
                
                renderChatHistory();
                
            } catch (err) {
                console.error(err);
                aiAnalysisText.innerHTML = `<span style="color: #fca5a5;">Erreur d'analyse visuelle : ${err.message}</span>`;
            } finally {
                aiDesignBtn.classList.remove('loading');
                aiDesignBtn.disabled = false;
                aiDesignBtn.innerHTML = `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>
                    <span>Analyser Design</span>
                `;
            }
        });
    }
    
    // Chat Sending
    async function sendMessage() {
        const query = aiChatInput.value.trim();
        if (!query) return;
        
        appendBubble('user', query);
        aiChatInput.value = '';
        
        aiChatInput.disabled = true;
        aiChatSendBtn.disabled = true;
        
        const thinkingBubble = appendBubble('ai', "L'assistant réfléchit...");
        
        try {
            aiChatMessages.push({"role": "user", "parts": [{"text": query}]});
            
            const contentsWithContext = JSON.parse(JSON.stringify(aiChatMessages));
            const lastIndex = contentsWithContext.length - 1;
            const liveContext = getRealTimeContext();
            
            contentsWithContext[lastIndex].parts[0].text = `${liveContext}Question de l'utilisateur : ${query}`;
            
            const responseText = await callGeminiAPI(contentsWithContext);
            
            thinkingBubble.innerText = responseText;
            aiChatMessages.push({"role": "model", "parts": [{"text": responseText}]});
            
        } catch (err) {
            thinkingBubble.classList.add('error');
            thinkingBubble.innerText = `Erreur : ${err.message}`;
            aiChatMessages.pop();
        } finally {
            aiChatInput.disabled = false;
            aiChatSendBtn.disabled = false;
            aiChatInput.focus();
            aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
        }
    }
    
    aiChatSendBtn.addEventListener('click', sendMessage);
    aiChatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
    
    function appendBubble(role, text) {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${role}`;
        bubble.innerText = text;
        aiChatHistory.appendChild(bubble);
        aiChatHistory.scrollTop = aiChatHistory.scrollHeight;
        return bubble;
    }
    
    function renderChatHistory() {
        aiChatHistory.innerHTML = '';
        const displayMessages = aiChatMessages.slice(1);
        displayMessages.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'ai';
            const text = msg.parts[0].text;
            appendBubble(role, text);
        });
    }
}

async function callGeminiAPI(contents) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ contents: contents })
    });
    
    if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Aucune réponse de l'IA.";
}

// --- FAVORITES MANAGEMENT ---
window.toggleFavorite = function(track, event) {
    if (event) event.stopPropagation();
    
    const idx = favorites.findIndex(t => t.id === track.id);
    if (idx === -1) {
        favorites.push(track);
    } else {
        favorites.splice(idx, 1);
    }
    saveFavorites();
    
    // Re-render if viewing favorites tab, otherwise update inline heart icon
    if (artFavRadio.checked) {
        applyFiltersAndRender();
    } else {
        const card = document.querySelector(`.track-card[data-id="${track.id}"]`);
        if (card) {
            const favBtn = card.querySelector('.btn-favorite');
            const heartIcon = card.querySelector('.heart-icon');
            const isFavNow = favorites.some(t => t.id === track.id);
            if (favBtn && heartIcon) {
                favBtn.title = isFavNow ? "Retirer des favoris" : "Ajouter aux favoris";
                heartIcon.classList.toggle('active', isFavNow);
                heartIcon.setAttribute('fill', isFavNow ? 'currentColor' : 'none');
            }
        }
    }
    
    // Also update player heart icon if the toggled track is the active one
    if (currentPlayingTrack && currentPlayingTrack.id === track.id) {
        const playerFavBtn = document.getElementById('player-btn-favorite');
        if (playerFavBtn) {
            const isFavNow = favorites.some(t => t.id === track.id);
            playerFavBtn.title = isFavNow ? "Retirer des favoris" : "Ajouter aux favoris";
            const heartIcon = playerFavBtn.querySelector('.heart-icon');
            if (heartIcon) {
                heartIcon.classList.toggle('active', isFavNow);
                heartIcon.setAttribute('fill', isFavNow ? 'currentColor' : 'none');
            }
        }
    }
};

function saveFavorites() {
    localStorage.setItem('dj_favorites', JSON.stringify(favorites));
    updateFavBadge();
}

function updateFavBadge() {
    const favBadge = document.getElementById('fav-badge');
    if (favBadge) {
        favBadge.innerText = favorites.length;
    }
}

function addToPlayedTracks(trackId) {
    if (!playedTracks.includes(trackId)) {
        playedTracks.push(trackId);
        localStorage.setItem('dj_played_tracks', JSON.stringify(playedTracks));
        // Update the card UI color immediately
        const card = document.querySelector(`.track-card[data-id="${trackId}"]`);
        if (card) {
            card.classList.add('played');
        }
        updateUnplayedBadge();
        
        // If we are on the unplayed filter view, we should re-apply filters to hide it
        const checkedFilter = document.querySelector('input[name="artist-filter"]:checked');
        if (checkedFilter && checkedFilter.value === 'unplayed') {
            applyFiltersAndRender();
        }
    }
}

function updateUnplayedBadge() {
    const unplayedBadge = document.getElementById('unplayed-badge');
    if (unplayedBadge) {
        const unplayedCount = allTracks.filter(t => !playedTracks.includes(t.id)).length;
        unplayedBadge.innerText = unplayedCount;
    }
}

// Keep-alive silent audio to prevent mobile browsers from suspending the tab in standby mode
let keepAliveAudio = null;

function startSilentKeepAlive() {
    try {
        if (!keepAliveAudio) {
            keepAliveAudio = document.createElement('audio');
            // 1 second of silent mono WAV (46 bytes PCM)
            keepAliveAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAPSDAAABAAgAZGF0YQQAAAAAAA==';
            keepAliveAudio.loop = true;
            keepAliveAudio.volume = 0.001; // extremely low volume to keep the audio channel active
            keepAliveAudio.playsInline = true;
            keepAliveAudio.setAttribute('playsinline', 'true');
            keepAliveAudio.style.display = 'none';
            document.body.appendChild(keepAliveAudio);
        }
        
        if (keepAliveAudio.paused) {
            keepAliveAudio.play().then(() => {
                console.log('[KeepAlive] Background silent audio loop active.');
            }).catch(err => {
                console.warn('[KeepAlive] Failed to start silent loop:', err.message);
            });
        }
    } catch (e) {
        console.warn('[KeepAlive] Error:', e.message);
    }
}

