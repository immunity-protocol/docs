/**
 * Client-side fuzzy search for documentation.
 *
 * Loads /docs/search.json on first open, then filters results as you type.
 * Supports keyboard navigation (up/down arrows, Enter, Escape).
 */
(function () {
    'use strict';

    var overlay = document.getElementById('search-overlay');
    var input = document.getElementById('search-input');
    var resultsContainer = document.getElementById('search-results');
    var searchIndex = null;
    var activeIndex = -1;

    if (!overlay || !input || !resultsContainer) return;

    // ── Public API (called from nav button) ────────────────────
    window.openSearch = function () {
        overlay.classList.add('active');
        input.value = '';
        input.focus();
        renderEmpty();
        loadIndex();
    };

    window.closeSearch = function () {
        overlay.classList.remove('active');
        activeIndex = -1;
    };

    // ── Keyboard shortcuts ─────────────────────────────────────
    document.addEventListener('keydown', function (e) {
        // Ctrl+K or Cmd+K to open
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (overlay.classList.contains('active')) {
                window.closeSearch();
            } else {
                window.openSearch();
            }
            return;
        }

        if (!overlay.classList.contains('active')) return;

        if (e.key === 'Escape') {
            e.preventDefault();
            window.closeSearch();
            return;
        }

        var items = resultsContainer.querySelectorAll('.search-result-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = Math.min(activeIndex + 1, items.length - 1);
            updateActiveItem(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            updateActiveItem(items);
        } else if (e.key === 'Enter' && activeIndex >= 0 && items[activeIndex]) {
            e.preventDefault();
            var href = items[activeIndex].getAttribute('href');
            if (href) {
                window.location.href = href;
            }
        }
    });

    // Close when clicking overlay background.
    overlay.addEventListener('click', function (e) {
        if (e.target === overlay) {
            window.closeSearch();
        }
    });

    // Search on input.
    input.addEventListener('input', function () {
        var query = input.value.trim().toLowerCase();
        if (query.length < 2) {
            renderEmpty();
            return;
        }
        var results = search(query);
        renderResults(results, query);
    });

    // ── Search logic ───────────────────────────────────────────
    function search(query) {
        if (!searchIndex) return [];

        var terms = query.split(/\s+/);
        var scored = [];

        searchIndex.forEach(function (entry) {
            var score = 0;
            var titleLower = entry.title.toLowerCase();
            var excerptLower = entry.excerpt.toLowerCase();
            var headingsLower = entry.headings.map(function (h) { return h.toLowerCase(); });

            terms.forEach(function (term) {
                // Title match (high weight).
                if (titleLower.indexOf(term) !== -1) {
                    score += titleLower === term ? 100 : 50;
                }

                // Heading match (medium weight).
                headingsLower.forEach(function (h) {
                    if (h.indexOf(term) !== -1) score += 20;
                });

                // Excerpt match (low weight).
                if (excerptLower.indexOf(term) !== -1) {
                    score += 10;
                }

                // Section match.
                if (entry.section.indexOf(term) !== -1) {
                    score += 5;
                }
            });

            if (score > 0) {
                scored.push({ entry: entry, score: score });
            }
        });

        scored.sort(function (a, b) { return b.score - a.score; });
        return scored.slice(0, 10).map(function (s) { return s.entry; });
    }

    // ── Rendering ──────────────────────────────────────────────
    function renderEmpty() {
        activeIndex = -1;
        resultsContainer.innerHTML =
            '<div class="search-empty">Type to search the documentation...</div>';
    }

    function renderResults(results, query) {
        activeIndex = -1;

        if (results.length === 0) {
            resultsContainer.innerHTML =
                '<div class="search-empty">No results found for "' + escapeHtml(query) + '"</div>';
            return;
        }

        var html = '';
        results.forEach(function (entry) {
            var sectionLabel = entry.section.replace(/-/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
            html +=
                '<a href="' + entry.url + '" class="search-result-item">' +
                '<div class="search-result-title">' + highlight(entry.title, query) + '</div>' +
                '<div class="search-result-section">' + sectionLabel + '</div>' +
                '<div class="search-result-excerpt">' + highlight(truncate(entry.excerpt, 120), query) + '</div>' +
                '</a>';
        });
        resultsContainer.innerHTML = html;
    }

    function updateActiveItem(items) {
        items.forEach(function (item, i) {
            if (i === activeIndex) {
                item.classList.add('active');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('active');
            }
        });
    }

    // ── Helpers ─────────────────────────────────────────────────
    function loadIndex() {
        if (searchIndex) return;
        var baseUrl = (document.querySelector('meta[name="leaf-base-url"]') || {}).content || '';
        fetch(baseUrl + '/search.json')
            .then(function (r) { return r.json(); })
            .then(function (data) { searchIndex = data; })
            .catch(function () { searchIndex = []; });
    }

    function highlight(text, query) {
        var terms = query.split(/\s+/).filter(function (t) { return t.length > 0; });
        if (terms.length === 0) return escapeHtml(text);

        var escaped = escapeHtml(text);
        terms.forEach(function (term) {
            var re = new RegExp('(' + escapeRegex(escapeHtml(term)) + ')', 'gi');
            escaped = escaped.replace(re, '<mark style="background:var(--accent-glow);color:var(--accent-light);padding:0 2px;border-radius:2px;">$1</mark>');
        });
        return escaped;
    }

    function truncate(str, len) {
        return str.length > len ? str.substring(0, len) + '...' : str;
    }

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
})();
