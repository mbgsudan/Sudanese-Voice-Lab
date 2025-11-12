import { ADMIN_PASSWORD } from './config.js';
import { showToast } from './utils.js';

const loginForm = document.getElementById('login-form');
const passwordInput = document.getElementById('password');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const enteredPassword = passwordInput.value.trim();

  if (enteredPassword === ADMIN_PASSWORD) {
    sessionStorage.setItem('admin_authenticated', 'true');
    showToast('تم تسجيل الدخول بنجاح', 'success');
    setTimeout(() => {
      window.location.href = '/review.html';
    }, 1000);
  } else {
    showToast('كلمة المرور غير صحيحة', 'error');
    passwordInput.value = '';
    passwordInput.focus();
  }
});