// ===============================
// SUPABASE CLIENT (SIN CONFLICTO)
// ===============================
const SUPABASE_URL = 'https://rggpmsbodpuhldjjwkwz.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5Q7du7soSBlq9pvoh24PVg_YyIFRg8D';

// ⛔ NO usar el nombre "supabase"
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// ===============================
// LOGIN
// ===============================
async function login() {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  const msg = document.getElementById('mensaje');

  if (!email || !password) {
    msg.style.color = 'red';
    msg.innerText = 'Completa todos los campos';
    return;
  }

  msg.style.color = '#555';
  msg.innerText = 'Verificando...';

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    console.log('SUPABASE LOGIN:', data, error);

    if (error || !data?.session) {
      msg.style.color = 'red';
      msg.innerText = 'Credenciales incorrectas';
      return;
    }

    const accessToken = data.session.access_token;

    const res = await fetch('http://localhost:5001/auth/me', {
      headers: {
        Authorization: 'Bearer ' + accessToken
      }
    });

    const info = await res.json();
    console.log('AUTH / ME:', info);

    if (!info.ok) {
      msg.style.color = 'red';
      msg.innerText = 'Usuario sin permisos';
      return;
    }

    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('rol', info.tipo_rol);
    localStorage.setItem('email', info.email);

    if (info.tipo_rol === 'ambulancia') {
      location.href = 'ambulancia.html';
    } else if (info.tipo_rol === 'clinica') {
      location.href = 'clinica.html';
    } else {
      msg.style.color = 'red';
      msg.innerText = 'Rol no reconocido';
    }

  } catch (err) {
    console.error(err);
    msg.style.color = 'red';
    msg.innerText = 'Error de conexión';
  }
}
