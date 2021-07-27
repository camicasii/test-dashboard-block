import firebase from 'firebase';
import { v4 as uuidv4 } from 'uuid';
import { loadStripe } from '@stripe/stripe-js';

const LS_KEY_TOKEN = 'mt';
const PROVIDER_GOOGLE = 'PROVIDER_GOOGLE';
const PROVIDER_FACEBOOK = 'PROVIDER_FACEBOOK';
const apiBaseUrl = process.env.MONCON_API_BASE_URL;
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
};

const currentScriptSrc = document.currentScript.src;
const queryString = currentScriptSrc.substring(currentScriptSrc.indexOf('?'));
const urlParams = new URLSearchParams(queryString);
const publisherId = urlParams.get('id');
const sessionId = uuidv4();
const url = window.location.protocol + '//' + window.location.host + window.location.pathname;
let user;
let content;

function sendPageView(userId, justPurchased) {
  let apiUrl = apiBaseUrl + '/js/pageview?publisherId=' + encodeURIComponent(publisherId) + '&url=' + encodeURIComponent(url) + '&sessionId=' + sessionId;
  if (userId) {
    apiUrl += '&userId=' + encodeURIComponent(userId);
  }
  if (justPurchased) {
    apiUrl += '&justPurchased=true';
  }
  fetch(apiUrl)
    .then((response) => response.json())
    .then((response) => {
      const { isPremium, isLoggedIn, isPurchased, userBalance } = response;      
      if (isPremium && !isPurchased) {
        content = response.content;
        showMonconLayer();

        if (!isLoggedIn) {
          showStep1();
        } else if (!isPurchased) {
          user = firebase.auth().currentUser;
          if (userBalance < content.amount) {
            showStepPayment();
          } else {
            showStep3();
          }
        }
      } else {
        hideMonconLayer();
      }
    });
}

function handleLoginGoogle() {
  handleLoginProvider(PROVIDER_GOOGLE);
}

function handleLoginFacebook() {
  handleLoginProvider(PROVIDER_FACEBOOK);
}

function handleLoginProvider(providerName) {
  const provider = providerName === PROVIDER_GOOGLE
      ? new firebase.auth.GoogleAuthProvider()
      : new firebase.auth.FacebookAuthProvider();

  firebase.auth().signInWithPopup(provider)
      .then((userCredential) => {
          console.log('OK', userCredential);
          if (userCredential.additionalUserInfo.isNewUser) {
            userCredential.user.getIdToken()
              .then((token) => {
                return fetch(apiBaseUrl + '/register/setCustomClaims', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    token: token,
                    claim: 'user',
                  }),
                })
              })
              .then(() => {
                // Refresh token to get the new token containing the user role
                userCredential.user.getIdTokenResult(true)
                  .then((tokenData) => {
                    localStorage.setItem(LS_KEY_TOKEN, tokenData.token);
                    sendPageView(tokenData.claims.user_id);
                  });
              });
          } else {
            userCredential.user.getIdTokenResult()
              .then((tokenData) => {
                localStorage.setItem(LS_KEY_TOKEN, tokenData.token);
                sendPageView(tokenData.claims.user_id);
              });
          }
          return false;
      })
      .catch((error) => {
          var errorCode = error.code;
          var errorMessage = error.message;
          console.log('NOK', errorMessage);
          alert(errorMessage);
      });
}

function purchase() {
  const token = localStorage.getItem(LS_KEY_TOKEN);
  fetch(apiBaseUrl + '/user/purchase', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      publisherId,
      contentId: content.id,
    }),
  })
  .then(() => {
    const currentUser = firebase.auth().currentUser;
    sendPageView(currentUser.uid, true);
  });
}

function payment() {
  const token = localStorage.getItem(LS_KEY_TOKEN);
  fetch(apiBaseUrl + '/user/payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userId: user.uid }),
  })
  .then(() => {
    showStep3();
  });
}

function showMonconLayer() {
  document.getElementById('moncon-block').style.display = 'block';
}

function hideMonconLayer() {
  document.getElementById('moncon-block').style.display = 'none';
}

function getBrowserLocale() {
  return navigator.language || 'en-US';
}

function getContentPrice() {
  return new Intl.NumberFormat(getBrowserLocale(), {style: 'currency', currency: content.currency}).format((content.amount) || 0)
}

function showStep1() {
  const htmlStep1 = `
    <div id="moncon-step1-logo">
      <span></span>
      <img src="${process.env.MONCON_CDN_BASE_URL}/images/moncon_negro.png" />
    </div>
    <div id="moncon-step1-title">
      Desbloquea este contenido con Moncon Wallet
    </div>
    <div id="moncon-step1-description">
      Tu único login para consumir contenido en miles de páginas.
    </div>
    <div id="moncon-step1-button">
      <button>Desbloquear con Moncon | ${getContentPrice()}
    </div>
  `;

  var divLayer = document.createElement('div');
  divLayer.id = 'moncon-step1';
  divLayer.innerHTML = htmlStep1.trim();
  const contentDiv = document.getElementById('moncon-content');
  contentDiv.appendChild(divLayer);
  document.getElementById('moncon-step1-button').children[0].onclick = showStepLogin;
}

function showStepLogin() {
  const htmlStep2 = `
    <div id="moncon-step2-logo">
      <span></span>
      <img src="${process.env.MONCON_CDN_BASE_URL}/images/moncon_negro.png" />
    </div>
    <div id="moncon-step2-image">
      <span></span>
      <img src="${process.env.MONCON_CDN_BASE_URL}/images/wallet.png" />
    </div>
    <div id="moncon-step2-title">
      Carga tu wallet y desbloquea contenido en miles de páginas web.
    </div>
    <div id="moncon-step2-description">
      Con Moncon hemos eliminado las tasas de pago haciendo el pago más justo para todos
    </div>
    <div id="moncon-step-login-buttons">
      <button id="moncon-step-login-button-facebook">Login with Facebook</button>
      <button id="moncon-step-login-button-google">Login with Google</button>
    </div>
  `;

  var divLayer = document.createElement('div');
  divLayer.id = 'moncon-step2';
  divLayer.innerHTML = htmlStep2.trim();
  const contentDiv = document.getElementById('moncon-content');
  contentDiv.innerHTML = '';
  contentDiv.appendChild(divLayer);

  console.log(document.getElementById('moncon-step-login-buttons').children);
  document.getElementById('moncon-step-login-buttons').children[0].onclick = handleLoginFacebook;
  document.getElementById('moncon-step-login-buttons').children[1].onclick = handleLoginGoogle;
}

async function showStepPayment() {

  const token = localStorage.getItem(LS_KEY_TOKEN);
  const response = await fetch(apiBaseUrl + '/user/paymentIntent', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const responseSecret = await response.json();
  const clientSecret = responseSecret.clientSecret;
  
  const htmlStepPayment = `
    <div id="moncon-step-payment">
      <div id="moncon-step-payment-logo">
        <span></span>
        <img src="${process.env.MONCON_CDN_BASE_URL}/images/moncon_negro.png" />
      </div>
      <div id="moncon-step-payment-title">
        Paga únicamente por el contenido que quieres ver
      </div>
      <div id="moncon-step-payment-card">
        <div id="moncon-card-element"></div>
        <div id="moncon-card-errors" role="alert"></div>
      </div>
      <button id="moncon-button-payment">Continue</button>
    </div>
  `;

  var divLayer = document.createElement('div');
  divLayer.id = 'moncon-step-payment';
  divLayer.innerHTML = htmlStepPayment.trim();
  const contentDiv = document.getElementById('moncon-content');
  contentDiv.innerHTML = '';
  contentDiv.appendChild(divLayer);
  // document.getElementById('moncon-step-payment-button').children[0].onclick = showStep3;

  const stripe = await loadStripe('pk_test_51IdgLBLiMNqW7vW7fNZcufkfQSHDqHk7aPeGJeiNt8Z9ain19s3F1NlIbKXiorkyFl0K5d5IVA8GaAtAIqMBwkca00xhPEK3UX');
  const elements = stripe.elements();
  const cardElement = elements.create('card', { hidePostalCode: true });
  cardElement.mount('#moncon-card-element');

  cardElement.on('change', ({error}) => {
    let displayError = document.getElementById('moncon-card-errors');
    if (error) {
      displayError.textContent = error.message;
    } else {
      displayError.textContent = '';
    }
  });

  document.getElementById("moncon-button-payment").addEventListener("click", function() {
    stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: cardElement,
        billing_details: {
          name: user.email,
        }
      }
    }).then(function(result) {
      if (result.error) {
        // Show error to your customer (e.g., insufficient funds)
        console.log(result.error.message);
      } else {
        // The payment has been processed!
        if (result.paymentIntent.status === 'succeeded') {
          // Show a success message to your customer
          // There's a risk of the customer closing the window before callback
          // execution. Set up a webhook or plugin to listen for the
          // payment_intent.succeeded event that handles any business critical
          // post-payment actions.
          console.log('PAYMENT OK');
          payment();
        }
      }
    });
  });
}

function showStep3() {
  const htmlStep3 = `
    <div id="moncon-step3-header">
      <div id="moncon-step3-header-premium">
        <img src="${process.env.MONCON_CDN_BASE_URL}/images/padlock.png" />
        <span>Contenido Premium</span>
      </div>
      <div id="moncon-step3-header-user">
        <span>${user.displayName}</span>
        <img src="${user.photoURL || process.env.MONCON_CDN_BASE_URL + '/images/user.png'}">
      </div>
    </div>
    <div id="moncon-step3-logo">
      <span></span>
      <img src="${process.env.MONCON_CDN_BASE_URL}/images/moncon_negro.png" />
    </div>
    <div id="moncon-step3-text">
      Soporta el periodismo de calidad.
    </div>
    <div id="moncon-step3-button">
      <button><span style="margin-right: 20px">Desbloquea este artículo</span><span>${getContentPrice()}</span>
    </div>
  `;

  var divLayer = document.createElement('div');
  divLayer.id = 'moncon-step3';
  divLayer.innerHTML = htmlStep3.trim();
  const contentDiv = document.getElementById('moncon-content');
  contentDiv.innerHTML = '';
  contentDiv.appendChild(divLayer);
  document.getElementById('moncon-step3-button').children[0].onclick = purchase;
}

var htmlString = `
  <div id="moncon-wrapper">
    <div id="moncon-content"></div>
  </div>
`;
var divLayer = document.createElement('div');
divLayer.id = 'moncon-block';
divLayer.style.height = document.body.offsetHeight + 'px';
divLayer.innerHTML = htmlString.trim();
document.body.appendChild(divLayer);

firebase.initializeApp(firebaseConfig);
let initialLoad = true;
      
firebase.auth().onAuthStateChanged((user) => {
  if (initialLoad) {
    initialLoad = false;
    sendPageView(user?.uid);
  }
});

