/* ============================================================
   SCRIPT — Dott.ssa Angelica Frascarolo
   ------------------------------------------------------------
   1. Navbar: sfondo al scroll
   2. Reveal on scroll (IntersectionObserver)
   3. Menu mobile (hamburger)
   4. Scroll spy sulla navbar
   5. Recensioni: marquee automatico in loop continuo
   ============================================================ */
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function $(selector, scope) {
    return (scope || document).querySelector(selector);
  }

  function $$(selector, scope) {
    return Array.prototype.slice.call((scope || document).querySelectorAll(selector));
  }

  /* ==========================================================
     1. NAVBAR — cambia sfondo superati i 40px di scroll
     ========================================================== */
  function initNavbar() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    let scheduled = false;

    function update() {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
      scheduled = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );

    update();
  }

  /* ==========================================================
     2. REVEAL ON SCROLL — comparsa animata una sola volta
     ========================================================== */
  function initReveal() {
    const elements = $$('.reveal');
    if (!elements.length) return;

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      elements.forEach(function (el) {
        el.classList.add('active');
      });
      return;
    }

    const observer = new IntersectionObserver(
      function (entries, obs) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('active');
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    elements.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* ==========================================================
     3. MENU MOBILE
     ========================================================== */
  function initMobileMenu() {
    const hamburger = document.getElementById('hamburger');
    const menu = document.getElementById('mobileMenu');
    if (!hamburger || !menu) return;

    function isOpen() {
      return menu.classList.contains('active');
    }

    function setOpen(open) {
      hamburger.classList.toggle('active', open);
      menu.classList.toggle('active', open);
      document.body.classList.toggle('menu-open', open);
      hamburger.setAttribute('aria-expanded', String(open));
      hamburger.setAttribute('aria-label', open ? 'Chiudi menu' : 'Apri menu');
    }

    setOpen(false);

    hamburger.addEventListener('click', function () {
      setOpen(!isOpen());
    });

    // Chiude il menu al click su una voce
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    // Chiude con ESC
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && isOpen()) setOpen(false);
    });

    // Chiude cliccando fuori dal menu
    document.addEventListener('click', function (event) {
      if (!isOpen()) return;
      if (menu.contains(event.target) || hamburger.contains(event.target)) return;
      setOpen(false);
    });

    // Al ritorno al layout desktop il menu popup non deve restare aperto
    window.addEventListener('resize', function () {
      if (window.innerWidth > 992 && isOpen()) setOpen(false);
    });
  }

  /* ==========================================================
     4. SCROLL SPY — evidenzia la sezione corrente nella navbar
     ========================================================== */
  function initScrollSpy() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;

    const links = new Map();

    // Solo le voci principali: le scorciatoie del menu rapido restano escluse
    $$(':scope > a[href^="#"]', navLinks).forEach(function (link) {
      const id = link.getAttribute('href').slice(1);
      if (id) links.set(id, link);
    });

    if (!links.size) return;

    const sections = [];
    links.forEach(function (_link, id) {
      const section = document.getElementById(id);
      if (section) sections.push(section);
    });

    if (!sections.length) return;

    let scheduled = false;

    function update() {
      const probe = window.scrollY + window.innerHeight * 0.35;
      let activeId = null;

      sections.forEach(function (section) {
        if (section.offsetTop <= probe) activeId = section.id;
      });

      // In fondo alla pagina resta attiva l'ultima voce
      if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
        activeId = sections[sections.length - 1].id;
      }

      links.forEach(function (link, id) {
        link.classList.toggle('is-active', id === activeId);
      });

      scheduled = false;
    }

    window.addEventListener(
      'scroll',
      function () {
        if (scheduled) return;
        scheduled = true;
        window.requestAnimationFrame(update);
      },
      { passive: true }
    );

    window.addEventListener('resize', update);
    update();
  }

  /* ==========================================================
     5. RECENSIONI — marquee automatico in loop continuo
     ----------------------------------------------------------
     Il nastro è composto da due blocchi identici: quando il primo
     è uscito interamente a sinistra, l'offset viene riportato di
     un blocco esatto, così lo scorrimento riparte senza stacchi.
     ========================================================== */
  const REVIEWS = [
    {
      name: 'Giulia B.',
      role: 'Percorso Completo',
      stars: 5,
      text: 'Gli allenamenti in videochiamata hanno cambiato tutto: corregge la tecnica in tempo reale e adatta gli esercizi quando sento difficoltà. Mi sono sentita seguita sempre.',
    },
    {
      name: 'Davide M.',
      role: 'Percorso Autonomo',
      stars: 5,
      text: 'Ottimo anche in autonomia: scheda personalizzata, check periodici e supporto su WhatsApp quando ne ho bisogno. Professionale e disponibile.',
    },
    {
      name: 'Federica L.',
      role: 'Post parto',
      stars: 5,
      text: 'Dopo la gravidanza ero spaventata dall’idea di ripartire. Angelica ha costruito un percorso adatto alla mia fase, in accordo con la mia fisioterapista. Percorso serio e umano.',
    },
    {
      name: 'Marco R.',
      role: 'Percorso Guidato',
      stars: 5,
      text: 'Prima mi allenavo a caso senza vedere risultati. Con il programma di Angelica ho finalmente una struttura chiara e dopo 6 settimane ho notato un miglioramento reale.',
    },
    {
      name: 'Alessandro P.',
      role: 'Recupero post-infortunio',
      stars: 4,
      text: 'Dalla riabilitazione sono tornato ad allenarmi con sicurezza. Programmi progressivi, mai forzati, sempre rispettosi delle indicazioni del medico.',
    },
    {
      name: 'Chiara T.',
      role: 'Attività motoria adattata',
      stars: 5,
      text: 'Avevo provato schede generiche fallite tutte. Questa volta il programma teneva davvero conto delle mie possibilità. Costanza finalmente raggiunta!',
    },
    {
      name: 'Luca F.',
      role: 'Terza età',
      stars: 5,
      text: 'A 67 anni ho ritrovato mobilità ed equilibrio. Esercizi mirati, spiegati con pazienza e monitorati nel tempo. Consigliato a chi vuole restare attivo.',
    },
    {
      name: 'Sara D.',
      role: 'Percorso Guidato',
      stars: 5,
      text: 'Il confronto costante e gli aggiustamenti settimanali fanno la differenza. Non mi sono mai sentita un numero: il percorso è cambiato insieme a me.',
    },
  ];

  function createReviewCard(review) {
    const card = document.createElement('article');
    card.className = 'review-card';

    const head = document.createElement('div');
    head.className = 'review-head';

    const avatar = document.createElement('div');
    avatar.className = 'review-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = review.name.trim().charAt(0).toUpperCase();

    const meta = document.createElement('div');

    const name = document.createElement('p');
    name.className = 'review-name';
    name.textContent = review.name;

    const role = document.createElement('p');
    role.className = 'review-role';
    role.textContent = review.role;

    meta.appendChild(name);
    meta.appendChild(role);
    head.appendChild(avatar);
    head.appendChild(meta);

    const stars = document.createElement('div');
    stars.className = 'review-stars';
    stars.setAttribute('role', 'img');
    stars.setAttribute('aria-label', review.stars + ' stelle su 5');

    for (let i = 0; i < 5; i++) {
      const star = document.createElement('i');
      star.className = 'bx ' + (i < review.stars ? 'bxs-star' : 'bx-star');
      star.setAttribute('aria-hidden', 'true');
      stars.appendChild(star);
    }

    const text = document.createElement('p');
    text.className = 'review-text';
    text.textContent = review.text;

    card.appendChild(head);
    card.appendChild(stars);
    card.appendChild(text);

    return card;
  }

  function initReviewsMarquee() {
    const marquee = document.getElementById('marquee');
    const track = document.getElementById('marqueeTrack');
    if (!marquee || !track) return;

    const SPEED = 55; // pixel al secondo
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    let loopWidth = 0; // larghezza di un blocco + spazio tra i blocchi
    let offset = 0; // posizione corrente del nastro
    let frameId = null;
    let lastTime = 0;
    let paused = false;
    let inView = true;
    let lastViewportWidth = window.innerWidth;

    function createGroup(hiddenForA11y) {
      const group = document.createElement('div');
      group.className = 'marquee-group';
      if (hiddenForA11y) group.setAttribute('aria-hidden', 'true');
      REVIEWS.forEach(function (review) {
        group.appendChild(createReviewCard(review));
      });
      return group;
    }

    function frame(time) {
      frameId = window.requestAnimationFrame(frame);

      if (!lastTime) lastTime = time;
      const delta = Math.min((time - lastTime) / 1000, 0.05); // max 50ms per frame
      lastTime = time;

      if (paused || !inView || document.hidden || !loopWidth) return;

      offset -= SPEED * delta;

      if (offset <= -loopWidth) {
        offset += loopWidth; // riparte esattamente da capo, senza stacco
      }

      track.style.transform = 'translate3d(' + offset.toFixed(2) + 'px, 0, 0)';
    }

    function start() {
      if (frameId !== null) return;
      lastTime = 0;
      frameId = window.requestAnimationFrame(frame);
    }

    function stop() {
      if (frameId === null) return;
      window.cancelAnimationFrame(frameId);
      frameId = null;
    }

    function build() {
      stop();
      while (track.firstChild) track.removeChild(track.firstChild);

      track.style.transform = 'translate3d(0, 0, 0)';
      offset = 0;
      loopWidth = 0;

      const first = createGroup(false);
      track.appendChild(first);

      // Copie sufficienti a coprire anche gli schermi più larghi
      const minWidth = marquee.clientWidth;
      let guard = 0;
      while (first.scrollWidth < minWidth * 1.2 && guard < 8) {
        REVIEWS.forEach(function (review) {
          first.appendChild(createReviewCard(review));
        });
        guard += 1;
      }

      // Blocco identico che segue: garantisce la continuità visiva
      const clone = first.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      track.appendChild(clone);

      const gap = parseFloat(window.getComputedStyle(track).columnGap) || 0;
      loopWidth = first.getBoundingClientRect().width + gap;

      start();
    }

    // Pausa al passaggio del mouse (solo desktop, il touch non genera mouseleave)
    if (canHover) {
      marquee.addEventListener('pointerenter', function (event) {
        if (event.pointerType === 'mouse') paused = true;
      });
      marquee.addEventListener('pointerleave', function (event) {
        if (event.pointerType === 'mouse') paused = false;
      });
    }

    // Sospende l'animazione quando la sezione non è visibile
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          inView = entries[0].isIntersecting;
        },
        { threshold: 0.01 }
      ).observe(marquee);
    }

    // Ricostruisce solo su cambi di larghezza reali (evita reset da address bar mobile)
    let resizeTimer = null;
    window.addEventListener('resize', function () {
      if (Math.abs(window.innerWidth - lastViewportWidth) < 60) return;
      lastViewportWidth = window.innerWidth;
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 200);
    });

    build();
  }

  /* ==========================================================
     6. SPECIALIZZAZIONI — evidenziazione automatica a rotazione
     ----------------------------------------------------------
     Una card alla volta per 3 secondi; dopo l'ultima il ciclo
     si ferma 10 secondi e poi riparte dalla prima. Il passaggio
     del mouse prende il controllo e sospende la rotazione.
     ========================================================== */
  function initServiceCards() {
    const section = document.getElementById('specializzazioni');
    if (!section) return;

    const grid = $('.grid-3', section);
    const cards = $$('.service-card', section);
    if (!grid || !cards.length) return;

    const HOLD = 3000; // durata di ogni card
    const RESTART = 10000; // pausa dopo l'ultima card

    let timer = null;
    let index = -1;
    let hovering = false;
    let inView = false;

    function clearLit() {
      cards.forEach(function (card) {
        card.classList.remove('is-lit');
      });
    }

    function schedule(delay) {
      window.clearTimeout(timer);
      timer = window.setTimeout(step, delay);
    }

    function step() {
      timer = null;

      if (hovering || document.hidden) {
        schedule(HOLD);
        return;
      }

      index += 1;

      // Dopo l'ultima card: buio e pausa lunga prima di ripartire
      if (index >= cards.length) {
        clearLit();
        index = -1;
        schedule(RESTART);
        return;
      }

      cards.forEach(function (card, i) {
        card.classList.toggle('is-lit', i === index);
      });

      schedule(HOLD);
    }

    function start() {
      if (timer !== null) return;
      step();
    }

    function stop() {
      window.clearTimeout(timer);
      timer = null;
    }

    // Su desktop l'hover manuale ha la precedenza: ferma il ciclo
    grid.addEventListener('pointerenter', function (event) {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      hovering = true;
      clearLit();
      stop();
    });

    grid.addEventListener('pointerleave', function (event) {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      hovering = false;
      index = -1;
      if (inView) schedule(HOLD);
    });

    // Gira solo quando la sezione è visibile
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          inView = entries[0].isIntersecting;
          if (inView) {
            if (!hovering) start();
          } else {
            stop();
            clearLit();
            index = -1;
          }
        },
        { threshold: 0.15 }
      ).observe(section);
    } else {
      inView = true;
      start();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        stop();
      } else if (inView && !hovering) {
        start();
      }
    });
  }

  /* ==========================================================
     7. GRAFICO MORTALITÀ — entra in scena quando è visibile
     ----------------------------------------------------------
     Una sola volta: le barre salgono (3,4 s), i numeri contano
     fino al valore e la freccia si disegna. Volutamente lento.
     ========================================================== */
  function initMortalityChart() {
    const card = $('.mortality-card');
    if (!card) return;

    const values = $$('.mc-value[data-count]', card);
    const DURATION = 3800;
    let played = false;

    function countUp() {
      const start = performance.now();

      function frame(now) {
        const progress = Math.min((now - start) / DURATION, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        values.forEach(function (el) {
          el.textContent = Math.round(eased * Number(el.dataset.count)) + '%';
        });

        if (progress < 1) window.requestAnimationFrame(frame);
      }

      window.requestAnimationFrame(frame);
    }

    function play() {
      if (played) return;
      played = true;
      card.classList.add('is-active');
      countUp();
    }

    if (!('IntersectionObserver' in window)) {
      play();
      return;
    }

    new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) play();
      },
      { threshold: 0.3 }
    ).observe(card);
  }

  /* ==========================================================
     8. RACCOMANDAZIONI OMS — bottone "Scopri" che apre e chiude
     ========================================================== */
  function initWhoToggle() {
    const block = $('.who-block');
    if (!block) return;

    const button = $('.who-toggle', block);
    const panel = $('.who-panel', block);
    if (!button || !panel) return;

    const label = $('.who-toggle-label', button);

    function setOpen(open) {
      block.classList.toggle('is-open', open);
      button.setAttribute('aria-expanded', String(open));
      button.setAttribute('aria-label', open ? 'Nascondi le raccomandazioni dell\'OMS' : 'Scopri le raccomandazioni dell\'OMS');
      panel.setAttribute('aria-hidden', String(!open));
      if (label) label.textContent = open ? 'Nascondi' : 'Scopri';
    }

    setOpen(false);

    button.addEventListener('click', function () {
      setOpen(!block.classList.contains('is-open'));
    });
  }

  /* ==========================================================
     9. NAV — icona con il menu rapido delle scorciatoie
     ========================================================== */
  function initNavQuick() {
    const quick = document.getElementById('navQuick');
    if (!quick) return;

    const toggle = $('.nav-quick-toggle', quick);
    const menu = $('.nav-quick-menu', quick);
    if (!toggle || !menu) return;

    function setOpen(open) {
      quick.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    }

    // Click sull'icona: utile con la tastiera; il mouse apre già in hover
    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      setOpen(!quick.classList.contains('is-open'));
    });

    menu.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('click', function (event) {
      if (!quick.contains(event.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') setOpen(false);
    });
  }

  /* ==========================================================
     10. HERO — il titolo viene "scritto" carattere per carattere
     ========================================================== */
  function initHeroTyping() {
    const typed = $('.af-hero h1 .typed');
    if (!typed) return;

    const chars = [];

    try {
      $$('.typed-line', typed).forEach(function (line) {
        const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);

        nodes.forEach(function (node) {
          const text = node.nodeValue;
          if (!text) return;

          const frag = document.createDocumentFragment();
          for (let i = 0; i < text.length; i++) {
            const ch = document.createElement('span');
            ch.className = 'ch';
            chars.push(ch);
            ch.textContent = text[i] === ' ' ? '\u00A0' : text[i];
            frag.appendChild(ch);
          }
          node.parentNode.replaceChild(frag, node);
        });
      });
    } catch (error) {
      return;
    }

    if (!chars.length) return;

    /* Cursore lime: si sposta davanti al carattere successivo mentre scrive */
    const caret = document.createElement('span');
    caret.className = 'typed-caret';
    caret.setAttribute('aria-hidden', 'true');

    typed.classList.add('is-armed');
    chars[0].parentNode.insertBefore(caret, chars[0]);

    const STEP = 46;   // intervallo tra un carattere e il successivo
    const START = 380; // breve pausa prima di iniziare a scrivere
    let shown = 0;

    function typeNext() {
      if (shown >= chars.length) {
        window.setTimeout(function () {
          caret.remove();
        }, 2400);
        return;
      }

      chars[shown].classList.add('is-on');
      shown++;

      const last = chars[shown - 1];
      const next = chars[shown];
      if (next) next.parentNode.insertBefore(caret, next);
      else last.parentNode.insertBefore(caret, last.nextSibling);

      window.setTimeout(typeNext, STEP);
    }

    window.setTimeout(typeNext, START);
  }

  /* ==========================================================
     11. CHI SONO — la foto cambia ogni 3 secondi
     ========================================================== */
  function initAboutSlideshow() {
    const frame = $('.about-image');
    if (!frame) return;

    const img = $('img', frame);
    if (!img) return;

    const sources = (frame.dataset.photos || '')
      .split(',')
      .map(function (src) { return src.trim(); })
      .filter(Boolean);

    if (sources.length < 2) return;

    let index = 0;
    let busy = false;

    window.setInterval(function () {
      if (busy) return;

      busy = true;
      index = (index + 1) % sources.length;

      const next = new Image();

      next.onload = function () {
        img.classList.add('is-fading');

        window.setTimeout(function () {
          img.src = next.src;
          img.classList.remove('is-fading');
          busy = false;
        }, 320);
      };

      next.onerror = function () {
        busy = false;
      };

      next.src = sources[index];
    }, 3000);
  }

  /* ==========================================================
     BOOT
     ========================================================== */
  function init() {
    initNavbar();
    initReveal();
    initMobileMenu();
    initScrollSpy();
    initReviewsMarquee();
    initServiceCards();
    initMortalityChart();
    initWhoToggle();
    initNavQuick();
    initHeroTyping();
    initAboutSlideshow();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
