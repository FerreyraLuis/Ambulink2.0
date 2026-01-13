/* =====================================================
   🚑 CLÍNICA – INTELIGENTE
===================================================== */
let pacienteActualId = null;
let autoUpdate = true;
let intervaloCarga = null;

document.addEventListener('DOMContentLoaded', () => {
  resetAmbulancia1();      // Limpieza inicial
  cargarClinica();         // Carga inicial de datos
  iniciarAutoUpdate();     // Auto-update cada 5s
});

/* =====================================================
   🔴 AUTO UPDATE INTELIGENTE
===================================================== */
function iniciarAutoUpdate() {
  intervaloCarga = setInterval(() => {
    cargarClinica();
  }, 5000);
}

/* =====================================================
   🚑 CARGAR CLÍNICA – AMBULANCIAS + PACIENTES + SIGNOS
===================================================== */
async function cargarClinica() {
  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/clinica/ambulancias');
    const data = await res.json();
    if (!data || !data.length) return;

    const amb = data[0];
    const nuevoPacienteId = amb.paciente?.carnet || null;

    // 🔹 Detecta paciente nuevo
    if (nuevoPacienteId && nuevoPacienteId !== pacienteActualId) {
      pacienteActualId = nuevoPacienteId;
      autoUpdate = true; // Reactiva auto-update si llega un paciente
    }

    // 🔹 Si no hay paciente o autoUpdate está desactivado, no mostrar datos
    if (!nuevoPacienteId || !autoUpdate) return;

    // ========================= ESTADO AMBULANCIA =========================
    const tag = document.getElementById('ambulancia1Tag');
    if (amb.en_camino) {
      tag.classList.remove('red');
      tag.classList.add('green');
    } else {
      tag.classList.remove('green');
      tag.classList.add('red');
    }

    // ========================= DATOS PACIENTE =========================
    const p = amb.paciente || {};
    document.getElementById('p_nombre').innerText = p.nombre ?? '---';
    document.getElementById('p_edad').innerText = p.edad ? `${p.edad} años` : '---';
    document.getElementById('p_sexo').innerText = p.sexo ?? '---';
    document.getElementById('p_sangre').innerText = p.tipo_sangre ?? '---';
    document.getElementById('p_traslado').innerText = p.tipo_traslado ?? '---';
    document.getElementById('p_ubicacion').innerText = amb.ubicacion ?? '---';
    document.getElementById('p_diag').innerText = p.diagnostico ?? '---';

    // ========================= SIGNOS MANUALES =========================
    document.getElementById('pd').innerText = p.presion_diastolica ?? '--';
    document.getElementById('ps').innerText = p.presion_sistolica ?? '--';
    document.getElementById('fr').innerText = p.frecuencia_respiratoria ?? '--';

    // ========================= SIGNOS AUTOMÁTICOS (ESP32) =========================
    const s = amb.signos || {};
    document.getElementById('c_spo2').innerText = s.spo2 ?? '--';
    document.getElementById('c_temp').innerText = s.temperatura ?? '--';
    document.getElementById('c_fc').innerText = s.frecuencia_cardiaca ?? '--';

    // ========================= GLASGOW + HEMORRAGIA =========================
    document.getElementById('glasgowBadge').innerText = 'GLASGOW ' + (amb.glasgow ?? '--');
    document.getElementById('hemorragiaBadge').className = 'badge ' + (amb.hemorragia ? 'green' : 'red');

  } catch (err) {
    console.error('❌ Error cargando clínica:', err);
  }
}

/* =====================================================
   🔴 RESET VISUAL AMBULANCIA – LIMPIO
===================================================== */
function resetAmbulancia1() {
  ['p_nombre','p_edad','p_sexo','p_sangre','p_traslado','p_ubicacion','p_diag'].forEach(id => {
    document.getElementById(id).innerText = '---';
  });

  ['pd','ps','fr','c_spo2','c_temp','c_fc'].forEach(id => {
    document.getElementById(id).innerText = '--';
  });

  document.getElementById('glasgowBadge').innerText = 'GLASGOW --';
  document.getElementById('hemorragiaBadge').className = 'badge red';

  const tag = document.getElementById('ambulancia1Tag');
  tag.classList.remove('green');
  tag.classList.add('red');

  pacienteActualId = null; // Limpieza total del paciente
  autoUpdate = false;      // Bloquea recarga hasta que llegue un paciente
}

/* =====================================================
   🔴 NUEVO PACIENTE – FULL INTELIGENTE
===================================================== */
function nuevoPaciente() {
  resetAmbulancia1();
  alert('✅ Nuevo paciente activado. La clínica está limpia y lista.');
}

/* =====================================================
   🔴 SALIR
===================================================== */
function salir() {
  localStorage.clear();
  resetAmbulancia1();
  location.href = 'login.html';
}
