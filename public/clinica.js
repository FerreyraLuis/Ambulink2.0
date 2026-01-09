document.addEventListener('DOMContentLoaded', () => {
  // 🔴 Si no hay paciente activo, iniciar vacío
  if (!localStorage.getItem('paciente_activo')) {
    resetAmbulancia1();
  }

  cargarClinica();

  // 🔁 refresco automático cada 2s
  setInterval(() => {
    cargarClinica();
    // 🔴 reset instantáneo si se presionó Nuevo Paciente
    if(localStorage.getItem('clinica_reset')){
      resetAmbulancia1();
      localStorage.removeItem('clinica_reset');
    }
  }, 2000);
});

let pacienteActualId = null;

async function cargarClinica() {
  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/clinica/ambulancias');
    const data = await res.json();

    if (!data || !data.length) {
      // Si no hay paciente activo, mantener todo vacío
      if(!localStorage.getItem('paciente_activo')){
        resetAmbulancia1();
        return;
      }
    }

    const amb = data[0];

    // 🔁 Solo actualizar si hay paciente activo
    const pacienteActivo = JSON.parse(localStorage.getItem('paciente_activo') || 'null');
    if(!pacienteActivo) return;

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

    // SIGNOS
    pd.innerText = p.presion_diastolica ?? '--';
    ps.innerText = p.presion_sistolica ?? '--';
    fr.innerText = p.frecuencia_respiratoria ?? '--';

    const s = amb.signos || {};
    const spans = document.querySelectorAll('.signos-grid .signo span');
    if(spans[3]) spans[3].innerText = s.spo2 ?? '--';
    if(spans[4]) spans[4].innerText = s.temperatura ?? '--';
    if(spans[5]) spans[5].innerText = s.frecuencia_cardiaca ?? '--';

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
  resetAmbulancia1();
  location.href = 'login.html';
}
