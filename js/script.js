(() => {
  'use strict';

  const config = window.WEDDING_CONFIG || {};
  const guestIdStorageKey = 'wedding-guest-id-v1';
  const targetDate = new Date(config.weddingDateIso || '2027-03-21T10:00:00+09:00');
  const puzzleOpenDate = new Date(config.finalPuzzleMenuOpenIso || '2026-08-11T18:00:00+09:00');
  const els = {};
  let activeGuestId = '';
  let rsvpStorageKey = '';
  let latestStatus = { completed: false, attending: false };
  let currentSlide = 0;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('resize', setViewportHeight, { passive: true });
  window.addEventListener('hashchange', applyRoute);

  function init() {
    cacheElements();
    setViewportHeight();
    setupIdGate();
    setupOverlay();
    setupMenu();
    setupFadeIn();
    setupCountdown();
    setupCarousel();
    setupAllergyField();
    setupForm();
    createPetals();
    updatePuzzleAvailability();
    restoreGuestSession();
  }

  function cacheElements() {
    Object.assign(els, {
      guestGate: document.getElementById('guestGate'),
      idForm: document.getElementById('idForm'),
      inviteIdInput: document.getElementById('inviteId'),
      idSubmitButton: document.getElementById('idSubmitButton'),
      idStatus: document.getElementById('idStatus'),
      siteApp: document.getElementById('siteApp'),
      overlay: document.getElementById('messageOverlay'),
      messageGuestName: document.getElementById('messageGuestName'),
      messageBody: document.getElementById('messageBody'),
      form: document.getElementById('rsvpForm'),
      thanks: document.getElementById('thanksMessage'),
      formStatus: document.getElementById('formStatus'),
      submitButton: document.getElementById('submitButton'),
      guestIdInput: document.getElementById('guestId'),
      nameInput: document.getElementById('name'),
      emailInput: document.getElementById('email'),
      allergyDetailsWrap: document.getElementById('allergyDetailsWrap'),
      allergyDetailsInput: document.getElementById('allergyDetails'),
      guestMessageInput: document.getElementById('guestMessage'),
      days: document.getElementById('days'),
      hours: document.getElementById('hours'),
      minutes: document.getElementById('minutes'),
      seconds: document.getElementById('seconds'),
      menuButton: document.getElementById('menuButton'),
      menuPanel: document.getElementById('menuPanel'),
      finalPuzzleNav: document.getElementById('finalPuzzleNav'),
      changeGuestButton: document.getElementById('changeGuestButton'),
      invitationPage: document.getElementById('invitationPage'),
      profilePage: document.getElementById('profilePage'),
      finalPuzzlePage: document.getElementById('finalPuzzlePage')
    });
  }

  function setupIdGate() {
    if (!els.idForm) return;
    els.idForm.addEventListener('submit', async event => {
      event.preventDefault();
      const candidate = normalizeGuestId(els.inviteIdInput ? els.inviteIdInput.value : '');
      if (!candidate) {
        setIdStatus('IDを入力してください。', 'error');
        if (els.inviteIdInput) els.inviteIdInput.focus();
        return;
      }
      await validateAndActivateGuest(candidate, false);
    });
  }

  async function restoreGuestSession() {
    const previewId = getLocalPreviewGuestId();
    if (previewId) {
      activateGuest(previewId, {
        ok: true,
        guestId: previewId,
        displayName: '白戸 祐輔',
        completed: false,
        attending: false,
        email: '',
        ceremonyAttendance: '',
        receptionAttendance: '',
        allergy: '',
        message: ''
      });
      return;
    }

    let storedId = '';
    try {
      storedId = normalizeGuestId(localStorage.getItem(guestIdStorageKey) || '');
    } catch (_) {
      storedId = '';
    }

    if (!storedId) {
      showIdForm();
      return;
    }

    if (els.inviteIdInput) els.inviteIdInput.value = storedId;
    setIdStatus('招待状を確認しています…', '');
    await validateAndActivateGuest(storedId, true);
  }

  async function validateAndActivateGuest(guestId, fromStorage) {
    setIdLoading(true);
    setIdStatus('IDを確認しています…', '');
    try {
      if (!isGasConfigured()) {
        throw new Error('GASのウェブアプリURLが未設定です。セットアップ手順をご確認ください。');
      }
      const result = await jsonp('status', { guestId });
      if (!result || !result.ok) throw new Error((result && result.error) || 'IDを確認できませんでした。');
      activateGuest(guestId, result);
    } catch (error) {
      if (fromStorage) {
        removeStoredGuestId();
        showIdForm();
      }
      setIdStatus(error.message || 'IDを確認できませんでした。', 'error');
      if (els.inviteIdInput) {
        els.inviteIdInput.select();
        els.inviteIdInput.focus();
      }
    } finally {
      setIdLoading(false);
    }
  }

  function activateGuest(guestId, status) {
    activeGuestId = normalizeGuestId(guestId);
    rsvpStorageKey = `wedding-rsvp-status-${activeGuestId}`;
    try {
      localStorage.setItem(guestIdStorageKey, activeGuestId);
    } catch (_) {
      // localStorageが使えない環境でも、その場の閲覧は継続します。
    }

    if (els.guestIdInput) els.guestIdInput.value = activeGuestId;
    applyStatusToForm(status || {});
    restoreLocalRsvpStatus();
    renderMessage({
      completed: Boolean(status && status.completed) || latestStatus.completed,
      attending: status && status.completed ? Boolean(status.attending) : latestStatus.attending
    });
    applyRoute();

    if (els.siteApp) els.siteApp.setAttribute('aria-hidden', 'false');
    if (els.guestGate) {
      els.guestGate.classList.add('is-hidden');
      window.setTimeout(() => els.guestGate.setAttribute('hidden', ''), 650);
    }
    document.body.classList.remove('gate-open');
    document.body.classList.add('has-overlay');
    if (els.overlay) {
      els.overlay.classList.remove('is-dormant');
      els.overlay.setAttribute('aria-hidden', 'false');
      els.overlay.focus({ preventScroll: true });
    }
  }

  function showIdForm() {
    if (els.idForm) els.idForm.classList.remove('is-hidden');
    if (els.inviteIdInput) els.inviteIdInput.focus({ preventScroll: true });
  }

  function setIdLoading(loading) {
    if (!els.idSubmitButton) return;
    els.idSubmitButton.disabled = loading;
    els.idSubmitButton.textContent = loading ? 'Checking...' : 'Open Invitation';
  }

  function setIdStatus(message, type) {
    if (!els.idStatus) return;
    els.idStatus.textContent = message || '';
    els.idStatus.classList.toggle('is-error', type === 'error');
    els.idStatus.classList.toggle('is-success', type === 'success');
  }

  function removeStoredGuestId() {
    try {
      localStorage.removeItem(guestIdStorageKey);
      if (rsvpStorageKey) localStorage.removeItem(rsvpStorageKey);
    } catch (_) {
      // 何もしません。
    }
  }

  function getLocalPreviewGuestId() {
    const isLocalHost = ['localhost', '127.0.0.1', 'terminal.local'].includes(location.hostname);
    const previewRequested = new URLSearchParams(location.search).get('preview') === '1';
    return isLocalHost && previewRequested ? 'sfm549Eys' : '';
  }

  function normalizeGuestId(value) {
    return String(value || '').trim().replace(/^\/+|\/+$/g, '');
  }

  function isGasConfigured() {
    return typeof config.gasWebAppUrl === 'string'
      && config.gasWebAppUrl.startsWith('https://script.google.com/')
      && !config.gasWebAppUrl.includes('PASTE_YOUR_GAS_WEB_APP_URL_HERE');
  }

  function setViewportHeight() {
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
  }

  function getDisplayName() {
    const fromInput = els.nameInput ? els.nameInput.value.trim() : '';
    return fromInput || 'ゲスト';
  }

  function applyStatusToForm(status) {
    if (els.nameInput && status.displayName) els.nameInput.value = status.displayName;
    if (els.emailInput && status.email) els.emailInput.value = status.email;
    if (els.guestMessageInput && status.message) els.guestMessageInput.value = status.message;
    if (status.ceremonyAttendance) checkRadio('ceremonyAttendance', status.ceremonyAttendance);
    if (status.receptionAttendance) checkRadio('receptionAttendance', status.receptionAttendance);

    const allergy = String(status.allergy || '').trim();
    if (allergy) {
      const choice = status.allergyChoice || (allergy === 'なし' ? 'なし' : 'あり');
      setAllergyChoice(choice, choice === 'あり' ? (status.allergyDetails || allergy) : '');
    }

    if (rsvpStorageKey && Object.prototype.hasOwnProperty.call(status, 'completed')) {
      try {
        if (!status.completed) {
          localStorage.removeItem(rsvpStorageKey);
          return;
        }
        localStorage.setItem(rsvpStorageKey, JSON.stringify({
          completed: true,
          attending: Boolean(status.attending),
          savedAt: Date.now()
        }));
      } catch (_) {
        // 何もしません。
      }
    }
  }

  function restoreLocalRsvpStatus() {
    latestStatus = { completed: false, attending: false };
    if (!rsvpStorageKey) return;
    try {
      const stored = JSON.parse(localStorage.getItem(rsvpStorageKey) || '{}');
      if (stored.completed) latestStatus = { completed: true, attending: Boolean(stored.attending) };
    } catch (_) {
      latestStatus = { completed: false, attending: false };
    }
  }

  function renderMessage(status) {
    latestStatus = {
      completed: Boolean(status && status.completed),
      attending: Boolean(status && status.attending)
    };

    if (els.messageGuestName) els.messageGuestName.textContent = `${getDisplayName()}様`;

    let lines;
    if (!latestStatus.completed) {
      lines = [
        'この度、白戸祐輔と大貫愛佳は結婚することとなりました。',
        'つきましては、結婚式へのご出欠について、',
        'ご入力・ご回答をお願いいたします。',
        '皆様と当日お会いできますことを、',
        '心より楽しみにしております。'
      ];
      setFormCompleted(false);
    } else if (latestStatus.attending) {
      lines = [
        '結婚式へのご出欠について、',
        'ご入力・ご回答いただき、誠にありがとうございました。',
        '皆様と当日お会いできますことを、',
        '心より楽しみにしております！'
      ];
      setFormCompleted(true);
    } else {
      lines = [
        '結婚式へのご出欠について、',
        'ご入力・ご回答いただき、誠にありがとうございました。',
        'またお会いできる日を楽しみにしております。'
      ];
      setFormCompleted(true);
    }

    if (els.messageBody) els.messageBody.innerHTML = lines.join('<br>');
  }

  function setFormCompleted(completed) {
    if (els.form) els.form.classList.toggle('is-hidden', Boolean(completed));
    if (els.thanks) els.thanks.classList.toggle('is-hidden', !completed);
  }

  function setupOverlay() {
    if (!els.overlay) return;
    const openInvitation = () => {
      if (els.overlay.classList.contains('is-dormant')) return;
      els.overlay.classList.add('is-hidden');
      els.overlay.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('has-overlay');
      window.setTimeout(() => els.overlay.remove(), 820);
    };
    els.overlay.addEventListener('click', openInvitation);
    els.overlay.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openInvitation();
      }
    });
  }

  function setupMenu() {
    if (els.menuButton && els.menuPanel) {
      els.menuButton.addEventListener('click', () => {
        const open = !els.menuPanel.classList.contains('is-open');
        els.menuPanel.classList.toggle('is-open', open);
        els.menuButton.classList.toggle('is-open', open);
        els.menuButton.setAttribute('aria-expanded', String(open));
      });
      els.menuPanel.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
      document.addEventListener('click', event => {
        if (!event.target.closest('.top-menu')) closeMenu();
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeMenu();
      });
    }

    if (els.changeGuestButton) {
      els.changeGuestButton.addEventListener('click', () => {
        if (!window.confirm('この端末に保存したIDを消して、別のIDを入力しますか？')) return;
        removeStoredGuestId();
        location.hash = '';
        location.reload();
      });
    }
  }

  function closeMenu() {
    if (!els.menuButton || !els.menuPanel) return;
    els.menuPanel.classList.remove('is-open');
    els.menuButton.classList.remove('is-open');
    els.menuButton.setAttribute('aria-expanded', 'false');
  }

  function isPuzzleOpen() {
    const openAt = puzzleOpenDate.getTime();
    return Number.isFinite(openAt) && Date.now() >= openAt;
  }

  function updatePuzzleAvailability() {
    const open = isPuzzleOpen();
    if (els.finalPuzzleNav) els.finalPuzzleNav.classList.toggle('is-hidden', !open);
    if (!open && ['#final-puzzle', '#puzzle', '#final'].includes(location.hash.toLowerCase())) {
      history.replaceState(null, '', '#invitation');
      applyRoute();
    }
  }

  function applyRoute() {
    const routeRaw = (location.hash || '#invitation').replace('#', '').toLowerCase();
    const aliases = { puzzle: 'final-puzzle', final: 'final-puzzle' };
    let active = aliases[routeRaw] || routeRaw;
    if (!['invitation', 'profile', 'final-puzzle'].includes(active)) active = 'invitation';
    if (active === 'final-puzzle' && !isPuzzleOpen()) active = 'invitation';

    Object.entries({
      invitation: els.invitationPage,
      profile: els.profilePage,
      'final-puzzle': els.finalPuzzlePage
    }).forEach(([key, page]) => {
      if (page) page.classList.toggle('is-hidden', key !== active);
    });

    document.querySelectorAll('[data-nav]').forEach(item => {
      item.classList.toggle('is-current', item.dataset.nav === active);
    });
    window.scrollTo({ top: 0, behavior: activeGuestId ? 'smooth' : 'auto' });
  }

  function setupFadeIn() {
    const nodes = document.querySelectorAll('.fade-in');
    if (!('IntersectionObserver' in window)) {
      nodes.forEach(node => node.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    nodes.forEach(node => observer.observe(node));
  }

  function setupCountdown() {
    const tick = () => {
      const diff = Math.max(0, targetDate.getTime() - Date.now());
      const totalSeconds = Math.floor(diff / 1000);
      setText(els.days, Math.floor(totalSeconds / 86400));
      setText(els.hours, pad2(Math.floor((totalSeconds % 86400) / 3600)));
      setText(els.minutes, pad2(Math.floor((totalSeconds % 3600) / 60)));
      setText(els.seconds, pad2(totalSeconds % 60));
      updatePuzzleAvailability();
    };
    tick();
    window.setInterval(tick, 1000);
  }

  function setupCarousel() {
    const slides = Array.from(document.querySelectorAll('.hero-slide'));
    const dots = Array.from(document.querySelectorAll('.slide-dot'));
    if (slides.length <= 1) return;
    const show = index => {
      currentSlide = ((index % slides.length) + slides.length) % slides.length;
      slides.forEach((slide, i) => slide.classList.toggle('is-active', i === currentSlide));
      dots.forEach((dot, i) => {
        dot.classList.toggle('is-active', i === currentSlide);
        dot.setAttribute('aria-current', i === currentSlide ? 'true' : 'false');
      });
    };
    dots.forEach((dot, i) => dot.addEventListener('click', () => show(i)));
    show(0);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.setInterval(() => show(currentSlide + 1), 5000);
    }
  }

  function setupAllergyField() {
    document.querySelectorAll('input[name="allergyChoice"]').forEach(radio => {
      radio.addEventListener('change', updateAllergyDetailsVisibility);
    });
    updateAllergyDetailsVisibility();
  }

  function updateAllergyDetailsVisibility() {
    const selected = document.querySelector('input[name="allergyChoice"]:checked');
    const hasAllergy = selected && selected.value === 'あり';
    if (els.allergyDetailsWrap) els.allergyDetailsWrap.classList.toggle('is-hidden', !hasAllergy);
    if (els.allergyDetailsInput) els.allergyDetailsInput.required = Boolean(hasAllergy);
  }

  function setAllergyChoice(choice, details) {
    const radio = document.querySelector(`input[name="allergyChoice"][value="${choice}"]`);
    if (radio) radio.checked = true;
    if (els.allergyDetailsInput && details) els.allergyDetailsInput.value = details;
    updateAllergyDetailsVisibility();
  }

  function setupForm() {
    if (!els.form) return;
    if (els.nameInput) els.nameInput.addEventListener('input', () => renderMessage(latestStatus));

    els.form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!activeGuestId) {
        setStatus('IDの認証情報がありません。ページを再読み込みしてください。', 'error');
        return;
      }
      if (!isGasConfigured()) {
        setStatus('GASのウェブアプリURLが未設定です。js/config.jsをご確認ください。', 'error');
        return;
      }

      updateAllergyDetailsVisibility();
      if (!els.form.checkValidity()) {
        els.form.reportValidity();
        setStatus('必須項目を入力・選択してください。', 'error');
        return;
      }

      const formData = new FormData(els.form);
      const payload = Object.fromEntries(formData.entries());
      payload.guestId = activeGuestId;
      payload.name = String(payload.name || '').trim();
      payload.email = String(payload.email || '').trim();
      payload.allergyChoice = String(payload.allergyChoice || '').trim();
      payload.allergyDetails = String(payload.allergyDetails || '').trim();
      payload.message = String(payload.message || '').trim();

      if (payload.allergyChoice === 'あり' && !payload.allergyDetails) {
        setStatus('アレルギーの詳細をご入力ください。', 'error');
        if (els.allergyDetailsInput) els.allergyDetailsInput.focus();
        return;
      }

      setLoading(true);
      setStatus('送信しています。画面を閉じずにお待ちください。', '');
      try {
        const result = await jsonp('submit', payload);
        if (!result || !result.ok) throw new Error((result && result.error) || '送信に失敗しました。');
        const attending = Boolean(result.attending);
        try {
          localStorage.setItem(rsvpStorageKey, JSON.stringify({ completed: true, attending, savedAt: Date.now() }));
        } catch (_) {
          // 何もしません。
        }
        if (els.nameInput && result.displayName) els.nameInput.value = result.displayName;
        renderMessage({ completed: true, attending });
        const target = document.getElementById('rsvp');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (error) {
        setStatus(`送信できませんでした。${error.message || 'GASの設定を確認してください。'}`, 'error');
      } finally {
        setLoading(false);
      }
    });
  }

  function checkRadio(name, attendanceLabel) {
    const value = attendanceLabel === '出席' ? '出席' : attendanceLabel === '欠席' ? '欠席' : '';
    if (!value) return;
    const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (radio) radio.checked = true;
  }

  function jsonp(action, params = {}) {
    return new Promise((resolve, reject) => {
      let url;
      try {
        url = new URL(config.gasWebAppUrl);
      } catch (_) {
        reject(new Error('GASのウェブアプリURLが正しくありません。'));
        return;
      }

      const callbackName = `__weddingJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      url.searchParams.set('action', action);
      url.searchParams.set('callback', callbackName);
      url.searchParams.set('_', String(Date.now()));
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      });

      const script = document.createElement('script');
      const timer = window.setTimeout(() => cleanup(new Error('通信がタイムアウトしました。')), 22000);
      window[callbackName] = data => cleanup(null, data);
      script.onerror = () => cleanup(new Error('GASと通信できませんでした。'));
      script.src = url.toString();
      document.body.appendChild(script);

      function cleanup(error, data) {
        window.clearTimeout(timer);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        if (error) reject(error);
        else resolve(data);
      }
    });
  }

  function createPetals() {
    const layer = document.querySelector('.petal-layer');
    if (!layer) return;
    layer.innerHTML = '';
    const isSmallScreen = window.matchMedia('(max-width: 640px)').matches;
    const count = isSmallScreen ? 42 : 76;

    for (let i = 0; i < count; i++) {
      const petal = document.createElement('span');
      const duration = 9 + Math.random() * 12;
      petal.className = 'petal';
      petal.style.setProperty('--left', `${Math.random() * 100}%`);
      petal.style.setProperty('--static-top', `${Math.random() * 100}%`);
      petal.style.setProperty('--size', `${7 + Math.random() * 17}px`);
      petal.style.setProperty('--rotate', `${Math.random() * 360}deg`);
      petal.style.setProperty('--alpha', `${0.25 + Math.random() * 0.38}`);
      petal.style.setProperty('--drift', `${(Math.random() * 54 - 27).toFixed(1)}vw`);
      petal.style.setProperty('--duration', `${duration.toFixed(1)}s`);
      petal.style.setProperty('--delay', `${(-Math.random() * duration).toFixed(1)}s`);
      layer.appendChild(petal);
    }
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function setText(element, value) {
    if (element) element.textContent = String(value);
  }

  function setLoading(loading) {
    if (!els.submitButton) return;
    els.submitButton.disabled = loading;
    els.submitButton.textContent = loading ? 'Sending...' : 'Send Reply';
  }

  function setStatus(message, type) {
    if (!els.formStatus) return;
    els.formStatus.textContent = message || '';
    els.formStatus.classList.toggle('is-error', type === 'error');
    els.formStatus.classList.toggle('is-success', type === 'success');
  }
})();
