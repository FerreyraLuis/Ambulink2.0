async function protegerPagina(rolEsperado) {
  const token = localStorage.getItem('access_token');

  // 🔴 SIN TOKEN → LOGIN
  if (!token) {
    location.href = 'login.html';
    return;
  }

  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/auth/me', {
      headers: {
        Authorization: 'Bearer ' + token
      }
    });

    // 🔴 TOKEN INVÁLIDO / EXPIRADO
    if (!res.ok) {
      localStorage.clear();
      location.href = 'login.html';
      return;
    }

    const data = await res.json();
    console.log('GUARD AUTH:', data);

    // 🔴 SIN PERMISOS O ROL INCORRECTO
    if (!data.ok || data.tipo_rol !== rolEsperado) {
      localStorage.clear();
      location.href = 'login.html';
      return;
    }

    // ✅ TODO CORRECTO → NO HACE NADA

  } catch (err) {
    console.error('GUARD ERROR:', err);
    localStorage.clear();
    location.href = 'login.html';
  }
}
