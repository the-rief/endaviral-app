/* ════════════════════ ACCOUNT PAGE ════════════════════
 * Depends on: api(), toast(), currentUser (globals)
 * ════════════════════════════════════════════════════ */

function initAccountPage() {
  const u = currentUser || {};
  const name = u.name || u.email || '';
  document.getElementById('acctAvatar').textContent = name.charAt(0).toUpperCase() || '?';
  document.getElementById('acctName').textContent = name || '—';
  document.getElementById('acctEmail').textContent = u.email || '—';
  document.getElementById('acctRole').textContent = u.role === 'admin' ? '👑 Admin' : 'User';
  document.getElementById('acctNewName').value = name;
  document.getElementById('chpassErr').style.display = 'none';
  document.getElementById('chpassOk').style.display = 'none';
  document.getElementById('cpOldPass').value = '';
  document.getElementById('cpNewPass').value = '';
  document.getElementById('cpConfPass').value = '';
}

async function doUpdateName() {
  const name = document.getElementById('acctNewName').value.trim();
  if (!name || name.length < 2) { toast('Enter a valid name', 'error'); return; }
  try {
    const data = await api('/auth/update-profile', { method:'PATCH', body:JSON.stringify({name}) });
    currentUser = { ...currentUser, name: data.name || name };
    localStorage.setItem('ev_user', JSON.stringify(currentUser));
    document.getElementById('sbUsername').textContent = name;
    document.getElementById('sbAvatar').textContent = name.charAt(0).toUpperCase();
    initAccountPage();
    toast('Name updated!', 'success');
  } catch(e) { toast(e.message || 'Update failed', 'error'); }
}

async function doChangePassword() {
  const oldPass = document.getElementById('cpOldPass').value;
  const newPass = document.getElementById('cpNewPass').value;
  const confPass = document.getElementById('cpConfPass').value;
  const errEl = document.getElementById('chpassErr');
  const okEl = document.getElementById('chpassOk');
  errEl.style.display = 'none'; okEl.style.display = 'none';

  if (!oldPass) { errEl.textContent = 'Enter your current password.'; errEl.style.display = 'block'; return; }
  if (!newPass || newPass.length < 8) { errEl.textContent = 'New password must be at least 8 characters.'; errEl.style.display = 'block'; return; }
  if (newPass !== confPass) { errEl.textContent = 'New passwords do not match.'; errEl.style.display = 'block'; return; }
  if (oldPass === newPass) { errEl.textContent = 'New password must be different from current password.'; errEl.style.display = 'block'; return; }

  try {
    await api('/auth/change-password', { method:'POST', body:JSON.stringify({ current_password: oldPass, new_password: newPass }) });
    okEl.textContent = 'Password updated successfully!';
    okEl.style.display = 'block';
    document.getElementById('cpOldPass').value = '';
    document.getElementById('cpNewPass').value = '';
    document.getElementById('cpConfPass').value = '';
    toast('Password changed!', 'success');
  } catch(e) {
    errEl.textContent = e.message || 'Failed to change password. Check your current password.';
    errEl.style.display = 'block';
  }
}