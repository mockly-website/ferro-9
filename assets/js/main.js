/* Ferro 9 — sito dimostrativo di Mockly.
   Un solo file, JavaScript puro. Se qualcosa non parte, il sito resta leggibile. */
(function () {
  "use strict";
  window.__ferro = 1;

  var D = window.FERRO_DATA || { courses: {}, days: [], sched: {}, hours: {} };
  var WA = "https://wa.me/393517578080";
  var RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var page = document.body.getAttribute("data-page");

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function eur(n) { return n.toFixed(2).replace(".", ",") + " €"; }
  function kg(n) { return String(n).replace(".", ","); }
  function toMin(hhmm) { var p = hhmm.split(":"); return +p[0] * 60 + +p[1]; }
  function dayInfo(d) { return D.days.filter(function (x) { return x.d === d; })[0]; }

  /* ----------------------------------------------------------------------
     Il battito: 120 al minuto. A riposo è appena un respiro; mentre scorri
     diventa un colpo. Anima solo transform e opacity.
     ---------------------------------------------------------------------- */
  var beatEls = [], ringEls = [], ribbons = [];
  var energy = 0, lastY = window.scrollY, lastT = 0;
  var bpm = 120, beatPhase = 0;   // il bilanciere alza i battiti al minuto di tutto il sito

  function track(el, list) {
    var o = { el: el, vis: false };
    list.push(o);
    return o;
  }

  function initBeat() {
    if (RM) return;
    var seen = "IntersectionObserver" in window;
    var io = seen ? new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.target.__o.vis = en.isIntersecting; });
    }, { rootMargin: "80px" }) : null;
    $$("[data-beat]").forEach(function (el) { var o = track(el, beatEls); el.__o = o; if (io) io.observe(el); else o.vis = true; });
    $$("[data-ring]").forEach(function (el) { var o = track(el, ringEls); el.__o = o; if (io) io.observe(el.parentNode); el.parentNode.__o = o; if (!io) o.vis = true; });
    $$("[data-ribbon]").forEach(function (el) {
      var track_ = $(".ribbon__track", el);
      var o = { el: el, track: track_, off: 0, vis: false, half: 0 };
      el.__o = o; ribbons.push(o); if (io) io.observe(el); else o.vis = true;
    });
    requestAnimationFrame(frame);
  }

  function frame(t) {
    var dt = lastT ? Math.min(64, t - lastT) : 16;
    lastT = t;
    var y = window.scrollY, dy = y - lastY; lastY = y;
    energy = Math.min(1, energy + Math.abs(dy) / 70);
    energy *= Math.pow(0.93, dt / 16.7);

    beatPhase = (beatPhase + dt / (60000 / bpm)) % 1;   // a 120 al minuto, un battito ogni mezzo secondo
    var phase = beatPhase;
    var p = Math.exp(-phase * 7);              // colpo secco, poi si scarica
    var amp = 0.013 + 0.05 * energy;
    var s = "scale(" + (1 + amp * p).toFixed(4) + ")";
    var i, o;
    for (i = 0; i < beatEls.length; i++) {
      o = beatEls[i];
      if (o.vis) o.el.style.transform = s;
    }
    var rs = 1 + (0.012 + 0.03 * energy) * phase;
    var ro = (0.38 + 0.55 * energy) * (1 - phase);
    for (i = 0; i < ringEls.length; i++) {
      o = ringEls[i];
      if (o.vis) { o.el.style.transform = "scale(" + rs.toFixed(4) + ")"; o.el.style.opacity = ro.toFixed(3); }
    }
    for (i = 0; i < ribbons.length; i++) {
      o = ribbons[i];
      if (!o.vis || !o.half) continue;
      o.off += 0.065 * dt + dy * 0.9;          // va avanti da sola; lo scroll la spinge
      o.off = ((o.off % o.half) + o.half) % o.half;
      o.track.style.transform = "translate3d(" + (-o.off).toFixed(1) + "px,0,0)";
    }
    requestAnimationFrame(frame);
  }

  /* ----------------------------------------------------------------------
     Nastro dei prossimi corsi
     ---------------------------------------------------------------------- */
  function upcoming(n) {
    var now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes(), out = [];
    for (var add = 0; add < 8 && out.length < n; add++) {
      var d = (now.getDay() + add) % 7;
      (D.sched[d] || []).forEach(function (s) {
        if (out.length >= n) return;
        if (add === 0 && toMin(s[0]) <= nowMin) return;
        out.push({ d: d, add: add, t: s[0], c: s[1] });
      });
    }
    return out;
  }

  function buildRibbons() {
    var items = upcoming(7);
    if (!items.length || !D.courses) return;
    $$("[data-ribbon]").forEach(function (rb) {
      var track_ = $(".ribbon__track", rb);
      var html = items.map(function (it) {
        var di = dayInfo(it.d);
        var when = it.add === 0 ? "Oggi" : it.add === 1 ? "Domani" : di.s;
        var href = (page === "corsi" ? "" : "corsi.html") + "#giorno-" + it.d;
        return '<a href="' + href + '"><em>' + when + "</em>" + it.t + " " + D.courses[it.c].n + "</a>";
      }).join("");
      track_.innerHTML = '<div class="ribbon__group">' + html + "</div>";
      rb.setAttribute("aria-label", "Prossimi corsi in sala");
      if (RM) return;
      var group = $(".ribbon__group", track_);
      var copies = Math.max(2, Math.ceil((window.innerWidth * 2) / Math.max(1, group.scrollWidth)) + 1);
      for (var i = 1; i < copies; i++) {
        var c = group.cloneNode(true);
        c.setAttribute("aria-hidden", "true");
        $$("a", c).forEach(function (a) { a.tabIndex = -1; });
        track_.appendChild(c);
      }
      rb.classList.add("is-live");
      var o = rb.__o;
      if (o) o.half = group.getBoundingClientRect().width;
    });
  }

  window.addEventListener("resize", function () {
    ribbons.forEach(function (o) {
      var g = $(".ribbon__group", o.track);
      if (g) o.half = g.getBoundingClientRect().width;
    });
  });

  /* ----------------------------------------------------------------------
     Comparsa allo scroll
     ---------------------------------------------------------------------- */
  function initReveal() {
    var els = $$(".rv");
    if (!els.length) return;
    if (!("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ----------------------------------------------------------------------
     Menu da telefono
     ---------------------------------------------------------------------- */
  function initMenu() {
    var btn = $(".site-header .menu-btn"), panel = $("#menu"), scrim = $("[data-scrim]");
    if (!btn || !panel) return;
    var close = $("[data-menu-close]", panel);
    function focusables() { return $$("a[href], button:not([disabled])", panel); }
    function open() {
      panel.classList.add("is-open"); scrim.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
      btn.setAttribute("aria-expanded", "true");
      root.classList.add("menu-open");
      setTimeout(function () { (close || focusables()[0]).focus(); }, 30);
    }
    function shut(back) {
      panel.classList.remove("is-open"); scrim.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
      btn.setAttribute("aria-expanded", "false");
      root.classList.remove("menu-open");
      if (back !== false) btn.focus();
    }
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function () { panel.classList.contains("is-open") ? shut() : open(); });
    if (close) close.addEventListener("click", function () { shut(); });
    scrim.addEventListener("click", function () { shut(); });
    document.addEventListener("keydown", function (e) {
      if (!panel.classList.contains("is-open")) return;
      if (e.key === "Escape") { e.preventDefault(); shut(); return; }
      if (e.key === "Tab") {
        var f = focusables(), first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    $$("a", panel).forEach(function (a) { a.addEventListener("click", function () { shut(false); }); });
    $$("[data-prova]", panel).forEach(function (b) { b.addEventListener("click", function () { shut(false); }); });
    // Se si allarga la finestra fino al menu orizzontale, il pannello si richiude da solo.
    window.matchMedia("(min-width: 1024px)").addEventListener("change", function (m) { if (m.matches) shut(false); });
  }

  /* ----------------------------------------------------------------------
     Richiesta di prova gratuita (WhatsApp)
     ---------------------------------------------------------------------- */
  function initProva() {
    var dlg = $("#prova"), form = $("#prova-form");
    if (!dlg || !form) return;
    var status = $("#prova-status"), lastFocus = null, submit = $("button[type=submit]", form);

    function setErr(field, msg) {
      var wrap = $('[data-field="' + field + '"]', form), err = $("#e-" + field);
      if (msg) { wrap.setAttribute("data-invalid", ""); err.textContent = msg; }
      else { wrap.removeAttribute("data-invalid"); err.textContent = ""; }
    }
    function reset() {
      ["nome", "giorno", "fascia"].forEach(function (f) { setErr(f, ""); });
      status.textContent = ""; status.removeAttribute("data-state");
      submit.disabled = false; submit.textContent = "Apri WhatsApp";
    }
    function open(data) {
      lastFocus = document.activeElement;
      reset();
      data = data || {};
      form.corso.value = data.corso || "";
      form.giorno.value = data.giorno || "";
      var f = "";
      if (data.ora) { var m = toMin(data.ora); f = m < 660 ? "mattina" : m < 900 ? "pausa pranzo" : "sera"; }
      $$("input[name=fascia]", form).forEach(function (r) { r.checked = (r.value === f); });
      root.classList.add("dialog-open");
      if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
      setTimeout(function () { form.nome.focus(); }, 60);
    }
    function shut() {
      if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open");
      onClose();
    }
    function onClose() {
      root.classList.remove("dialog-open");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    dlg.addEventListener("close", onClose);
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) shut();           // tocco fuori dal riquadro
    });
    $("[data-close]", dlg).addEventListener("click", shut);

    document.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest("[data-prova]") : null;
      if (!t) return;
      e.preventDefault();
      open({ corso: t.getAttribute("data-corso"), giorno: t.getAttribute("data-giorno"), ora: t.getAttribute("data-ora") });
    });

    form.addEventListener("input", function (e) {
      var n = e.target.name;
      if (n === "nome" && form.nome.value.trim().length > 1) setErr("nome", "");
      if (n === "giorno" && form.giorno.value) setErr("giorno", "");
      if (n === "fascia") setErr("fascia", "");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = form.nome.value.trim(), giorno = form.giorno.value;
      var fascia = ($("input[name=fascia]:checked", form) || {}).value;
      var bad = null;
      if (nome.length < 2) { setErr("nome", "Scrivi il tuo nome, anche solo quello di battesimo."); bad = bad || form.nome; } else setErr("nome", "");
      if (!giorno) { setErr("giorno", "Scegli un giorno per la prova."); bad = bad || form.giorno; } else setErr("giorno", "");
      if (!fascia) { setErr("fascia", "Dicci se vieni di mattina, a pranzo o la sera."); bad = bad || $("input[name=fascia]", form); } else setErr("fascia", "");
      if (bad) { bad.focus(); status.textContent = "Manca qualcosa: controlla i campi segnati."; status.setAttribute("data-state", "error"); return; }

      var corsoK = form.corso.value;
      var corso = corsoK && D.courses[corsoK] ? D.courses[corsoK].n : "lo decide il coach";
      var dn = dayInfo(+giorno).n;
      var msg = "[DEMO Ferro 9, palestra inventata] Richiesta di prova gratuita.\n" +
        "Nome: " + nome + "\nCorso: " + corso + "\nGiorno: " + dn + "\nQuando: " + fascia + "\n" +
        "Questo messaggio parte dalla dimostrazione del sito, non da un cliente vero.";
      var url = WA + "?text=" + encodeURIComponent(msg);
      submit.disabled = true; submit.textContent = "Preparo il messaggio…";
      status.innerHTML = 'Messaggio pronto. Se WhatsApp non si apre, <a href="' + url + '" rel="noopener">tocca qui</a>.';
      status.setAttribute("data-state", "ok");
      setTimeout(function () {
        var w = window.open(url, "_blank", "noopener");
        if (!w) window.location.href = url;
        submit.disabled = false; submit.textContent = "Apri WhatsApp";
      }, 350);
    });
  }

  /* ----------------------------------------------------------------------
     Aperto ora e orari
     ---------------------------------------------------------------------- */
  function initHours() {
    var list = $("[data-hours]"), now_ = $("[data-open-now]");
    if (!list || !now_) return;
    var now = new Date(), today = now.getDay(), m = now.getHours() * 60 + now.getMinutes();
    list.innerHTML = D.days.map(function (di) {
      var h = D.hours[di.d];
      return '<li' + (di.d === today ? ' class="is-today"' : "") + "><span>" + di.n + "</span><b>" + h[0].replace(":00", "") + "–" + h[1].replace(":00", "") + "</b></li>";
    }).join("");
    var h = D.hours[today], st, txt;
    if (m >= toMin(h[0]) && m < toMin(h[1])) { st = "open"; txt = "Aperto ora, chiude alle " + h[1].replace(":00", ""); }
    else {
      st = "closed";
      var next = null;
      for (var add = (m < toMin(h[0]) ? 0 : 1); add < 8 && !next; add++) {
        var d = (today + add) % 7;
        next = { when: add === 0 ? "oggi" : add === 1 ? "domani" : dayInfo(d).n.toLowerCase(), at: D.hours[d][0].replace(":00", "") };
      }
      txt = "Chiuso, riapre " + next.when + " alle " + next.at;
    }
    now_.setAttribute("data-state", st);
    $("span", now_).textContent = txt;
  }

  /* ----------------------------------------------------------------------
     Carica il bilanciere
     ---------------------------------------------------------------------- */
  function initRack() {
    var svg = $("[data-rack-svg]");
    if (!svg) return;
    var L = $("[data-rack-left]", svg), R = $("[data-rack-right]", svg);
    var kgEl = $("[data-rack-kg]"), note = $("[data-rack-note]"), sides = $("[data-rack-sides]");
    var spec = {
      25: { w: 30, h: 206, c: "#d9d9d6" }, 20: { w: 26, h: 192, c: "#c4c6c8" }, 15: { w: 22, h: 172, c: "#abaeb2" },
      10: { w: 18, h: 148, c: "#8e9296" }, 5: { w: 14, h: 118, c: "#73777b" }, 2.5: { w: 10, h: 90, c: "#5b5f63" },
      1.25: { w: 8, h: 66, c: "#46494c" }
    };
    var plates = [], MAX = 6, bar = 20;
    var btns = $$("[data-plate]");
    var shown = 20;

    function noteFor(t, n) {
      if (!n) return "Bilanciere scarico. Si parte da qui.";
      if (t < 60) return "Riscaldamento. Buono per le prime serie.";
      if (t < 100) return "Adesso si lavora.";
      if (t < 140) return "Cento e passa. Occhio alla schiena e alla respirazione.";
      if (t < 200) return "Serio. Magnesia sulle mani e uno spotter dietro.";
      return "Qui ti serve un compagno, le sicurezze e il coach accanto.";
    }
    function draw(newest) {
      var total = bar + 2 * plates.reduce(function (a, p) { return a + p; }, 0);
      [[L, -1], [R, 1]].forEach(function (pair) {
        var g = pair[0], dir = pair[1], x = dir < 0 ? 194 : 406, html = "";
        plates.forEach(function (p, i) {
          var s = spec[p], isNew = newest && i === plates.length - 1;
          var px = dir < 0 ? x - s.w : x;
          html += '<rect class="plate' + (isNew ? " plate--new" : "") + '" x="' + px + '" y="' + (115 - s.h / 2) + '" width="' + s.w + '" height="' + s.h + '" rx="3" fill="' + (isNew ? "#e4ff1a" : s.c) + '" stroke="#0a0a0a" stroke-width="2"/>';
          x += dir * (s.w + 2);
        });
        g.innerHTML = html;
      });
      kgEl.textContent = kg(total);
      if (newest && !RM) { kgEl.classList.remove("bump"); void kgEl.offsetWidth; kgEl.classList.add("bump"); }
      note.textContent = plates.length >= MAX ? "Il bilanciere è pieno: sei sul massimo di questa dimostrazione." : noteFor(total, plates.length);
      bpm = Math.min(180, 120 + Math.round((total - bar) * 0.25));
      sides.textContent = (plates.length
        ? "Barra 20 kg + per lato: " + plates.map(kg).join(" + ") + " kg"
        : "Barra da 20 kg, nessun disco.") + (RM ? "" : " · Il sito batte a " + bpm + " al minuto.");
      btns.forEach(function (b) { b.disabled = plates.length >= MAX; });
      svg.setAttribute("aria-label", "Bilanciere da " + kg(total) + " chili");
      shown = total;
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () {
        if (plates.length >= MAX) return;
        plates.push(parseFloat(b.getAttribute("data-plate")));
        draw(true);
        if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) { try { navigator.vibrate(8); } catch (e) {} }
      });
    });
    $("[data-rack-undo]").addEventListener("click", function () { plates.pop(); draw(false); });
    $("[data-rack-clear]").addEventListener("click", function () { plates = []; draw(false); });
    draw(false);
  }

  /* ----------------------------------------------------------------------
     Orario filtrabile (pagina corsi)
     ---------------------------------------------------------------------- */
  function initWeek() {
    var week = $("#settimana");
    if (!week) return;
    var now = new Date(), today = now.getDay(), nowMin = now.getHours() * 60 + now.getMinutes();
    var count = $("#conteggio"), form = $("#filtri");

    $$(".day", week).forEach(function (day) {
      var d = +day.getAttribute("data-day");
      if (d === today) {
        day.classList.add("is-today");
        var nextDone = false;
        $$(".slot", day).forEach(function (s) {
          var t = toMin(s.getAttribute("data-time"));
          if (t <= nowMin) s.classList.add("is-past");
          else if (!nextDone) { s.classList.add("is-next"); nextDone = true; }
        });
      }
    });

    function apply(val) {
      var total = 0;
      $$(".day", week).forEach(function (day) {
        var shown = 0;
        $$(".slot", day).forEach(function (s) {
          var ok = val === "tutti" || s.getAttribute("data-course") === val;
          s.hidden = !ok;
          if (ok) { shown++; total++; }
        });
        var empty = $("[data-empty]", day);
        if (empty) empty.hidden = shown > 0;
      });
      var name = val === "tutti" ? "Tutti i corsi" : D.courses[val].n;
      count.textContent = name + ": " + total + (total === 1 ? " lezione" : " lezioni") + " a settimana.";
    }
    form.addEventListener("change", function (e) { if (e.target.name === "f") apply(e.target.value); });
    var q = new URLSearchParams(window.location.search).get("corso");
    if (q && D.courses[q]) { var r = $('input[name=f][value="' + q + '"]', form); if (r) r.checked = true; apply(q); }
    else apply("tutti");
  }

  /* ----------------------------------------------------------------------
     Calcolatore dell'abbonamento
     ---------------------------------------------------------------------- */
  function initCalc() {
    var form = $("#calc-form");
    if (!form) return;
    var outMonth = $("[data-out-month]"), lines = $("[data-out-lines]"), wa = $("[data-out-wa]");
    var shownMonth = 0, anim = null, settle = null;
    var durLabel = { 1: "1 mese", 3: "3 mesi", 12: "12 mesi" };
    var discount = { 1: 1, 3: 0.92, 12: 0.85 };

    function val(name) { var c = $("input[name=" + name + "]:checked", form); return c ? parseFloat(c.value) : 0; }
    function calc() {
      var base = val("piano"), when = val("quando"), months = val("durata");
      var monthly = Math.round(base * when * discount[months] * 100) / 100;
      var subs = Math.round(monthly * months * 100) / 100;
      var iscr = months === 12 ? 0 : 20;
      var scheda = $("input[name=scheda]", form).checked ? 15 : 0;
      var total = subs + iscr + scheda;
      var pianoN = base === 54 ? "sala pesi + corsi" : "sala pesi";
      var whenN = when === 1 ? "quando voglio" : "mattina";

      var html = "<li><span>" + durLabel[months] + " di " + pianoN + "</span><b>" + eur(subs) + "</b></li>";
      html += "<li><span>Iscrizione (una volta)</span><b>" + (iscr ? eur(iscr) : "gratis") + "</b></li>";
      if (scheda) html += "<li><span>Scheda personalizzata</span><b>" + eur(scheda) + "</b></li>";
      html += '<li class="total"><span>Totale iniziale</span><b>' + eur(total) + "</b></li>";
      lines.innerHTML = html;
      var mm = document.querySelector("[data-mini-month]"), mt = document.querySelector("[data-mini-total]");
      if (mm) mm.textContent = eur(monthly).replace(",00", "");
      if (mt) mt.textContent = eur(total);

      // il numero grande scorre fino al nuovo valore
      if (anim) cancelAnimationFrame(anim);
      clearTimeout(settle);
      var from = shownMonth || monthly, t0 = null;
      if (RM) { shownMonth = monthly; paint(monthly); }
      else (function step(ts) {
        if (t0 === null) t0 = ts;
        var k = Math.min(1, (ts - t0) / 260), e = 1 - Math.pow(1 - k, 3);
        shownMonth = from + (monthly - from) * e;
        paint(k === 1 ? monthly : shownMonth);
        if (k < 1) anim = requestAnimationFrame(step);
      })(performance.now());
      // se i fotogrammi non arrivano (scheda in secondo piano) il numero giusto compare comunque
      settle = setTimeout(function () { if (anim) cancelAnimationFrame(anim); shownMonth = monthly; paint(monthly); }, 420);
      function paint(n) { outMonth.firstChild.nodeValue = (Math.round(n * 100) % 100 === 0 ? String(Math.round(n)) : n.toFixed(2).replace(".", ",")); }

      var msg = "[DEMO Ferro 9, palestra inventata] Vorrei questo abbonamento (cifre di esempio):\n" +
        "Piano: " + pianoN + "\nQuando: " + whenN + "\nDurata: " + durLabel[months] + "\n" +
        "Al mese: " + eur(monthly) + (scheda ? "\nCon scheda personalizzata" : "") + "\nTotale iniziale: " + eur(total) + "\n" +
        "Questo messaggio parte dalla dimostrazione del sito, non da un cliente vero.";
      wa.href = WA + "?text=" + encodeURIComponent(msg);
    }
    form.addEventListener("change", calc);
    calc();
  }

  /* Nel finale c'è già un tasto grande: quello fisso si fa da parte. */
  function initBarHide() {
    var bar = $(".cta-bar"), big = $(".finale .btn");
    if (!bar || !big || !("IntersectionObserver" in window)) return;
    new IntersectionObserver(function (en) {
      bar.style.opacity = en[0].isIntersecting ? "0" : "";
      bar.style.pointerEvents = en[0].isIntersecting ? "none" : "";
    }, { threshold: 0.6 }).observe(big);
  }

  /* ---------------------------------------------------------------------- */
  function boot() {
    initBarHide();
    initMenu();
    initProva();
    initReveal();
    initBeat();
    buildRibbons();
    initHours();
    initRack();
    initWeek();
    initCalc();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
