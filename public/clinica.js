/* =====================================================
   🚑 CLÍNICA – INICIO
===================================================== */
let pacienteActualId = null;

document.addEventListener('DOMContentLoaded', () => {
  // 🔴 Reset inicial
  resetAmbulancia1();

  // Carga inicial de datos
  cargarClinica();

  // 🔁 Actualización automática cada 5 segundos
  setInterval(() => {
    cargarClinica();
  }, 5000);
});

// 🔴 Escuchar cambios de localStorage para reset instantáneo
window.addEventListener('storage', (e) => {
  if (e.key === 'reset_clinica_ambulancia1') {
    resetAmbulancia1();
    pacienteActualId = null;
    localStorage.removeItem('reset_clinica_ambulancia1');
  }
});

/* =====================================================
   🚑 CARGAR CLÍNICA – AMBULANCIAS + PACIENTES + SIGNOS
===================================================== */
async function cargarClinica() {
  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/clinica/ambulancias');
    const data = await res.json();

    if (!data || !data.length) {
      resetAmbulancia1();
      return;
    }

    const amb = data[0]; // tomamos la ambulancia más reciente

    // ✅ Si el paciente cambió, hacer reset
    const nuevoPacienteId = amb.paciente?.carnet || null;
    if (nuevoPacienteId !== pacienteActualId) {
      resetAmbulancia1();
      pacienteActualId = nuevoPacienteId;
    }

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
   🔴 RESET VISUAL AMBULANCIA
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
}

/* =====================================================
   🔴 NUEVO PACIENTE
===================================================== */
function nuevoPaciente() {
  // Avisar al dashboard de la clínica que haga reset
  localStorage.setItem('reset_clinica_ambulancia1', 'true');

  localStorage.setItem('ambulancia1_color', 'red');
  localStorage.removeItem('salida_activa');

  alert('✅ Nuevo paciente activado. Clínica restablecida.');
}

/* =====================================================
   🔴 SALIR
===================================================== */
function salir() {
  localStorage.clear();
  pacienteActualId = null;
  resetAmbulancia1();
  location.href = 'login.html';
}
