document.addEventListener('DOMContentLoaded', () => {
  const p_nombre = document.getElementById('p_nombre');
  const p_edad = document.getElementById('p_edad');
  const p_sexo = document.getElementById('p_sexo');
  const p_sangre = document.getElementById('p_sangre');
  const p_traslado = document.getElementById('p_traslado');
  const p_ubicacion = document.getElementById('p_ubicacion');
  const p_diag = document.getElementById('p_diag');

  const hemorragiaBadge = document.getElementById('hemorragiaBadge');
  const glasgowBadge = document.getElementById('glasgowBadge');
  const ambulancia1Tag = document.getElementById('ambulancia1Tag');

  // Limpiar pantalla
  function limpiarPaciente(){
    [p_nombre,p_edad,p_sexo,p_sangre,p_traslado,p_ubicacion,p_diag].forEach(el=>{
      if(el) el.innerText = el.id === 'p_edad' ? '--' : '---';
    });
    hemorragiaBadge.style.display = 'none';
    glasgowBadge.innerText = 'GLASGOW --';
    ambulancia1Tag.className = 'ambulancia-tag red';
  }

  // Cargar paciente activo
  function cargarPaciente(){
    const paciente = JSON.parse(localStorage.getItem('paciente_activo')) || {};
    p_nombre.innerText = paciente.nombre ?? '---';
    p_edad.innerText = paciente.edad ? paciente.edad+' años' : '--';
    p_sexo.innerText = paciente.sexo ?? '---';
    p_sangre.innerText = paciente.tipo_sangre ?? '---';
    p_traslado.innerText = paciente.tipo_traslado ?? '---';
    p_ubicacion.innerText = paciente.ubicacion ?? '---';
    p_diag.innerText = paciente.diagnostico ?? '---';

    hemorragiaBadge.style.display = paciente.hemorragia ? 'block' : 'none';
    glasgowBadge.innerText = paciente.glasgow ? `GLASGOW ${paciente.glasgow}` : 'GLASGOW --';

    // Color En Camino
    const color = localStorage.getItem('ambulancia1_color') === 'green' ? 'green' : 'red';
    ambulancia1Tag.className = 'ambulancia-tag ' + (color==='green'?'green':'red');
  }

  // Detectar cambios desde ambulancia
  window.addEventListener('storage', (e)=>{
    if(e.key === 'clinica_reset') limpiarPaciente();
    if(e.key === 'clinica_update') cargarPaciente();
    if(e.key === 'ambulancia1_color'){
      const color = e.newValue === 'green' ? 'green' : 'red';
      ambulancia1Tag.className = 'ambulancia-tag ' + (color==='green'?'green':'red');
    }
  });

  // Cargar al inicio
  cargarPaciente();

  // Botón salir
  window.salir = function(){
    window.location.href='index.html';
  };
});
