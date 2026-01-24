-- Streamly D1 Database Schema

-- Genres table
CREATE TABLE IF NOT EXISTS genres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tmdb_id INTEGER UNIQUE,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Platforms table
CREATE TABLE IF NOT EXISTS platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    tmdb_provider_id INTEGER UNIQUE,
    logo_url TEXT,
    website_url TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Contents table (movies and dramas)
CREATE TABLE IF NOT EXISTS contents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    title_en TEXT,
    content_type TEXT NOT NULL CHECK (content_type IN ('movie', 'drama')),
    poster_url TEXT,
    backdrop_url TEXT,
    overview TEXT,
    release_date TEXT,
    rating REAL DEFAULT 0,
    popularity REAL DEFAULT 0,
    runtime INTEGER,
    director TEXT,
    vote_count INTEGER DEFAULT 0,
    is_adult INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Content genres (many-to-many)
CREATE TABLE IF NOT EXISTS content_genres (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL,
    genre_id INTEGER NOT NULL,
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE,
    UNIQUE(content_id, genre_id)
);

-- Content platforms (where content is available)
CREATE TABLE IF NOT EXISTS content_platforms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL,
    platform_id INTEGER NOT NULL,
    available_from TEXT,
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE,
    FOREIGN KEY (platform_id) REFERENCES platforms(id) ON DELETE CASCADE,
    UNIQUE(content_id, platform_id)
);

-- Content cast (actors)
CREATE TABLE IF NOT EXISTS content_cast (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    character_name TEXT,
    profile_url TEXT,
    order_num INTEGER DEFAULT 0,
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);

-- YouTube reviews
CREATE TABLE IF NOT EXISTS youtube_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content_id INTEGER NOT NULL,
    video_id TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    channel_name TEXT,
    thumbnail_url TEXT,
    view_count INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    published_at TEXT,
    youtube_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_contents_type ON contents(content_type);
CREATE INDEX IF NOT EXISTS idx_contents_rating ON contents(rating DESC);
CREATE INDEX IF NOT EXISTS idx_contents_popularity ON contents(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_contents_release_date ON contents(release_date DESC);
CREATE INDEX IF NOT EXISTS idx_content_genres_content ON content_genres(content_id);
CREATE INDEX IF NOT EXISTS idx_content_genres_genre ON content_genres(genre_id);
CREATE INDEX IF NOT EXISTS idx_youtube_reviews_content ON youtube_reviews(content_id);
