let pacienteActualId = null;
let monitoreoFinalizado = false;
let ultimoDato = null;

document.addEventListener('DOMContentLoaded', () => {
  pacienteActualId = null;
  monitoreoFinalizado = false;
  ultimoDato = null;

  resetAmbulancia1();
  cargarClinica();

  // Actualización automática cada 5 segundos
  setInterval(() => {
    cargarClinica();
  }, 5000);
});

// Escucha cambios globales si se resetea desde otra pestaña
window.addEventListener('storage', (e) => {
  if (e.key === 'clinica_reset') {
    resetAmbulancia1();
    pacienteActualId = null;
    monitoreoFinalizado = false;
    ultimoDato = null;
  }
});

async function cargarClinica() {
  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/clinica/ambulancias');
    const data = await res.json();

    if (!data || !data.length) {
      resetAmbulancia1();
      return;
    }

    const amb = data[0];
    const nuevoPacienteId = amb.paciente?.carnet || null;

    // Si llega un nuevo paciente, se reactiva el monitoreo
    if (nuevoPacienteId !== pacienteActualId) {
      pacienteActualId = nuevoPacienteId;
      monitoreoFinalizado = false;
      resetAmbulancia1();
    }

    // Si no hay paciente o el monitoreo finalizó para este paciente, no actualizamos
    if (!amb.paciente || monitoreoFinalizado) return;

    // Estado ambulancia
    const tag = document.getElementById('ambulancia1Tag');
    if (amb.en_camino) {
      tag.classList.remove('red');
      tag.classList.add('green');
    } else {
      tag.classList.remove('green');
      tag.classList.add('red');
    }

    // Datos del paciente
    const p = amb.paciente;
    p_nombre.innerText = p.nombre ?? '---';
    p_edad.innerText = p.edad ? `${p.edad} años` : '---';
    p_sexo.innerText = p.sexo ?? '---';
    p_sangre.innerText = p.tipo_sangre ?? '---';
    p_traslado.innerText = p.tipo_traslado ?? '---';
    p_ubicacion.innerText = amb.ubicacion ?? '---';
    p_diag.innerText = p.diagnostico ?? '---';

    // Signos manuales
    document.getElementById('pd').innerText = p.presion_diastolica ?? '--';
    document.getElementById('ps').innerText = p.presion_sistolica ?? '--';
    document.getElementById('fr').innerText = p.frecuencia_respiratoria ?? '--';

    // Signos automáticos
    const s = amb.signos || {};
    document.getElementById('c_spo2').innerText = s.spo2 ?? '--';
    document.getElementById('c_temp').innerText = s.temperatura ?? '--';
    document.getElementById('c_fc').innerText = s.frecuencia_cardiaca ?? '--';

    // Glasgow y hemorragia
    glasgowBadge.innerText = 'GLASGOW ' + (amb.glasgow ?? '--');
    hemorragiaBadge.className = 'badge ' + (amb.hemorragia ? 'green' : 'red');

    // Actualizamos la hora del último dato
    ultimoDato = new Date();

  } catch (err) {
    console.error('❌ Error clínica:', err);
  }
}

function resetAmbulancia1() {
  p_nombre.innerText = '---';
  p_edad.innerText = '---';
  p_sexo.innerText = '---';
  p_sangre.innerText = '---';
  p_traslado.innerText = '---';
  p_ubicacion.innerText = '---';
  p_diag.innerText = '---';

  document.getElementById('pd').innerText = '--';
  document.getElementById('ps').innerText = '--';
  document.getElementById('fr').innerText = '--';
  document.getElementById('c_spo2').innerText = '--';
  document.getElementById('c_temp').innerText = '--';
  document.getElementById('c_fc').innerText = '--';

  glasgowBadge.innerText = 'GLASGOW --';
  hemorragiaBadge.className = 'badge red';

  const tag = document.getElementById('ambulancia1Tag');
  tag.classList.remove('green');
  tag.classList.add('red');
}

function finalizarMonitoreo() {
  resetAmbulancia1();
  pacienteActualId = null;
  monitoreoFinalizado = true;
  alert('✅ Monitoreo finalizado. Dashboard reiniciado.');
}

function salir() {
  localStorage.clear();
  pacienteActualId = null;
  monitoreoFinalizado = false;
  ultimoDato = null;
  resetAmbulancia1();
  location.href = 'login.html';
}
