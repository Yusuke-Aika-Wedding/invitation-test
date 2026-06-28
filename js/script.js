(() => {
  'use strict';

  const config = window.WEDDING_CONFIG || {};
  const guestId = getGuestId();
  const guest = (config.guests && config.guests[guestId]) || { displayName: 'ゲスト' };
  const storageKey = `wedding-rsvp-completed-${guestId}`;
  const targetDate = new Date(config.weddingDateIso || '2027-03-21T10:00:00+09:00');
  const els = {};

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    cacheElements();
    hydrateDefaultValues();
    setMessage(Boolean(localStorage.getItem(storageKey)) && !isGasConfigured());
    setupOverlay();
    setupFadeIn();
    setupCountdown();
    setupForm();
    syncStatus();
  }

  function cacheElements() {
    Object.assign(els, {
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
      allergyInput: document.getElementById('allergy'),
      days: document.getElementById('days'),
      hours: document.getElementById('hours'),
      minutes: document.getElementById('minutes'),
      seconds: document.getElementById('seconds')
    });
  }

  function getGuestId() {
    const params = new URLSearchParams(location.search);
    const fromQuery = params.get('guest');
    const fromBody = document.body ? document.body.dataset.guestId : '';
    const fromPath = location.pathname.split('/').filter(Boolean).pop();
    return normalizeGuestId(fromQuery || fromBody || fromPath || 'kekkon-hanako');
  }

  function normalizeGuestId(value) {
    return String(value || '')
      .trim()
      .replace(/^https?:\/\/[^/]+\//, '')
      .replace(/^invitation-test\//, '')
      .replace(/index\.html$/i, '')
      .replace(/\.html$/i, '')
      .replace(/^\/+|\/+$/g, '');
  }

  function hydrateDefaultValues() {
    const displayName = guest.displayName || document.body.dataset.defaultName || 'ゲスト';
    document.documentElement.style.setProperty('--vh', `${window.innerHeight * 0.01}px`);
    if (els.guestIdInput) els.guestIdInput.value = guestId;
    if (els.nameInput && !els.nameInput.value) els.nameInput.value = displayName;
  }

  function isGasConfigured() {
    return typeof config.gasWebAppUrl === 'string'
      && config.gasWebAppUrl.startsWith('https://script.google.com/')
      && !config.gasWebAppUrl.includes('PASTE_YOUR_GAS_WEB_APP_URL_HERE');
  }

  function setMessage(completed) {
    const displayName = getDisplayName();
    if (els.messageGuestName) els.messageGuestName.textContent = `${displayName}様`;
    if (els.nameInput && !els.nameInput.dataset.touched) els.nameInput.value = displayName;

    const beforeReply = [
      'この度、祐輔と愛佳は結婚することになりました。',
      '結婚式に関して、',
      '出欠席の入力・送信をよろしくお願いします。',
      '今後もよろしくお願いします。'
    ];
    const afterReply = [
      'この度、祐輔と愛佳は結婚することになりました。',
      '出欠席の入力・送信ありがとうございました！',
      'ご来場お待ちしております！',
      '今後もよろしくお願いします。'
    ];

    if (els.messageBody) els.messageBody.innerHTML = (completed ? afterReply : beforeReply).join('<br>');
    setFormCompleted(Boolean(completed));
  }

  function getDisplayName() {
    return (config.guests && config.guests[guestId] && config.guests[guestId].displayName)
      || guest.displayName
      || document.body.dataset.defaultName
      || 'ゲスト';
  }

  function setFormCompleted(completed) {
    if (!els.form || !els.thanks) return;
    els.form.hidden = completed;
    els.thanks.hidden = !completed;
  }

  function setupOverlay() {
    if (!els.overlay) return;
    const openInvitation = () => {
      els.overlay.classList.add('is-hidden');
      window.setTimeout(() => {
        const target = document.getElementById('invitation');
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 240);
    };
    els.overlay.addEventListener('click', openInvitation);
    els.overlay.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openInvitation();
      }
    });
  }

  function setupFadeIn() {
    const targets = document.querySelectorAll('.fade-up');
    if (!('IntersectionObserver' in window)) {
      targets.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    targets.forEach(el => observer.observe(el));
  }

  function setupCountdown() {
    const tick = () => {
      const remainingMs = Math.max(0, targetDate.getTime() - Date.now());
      const totalSeconds = Math.floor(remainingMs / 1000);
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      setText(els.days, String(days).padStart(3, '0'));
      setText(els.hours, String(hours).padStart(2, '0'));
      setText(els.minutes, String(minutes).padStart(2, '0'));
      setText(els.seconds, String(seconds).padStart(2, '0'));
    };
    tick();
    window.setInterval(tick, 1000);
  }

  function setupForm() {
    if (!els.form) return;
    if (els.nameInput) els.nameInput.addEventListener('input', () => { els.nameInput.dataset.touched = 'true'; });

    els.form.addEventListener('submit', async event => {
      event.preventDefault();
      clearStatus();

      const formData = new FormData(els.form);
      const params = {
        guestId,
        name: formData.get('name'),
        email: formData.get('email'),
        ceremonyAttendance: formData.get('ceremonyAttendance'),
        receptionAttendance: formData.get('receptionAttendance'),
        allergy: formData.get('allergy'),
        pageUrl: location.href,
        userAgent: navigator.userAgent
      };

      if (!isGasConfigured()) {
        localStorage.setItem(storageKey, 'preview');
        setMessage(true);
        setStatus('プレビューモードです。GASのWebアプリURLを設定すると、保存・確認メール・リマインドメールが有効になります。', 'success');
        return;
      }

      try {
        setLoading(true);
        const result = await jsonp('submit', params);
        if (!result || !result.ok) throw new Error(result && result.error ? result.error : '送信に失敗しました。');
        localStorage.setItem(storageKey, 'submitted');
        setMessage(true);
        setStatus('送信しました。確認メールをご確認ください。', 'success');
      } catch (error) {
        setStatus(`送信できませんでした。${error.message || 'GASの設定を確認してください。'}`, 'error');
      } finally {
        setLoading(false);
      }
    });
  }

  async function syncStatus() {
    if (!isGasConfigured()) return;
    try {
      const result = await jsonp('status', { guestId });
      if (!result || !result.ok) return;
      if (result.displayName && config.guests && config.guests[guestId]) {
        config.guests[guestId].displayName = result.displayName;
      }
      if (els.emailInput && result.email && !els.emailInput.value) els.emailInput.value = result.email;
      if (els.allergyInput && result.allergy && !els.allergyInput.value) els.allergyInput.value = result.allergy;
      if (result.completed) localStorage.setItem(storageKey, 'server');
      else localStorage.removeItem(storageKey);
      setMessage(Boolean(result.completed));
    } catch (error) {
      console.warn('Status sync failed:', error);
    }
  }

  function jsonp(action, params = {}) {
    return new Promise((resolve, reject) => {
      let url;
      try {
        url = new URL(config.gasWebAppUrl);
      } catch (error) {
        reject(new Error('GASのWebアプリURLが正しくありません。'));
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
      const timer = window.setTimeout(() => cleanup(new Error('通信がタイムアウトしました。')), 20000);
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

  function setLoading(loading) {
    if (!els.submitButton) return;
    els.submitButton.disabled = loading;
    els.submitButton.textContent = loading ? 'Sending...' : 'Send Reply';
  }

  function setStatus(message, type) {
    if (!els.formStatus) return;
    els.formStatus.textContent = message || '';
    els.formStatus.classList.toggle('is-success', type === 'success');
    els.formStatus.classList.toggle('is-error', type === 'error');
  }

  function clearStatus() {
    setStatus('', '');
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }
})();
