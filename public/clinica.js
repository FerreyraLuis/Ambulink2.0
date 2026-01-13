/* =====================================================
   🚑 CLÍNICA – INICIO
===================================================== */
let pacienteActualId = null;      // paciente activo
let monitoreoFinalizado = false;  // controlar si finalizó monitoreo

document.addEventListener('DOMContentLoaded', () => {
  pacienteActualId = null;       // empezar sin paciente
  monitoreoFinalizado = false;   // monitoreo activo

  // 🔴 RESET INICIAL: dashboard vacío
  resetAmbulancia1();

  cargarClinica();

  // 🔁 refresco en tiempo real cada 5 segundos
  setInterval(() => {
    cargarClinica();
  }, 5000);
});

// 🔴 Escuchar cambios en localStorage para reset instantáneo
window.addEventListener('storage', (e) => {
  if (e.key === 'clinica_reset') {
    resetAmbulancia1();
    pacienteActualId = null;       // reinicia paciente activo
    monitoreoFinalizado = false;   // monitoreo activo de nuevo
  }
});

/* =====================================================
   🚑 CLÍNICA – ACTUALIZACIÓN AUTOMÁTICA Y RESET
===================================================== */
async function cargarClinica() {
  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/clinica/ambulancias');
    const data = await res.json();

    if (!data || !data.length) {
      resetAmbulancia1();
      return;
    }

    const amb = data[0]; // ambulancia más reciente

    // ⚠️ Si el monitoreo está finalizado, no actualizamos paciente
    if (monitoreoFinalizado) return;

    // ✅ Si el paciente cambió, resetear
    const nuevoPacienteId = amb.paciente?.carnet || null;
    if (nuevoPacienteId !== pacienteActualId) {
      resetAmbulancia1();
      pacienteActualId = nuevoPacienteId;
    }

    /* ===============================
       ESTADO AMBULANCIA
    =============================== */
    const tag = document.getElementById('ambulancia1Tag');
    if (amb.en_camino) {
      tag.classList.remove('red');
      tag.classList.add('green');
    } else {
      tag.classList.remove('green');
      tag.classList.add('red');
    }

    /* ===============================
       DATOS PACIENTE
    =============================== */
    const p = amb.paciente;
    if (!p) return;

    p_nombre.innerText = p.nombre ?? '---';
    p_edad.innerText = p.edad ? `${p.edad} años` : '---';
    p_sexo.innerText = p.sexo ?? '---';
    p_sangre.innerText = p.tipo_sangre ?? '---';
    p_traslado.innerText = p.tipo_traslado ?? '---';
    p_ubicacion.innerText = amb.ubicacion ?? '---';
    p_diag.innerText = p.diagnostico ?? '---';

    /* ===============================
       SIGNOS MANUALES
    =============================== */
    pd.innerText = p.presion_diastolica ?? '--';
    ps.innerText = p.presion_sistolica ?? '--';
    fr.innerText = p.frecuencia_respiratoria ?? '--';

    /* ===============================
       SIGNOS AUTOMÁTICOS (ESP32)
    =============================== */
    const s = amb.signos || {};
    const spans = document.querySelectorAll('.signos-grid .signo span');

    if (spans[3]) spans[3].innerText = s.spo2 ?? '--';
    if (spans[4]) spans[4].innerText = s.temperatura ?? '--';
    if (spans[5]) spans[5].innerText = s.frecuencia_cardiaca ?? '--';

    /* ===============================
       GLASGOW + HEMORRAGIA
    =============================== */
    glasgowBadge.innerText = 'GLASGOW ' + (amb.glasgow ?? '--');
    hemorragiaBadge.className = 'badge ' + (amb.hemorragia ? 'green' : 'red');

  } catch (err) {
    console.error('❌ Error clínica:', err);
  }
}

/* =====================================================
   🔴 RESET VISUAL AMBULANCIA
===================================================== */
function resetAmbulancia1() {
  p_nombre.innerText = '---';
  p_edad.innerText = '---';
  p_sexo.innerText = '---';
  p_sangre.innerText = '---';
  p_traslado.innerText = '---';
  p_ubicacion.innerText = '---';
  p_diag.innerText = '---';

  pd.innerText = '--';
  ps.innerText = '--';
  fr.innerText = '--';

  const spans = document.querySelectorAll('.signos-grid .signo span');
  spans.forEach(s => s.innerText = '--');

  glasgowBadge.innerText = 'GLASGOW --';
  hemorragiaBadge.className = 'badge red';

  const tag = document.getElementById('ambulancia1Tag');
  tag.classList.remove('green');
  tag.classList.add('red');
}

/* =====================================================
   🔴 FINALIZAR MONITOREO
===================================================== */
function finalizarMonitoreo() {
  resetAmbulancia1();
  pacienteActualId = null;
  monitoreoFinalizado = true;  // 🔒 Bloquea actualización automática
  alert('✅ Monitoreo finalizado. Dashboard reiniciado.');
}

/* =====================================================
   🔴 SALIR
===================================================== */
function salir() {
  localStorage.clear();
  pacienteActualId = null;
  monitoreoFinalizado = false;
  resetAmbulancia1();
  location.href = 'login.html';
}
