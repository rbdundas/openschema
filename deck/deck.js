'use strict';

/**
 * Whitepaper navigation.
 *
 * The server already gates /deck behind a valid session cookie; this script
 * confirms the session (and grabs the username for display), then drives the
 * single-page deck: hash routing, prev/next, keyboard arrows, and the TOC.
 * Each section is its own addressable "page" via the URL hash (e.g. #vision).
 */
(function () {
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc-list a[data-page]'));
  var pages = Array.prototype.slice.call(document.querySelectorAll('.page'));
  var order = links.map(function (a) {
    return a.getAttribute('href').slice(1); // "#vision" -> "vision"
  });

  var topbarLoc = document.getElementById('topbar-loc');
  var progress = document.getElementById('progress');
  var prevBtn = document.getElementById('prev-btn');
  var nextBtn = document.getElementById('next-btn');
  var pagesEl = document.getElementById('pages');
  var rail = document.getElementById('rail');
  var railToggle = document.getElementById('rail-toggle');

  var current = 0;

  function pageEl(name) {
    return document.getElementById('page-' + name);
  }

  function show(name, opts) {
    var idx = order.indexOf(name);
    if (idx < 0) idx = 0;
    current = idx;
    var activeName = order[idx];

    pages.forEach(function (p) {
      p.classList.toggle('is-active', p.id === 'page-' + activeName);
    });
    links.forEach(function (a, i) {
      var on = i === idx;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'true');
      } else {
        a.removeAttribute('aria-current');
      }
    });

    var el = pageEl(activeName);
    var label = (el && el.getAttribute('data-title')) || activeName;
    topbarLoc.textContent = label;
    progress.textContent = pad(idx + 1) + ' / ' + pad(order.length);

    prevBtn.disabled = idx === 0;
    nextBtn.disabled = idx === order.length - 1;

    if (pagesEl) pagesEl.scrollTop = 0;

    if (!opts || !opts.silent) {
      if ('#' + activeName !== window.location.hash) {
        history.replaceState(null, '', '#' + activeName);
      }
    }

    // Move focus to the page for screen-reader/keyboard users, without scroll jump.
    if (el && opts && opts.focus) {
      el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
    closeRail();
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
  }

  function go(delta) {
    var next = current + delta;
    if (next < 0 || next >= order.length) return;
    show(order[next], { focus: true });
  }

  function fromHash() {
    var name = window.location.hash.slice(1);
    return order.indexOf(name) >= 0 ? name : order[0];
  }

  /* ---- Mobile rail ---- */
  function openRail() {
    rail.classList.add('is-open');
    railToggle.setAttribute('aria-expanded', 'true');
  }
  function closeRail() {
    rail.classList.remove('is-open');
    railToggle.setAttribute('aria-expanded', 'false');
  }

  /* ---- Wiring ---- */
  links.forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      show(a.getAttribute('href').slice(1), { focus: true });
    });
  });

  prevBtn.addEventListener('click', function () {
    go(-1);
  });
  nextBtn.addEventListener('click', function () {
    go(1);
  });

  railToggle.addEventListener('click', function () {
    if (rail.classList.contains('is-open')) {
      closeRail();
    } else {
      openRail();
    }
  });

  document.addEventListener('keydown', function (e) {
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
      go(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      go(-1);
    } else if (e.key === 'Escape') {
      closeRail();
    }
  });

  window.addEventListener('hashchange', function () {
    show(fromHash(), { silent: true });
  });

  /* ---- Logout ---- */
  var logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', function () {
      logoutBtn.disabled = true;
      fetch('/api/logout', { method: 'POST' }).finally(function () {
        window.location.assign('/');
      });
    });
  }

  /* ---- Confirm the session, then show the deck ---- */
  fetch('/api/me', { headers: { Accept: 'application/json' } })
    .then(function (res) {
      if (!res.ok) throw new Error('unauthenticated');
      return res.json();
    })
    .then(function (data) {
      var userEl = document.getElementById('rail-user');
      if (userEl && data && data.username) {
        userEl.textContent = 'Signed in · ' + data.username;
      }
    })
    .catch(function () {
      window.location.assign('/');
    });

  // Render immediately; the /api/me check runs in parallel and only bounces
  // anonymous visitors (the server has already gated this page).
  show(fromHash(), { silent: true });
})();
