document.addEventListener('DOMContentLoaded', () => {
  cargarClinica();

  // 🔁 refresco automático cada 2 segundos (para instantáneo)
  setInterval(() => {
    cargarClinica();
  }, 2000);
});

let pacienteActualId = null;

async function cargarClinica() {
  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/clinica/ambulancias');
    const data = await res.json();

    if (!data || !data.length) {
      resetAmbulancia1();
      return;
    }

    const amb = data[0]; // tomar la primera ambulancia

    // 🔁 Si cambió el paciente, reset visual
    const nuevoPacienteId = amb.paciente?.carnet || null;
    if (nuevoPacienteId !== pacienteActualId) {
      resetAmbulancia1();
      pacienteActualId = nuevoPacienteId;
    }

    // ===============================
    // ESTADO AMBULANCIA
    // ===============================
    const tag = document.getElementById('ambulancia1Tag');
    if (amb.en_camino) {
      tag.classList.remove('red');
      tag.classList.add('green');
    } else {
      tag.classList.remove('green');
      tag.classList.add('red');
    }

    // ===============================
    // DATOS PACIENTE
    // ===============================
    const p = amb.paciente;
    if (!p) return;

    p_nombre.innerText = p.nombre ?? '---';
    p_edad.innerText = p.edad ? `${p.edad} años` : '---';
    p_sexo.innerText = p.sexo ?? '---';
    p_sangre.innerText = p.tipo_sangre ?? '---';
    p_traslado.innerText = p.tipo_traslado ?? '---';
    p_ubicacion.innerText = amb.ubicacion ?? '---';
    p_diag.innerText = p.diagnostico ?? '---';

    // ===============================
    // SIGNOS MANUALES
    // ===============================
    pd.innerText = p.presion_diastolica ?? '--';
    ps.innerText = p.presion_sistolica ?? '--';
    fr.innerText = p.frecuencia_respiratoria ?? '--';

    // ===============================
    // SIGNOS AUTOMÁTICOS (ESP32)
    // ===============================
    const s = amb.signos || {};
    const spans = document.querySelectorAll('.signos-grid .signo span');
    if(spans[3]) spans[3].innerText = s.spo2 ?? '--';
    if(spans[4]) spans[4].innerText = s.temperatura ?? '--';
    if(spans[5]) spans[5].innerText = s.frecuencia_cardiaca ?? '--';

    // ===============================
    // GLASGOW + HEMORRAGIA
    // ===============================
    glasgowBadge.innerText = 'GLASGOW ' + (amb.glasgow ?? '--');
    hemorragiaBadge.className = 'badge ' + (amb.hemorragia ? 'green' : 'red');

  } catch(err) {
    console.error('❌ Error clínica:', err);
  }
}

// 🔴 RESET VISUAL
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

// 🔴 SALIR
function salir() {
  localStorage.clear();
  location.href = 'login.html';
}
