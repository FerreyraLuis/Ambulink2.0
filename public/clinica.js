/* =====================================================
   🚑 CLÍNICA – INICIO
===================================================== */
let pacienteActualId = null;      // paciente activo
let monitoreoFinalizado = false;  // controlar si finalizó monitoreo
let ultimoDato = null;             // fecha/hora último dato recibido

document.addEventListener('DOMContentLoaded', () => {
  pacienteActualId = null;
  monitoreoFinalizado = false;
  ultimoDato = null;

  resetAmbulancia1();
  cargarClinica();

  setInterval(() => {
    cargarClinica();
  }, 5000);
});

// 🔴 Escuchar cambios en localStorage para reset instantáneo
window.addEventListener('storage', (e) => {
  if (e.key === 'clinica_reset') {
    resetAmbulancia1();
    pacienteActualId = null;
    monitoreoFinalizado = false;
    ultimoDato = null;
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

    const amb = data[0];

    // ⚠️ No actualizar paciente si monitoreo finalizado
    if (monitoreoFinalizado) return;

    // ✅ Actualizar último dato recibido
    if (amb.paciente) {
      ultimoDato = new Date(); // marca hora actual
    }

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
  const ahora = new Date();

  // ⚠️ Revisar si han pasado 5 minutos desde el último dato
  if (!ultimoDato || (ahora - ultimoDato) >= 5 * 60 * 1000) {
    resetAmbulancia1();
    pacienteActualId = null;
    monitoreoFinalizado = true;
    alert('✅ Monitoreo finalizado. Dashboard reiniciado.');
  } else {
    const minutosRestantes = Math.ceil((5 * 60 * 1000 - (ahora - ultimoDato)) / 60000);
    alert(`⏳ No puedes finalizar monitoreo todavía.\nFaltan aprox ${minutosRestantes} minuto(s) de datos recientes.`);
  }
}

/* =====================================================
   🔴 SALIR
===================================================== */
function salir() {
  localStorage.clear();
  pacienteActualId = null;
  monitoreoFinalizado = false;
  ultimoDato = null;
  resetAmbulancia1();
  location.href = 'login.html';
}
