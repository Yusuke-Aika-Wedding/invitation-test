const GAS_URL = 'ここにGASのウェブアプリURLを貼る';
const GUEST_ID = 'taro_hanako';
const WEDDING_TIME = new Date('2027-03-21T10:00:00+09:00').getTime();

const messagePage = document.getElementById('messagePage');
const invitationPage = document.getElementById('invitationPage');
const countdown = document.getElementById('countdown');
const formArea = document.getElementById('formArea');
const thanksArea = document.getElementById('thanksArea');
const rsvpForm = document.getElementById('rsvpForm');
const guestName = document.getElementById('guestName');

messagePage.addEventListener('click', () => {
  messagePage.classList.add('hidden');
  invitationPage.classList.remove('hidden');
});

function updateCountdown() {
  const now = Date.now();
  const diff = WEDDING_TIME - now;

  if (diff <= 0) {
    countdown.textContent = '本日です';
    return;
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor(diff / (1000 * 60 * 60)) % 24;
  const minutes = Math.floor(diff / (1000 * 60)) % 60;
  const seconds = Math.floor(diff / 1000) % 60;

  countdown.textContent = `${days}日 ${hours}時間 ${minutes}分 ${seconds}秒`;
}

setInterval(updateCountdown, 1000);
updateCountdown();

function jsonp(url) {
  return new Promise((resolve, reject) => {
    const callbackName = 'callback_' + Date.now();
    window[callbackName] = data => {
      resolve(data);
      delete window[callbackName];
      script.remove();
    };

    const script = document.createElement('script');
    script.src = `${url}&callback=${callbackName}`;
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

async function checkStatus() {
  const data = await jsonp(`${GAS_URL}?action=status&guestId=${GUEST_ID}`);

  if (data.guestName) {
    guestName.textContent = data.guestName;
  }

  if (data.submitted) {
    formArea.classList.add('hidden');
    thanksArea.classList.remove('hidden');
  } else {
    formArea.classList.remove('hidden');
    thanksArea.classList.add('hidden');
  }
}

rsvpForm.action = GAS_URL;

rsvpForm.addEventListener('submit', () => {
  setTimeout(() => {
    formArea.classList.add('hidden');
    thanksArea.classList.remove('hidden');
  }, 1200);
});

checkStatus();
