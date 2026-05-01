/**
 * Sidebar scroll-to-active, TOC scroll tracking, and mobile navigation.
 *
 * 1. Scrolls the sidebar so the active link is visible on page load.
 * 2. Tracks scroll position to highlight the current heading in the TOC.
 * 3. Handles mobile hamburger menu and sidebar drawer.
 */
(function () {
    'use strict';

    // ── Sidebar: scroll active link into view ──────────────────
    var activeLink = document.querySelector('.sidebar-link.active');
    if (activeLink) {
        var sidebar = document.querySelector('.docs-sidebar');
        if (sidebar) {
            setTimeout(function () {
                activeLink.scrollIntoView({ block: 'center', behavior: 'instant' });
            }, 50);
        }
    }

    // ── TOC: scroll-spy for heading tracking ───────────────────
    var tocLinks = document.querySelectorAll('.toc-link');
    if (tocLinks.length > 0) {
        var headingIds = [];
        tocLinks.forEach(function (link) {
            var href = link.getAttribute('href');
            if (href && href.startsWith('#')) {
                headingIds.push(href.substring(1));
            }
        });

        if (headingIds.length > 0) {
            var navHeight = parseInt(
                getComputedStyle(document.documentElement).getPropertyValue('--nav-height') || '64',
                10
            );
            var offset = navHeight + 32;

            function updateActiveToc() {
                var currentId = null;
                var scrollY = window.scrollY || window.pageYOffset;

                for (var i = headingIds.length - 1; i >= 0; i--) {
                    var el = document.getElementById(headingIds[i]);
                    if (el && el.getBoundingClientRect().top <= offset) {
                        currentId = headingIds[i];
                        break;
                    }
                }

                if (currentId === null && scrollY < 100) {
                    currentId = headingIds[0];
                }

                tocLinks.forEach(function (link) {
                    var href = link.getAttribute('href');
                    if (href === '#' + currentId) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            }

            var ticking = false;
            window.addEventListener('scroll', function () {
                if (!ticking) {
                    requestAnimationFrame(function () {
                        updateActiveToc();
                        ticking = false;
                    });
                    ticking = true;
                }
            }, { passive: true });

            updateActiveToc();
        }
    }

    // ── Mobile: nav toggle (hamburger opens sidebar) ───────────
    window.toggleNav = function () {
        var sidebar = document.querySelector('.docs-sidebar');
        var overlay = document.querySelector('.sidebar-overlay');
        var openIcon = document.querySelector('.nav-toggle-open');
        var closeIcon = document.querySelector('.nav-toggle-close');

        if (sidebar) {
            var isActive = sidebar.classList.toggle('active');
            if (overlay) overlay.classList.toggle('active', isActive);
            if (openIcon) openIcon.style.display = isActive ? 'none' : 'block';
            if (closeIcon) closeIcon.style.display = isActive ? 'block' : 'none';
            document.body.style.overflow = isActive ? 'hidden' : '';
        }
    };

    window.closeSidebar = function () {
        var sidebar = document.querySelector('.docs-sidebar');
        var overlay = document.querySelector('.sidebar-overlay');
        var openIcon = document.querySelector('.nav-toggle-open');
        var closeIcon = document.querySelector('.nav-toggle-close');

        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
        if (openIcon) openIcon.style.display = 'block';
        if (closeIcon) closeIcon.style.display = 'none';
        document.body.style.overflow = '';
    };

    // Close sidebar when a link is clicked (mobile)
    document.querySelectorAll('.sidebar-link').forEach(function (link) {
        link.addEventListener('click', function () {
            if (window.innerWidth <= 768) {
                closeSidebar();
            }
        });
    });

    // Close sidebar on window resize if going back to desktop
    window.addEventListener('resize', function () {
        if (window.innerWidth > 768) {
            closeSidebar();
        }
    });
})();
