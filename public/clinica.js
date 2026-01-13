// clinica.js

document.addEventListener('DOMContentLoaded', () => {
  // Elementos del paciente
  const p_nombre = document.getElementById('p_nombre');
  const p_edad = document.getElementById('p_edad');
  const p_sexo = document.getElementById('p_sexo');
  const p_sangre = document.getElementById('p_sangre');
  const p_traslado = document.getElementById('p_traslado');
  const p_ubicacion = document.getElementById('p_ubicacion');
  const p_diag = document.getElementById('p_diag');

  // Signos vitales
  const pd = document.getElementById('pd');
  const ps = document.getElementById('ps');
  const fr = document.getElementById('fr');
  const c_spo2 = document.getElementById('c_spo2');
  const c_temp = document.getElementById('c_temp');
  const c_fc = document.getElementById('c_fc');

  // Badges
  const hemorragiaBadge = document.getElementById('hemorragiaBadge');
  const glasgowBadge = document.getElementById('glasgowBadge');

  // Fecha
  const fechaHoy = document.getElementById('fechaHoy');
  fechaHoy.innerText = new Date().toLocaleDateString('es-ES');

  // Cargar paciente activo si existe
  function cargarPaciente() {
    const paciente = JSON.parse(localStorage.getItem('paciente_activo'));

    if (!paciente) {
      limpiarPaciente();
      return;
    }

    p_nombre.innerText = paciente.nombre ?? '---';
    p_edad.innerText = paciente.edad ? paciente.edad + ' años' : '---';
    p_sexo.innerText = paciente.sexo ?? '---';
    p_sangre.innerText = paciente.tipo_sangre ?? '---';
    p_traslado.innerText = paciente.tipo_traslado ?? '---';
    p_ubicacion.innerText = paciente.ubicacion ?? '---';
    p_diag.innerText = paciente.diagnostico ?? '---';

    // Signos vitales
    pd.innerText = paciente.presion_diastolica ?? '--';
    ps.innerText = paciente.presion_sistolica ?? '--';
    fr.innerText = paciente.frecuencia_respiratoria ?? '--';
    c_spo2.innerText = paciente.spo2 ?? '--';
    c_temp.innerText = paciente.temperatura ?? '--';
    c_fc.innerText = paciente.frecuencia_cardiaca ?? '--';

    // Badges
    hemorragiaBadge.style.display = paciente.hemorragia ? 'block' : 'none';
    glasgowBadge.innerText = paciente.glasgow ? `GLASGOW ${paciente.glasgow}` : 'GLASGOW --';
  }

  // Limpiar datos de paciente
  function limpiarPaciente() {
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
    c_spo2.innerText = '--';
    c_temp.innerText = '--';
    c_fc.innerText = '--';

    hemorragiaBadge.style.display = 'none';
    glasgowBadge.innerText = 'GLASGOW --';
  }

  // Botón Nuevo Paciente
  window.nuevoPaciente = function() {
    localStorage.removeItem('paciente_activo'); // Borra el paciente activo
    limpiarPaciente();
  }

  // Salir de la clínica
  window.salir = function() {
    // Puedes agregar limpieza de sesión si tienes login
    window.location.href = 'index.html';
  }

  // Cargar al iniciar
  cargarPaciente();
});
