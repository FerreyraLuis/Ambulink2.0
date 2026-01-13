let enCamino = false;

async function cargarParamedicos(){
  const res = await fetch('https://ambulink.doc-ia.cloud/paramedicos');
  const data = await res.json();

  chofer.innerHTML = '<option value="">Seleccionar</option>';
  paramedico.innerHTML = '<option value="">Seleccionar</option>';

  data.forEach(p=>{
    const nombre = `${p.nombre} ${p.apellido}`;
    chofer.innerHTML += `<option value="${p.id_paramedico}">${nombre}</option>`;
    paramedico.innerHTML += `<option value="${p.id_paramedico}">${nombre}</option>`;
  });
}

function toggleEnCamino(valor){
  if(valor !== undefined) enCamino = valor;
  else enCamino = !enCamino;

  estadoAmbulancia.innerText = enCamino ? 'EN CAMINO' : 'DETENIDA';
  estadoAmbulancia.style.background = enCamino ? '#1bb14c' : '#e10600';
  btnEnCamino.className = enCamino ? 'btn-green' : 'btn-stop';

  // Avisar a clínica del cambio
  localStorage.setItem('ambulancia1_color', enCamino ? 'green' : 'red');
}

async function guardar(){
  const payload = {
    ubicacion: ubicacion.value,
    en_camino: enCamino,
    personal:{
      chofer: chofer.value,
      paramedico: paramedico.value
    },
    paciente:{
      nombre: nombre.value,
      carnet: carnet.value,
      edad: Number(edad.value),
      sexo: sexo.value,
      tipo_sangre: tipo_sangre.value,
      tipo_traslado: tipo_traslado.value,
      diagnostico: diagnostico.value
    }
  };

  if(
    !payload.ubicacion ||
    !payload.personal.chofer ||
    !payload.personal.paramedico ||
    !payload.paciente.nombre ||
    !payload.paciente.carnet ||
    !payload.paciente.edad ||
    !payload.paciente.sexo ||
    !payload.paciente.tipo_sangre ||
    !payload.paciente.tipo_traslado ||
    !payload.paciente.diagnostico
  ){
    alert('⚠️ Completa todos los campos');
    return;
  }

  const res = await fetch('https://ambulink.doc-ia.cloud/ambulancia/salida', {
    method:'POST',
    headers:{ 'Content-Type':'application/json' },
    body: JSON.stringify(payload)
  });
  const r = await res.json();

  if(r.ok){
    localStorage.setItem('salida_activa', r.id_salida);
    localStorage.setItem('paciente_activo', JSON.stringify(payload.paciente));
    localStorage.setItem('ubicacion_activa', payload.ubicacion);
    // Avisar a clínica que hay paciente nuevo
    localStorage.setItem('clinica_update', Date.now());
    window.location.href = 'monitoreo.html';
  } else alert('❌ Error al guardar');
}

function irMonitoreo(){
  if(!localStorage.getItem('salida_activa')){
    alert('⚠️ Primero debes registrar un paciente');
    return;
  }
  window.location.href = 'monitoreo.html';
}

function logout(){
  localStorage.clear();
  location.href='index.html';
}

// 🔴 NUEVO PACIENTE – RESET COMPLETO
async function nuevoPaciente(){
  const idSalida = localStorage.getItem('salida_activa');

  if(idSalida){
    await fetch('https://ambulink.doc-ia.cloud/salida/monitoreo',{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ id_salida: idSalida, monitoreo_activo: false })
    });
  }

  ['nombre','carnet','edad','sexo','tipo_sangre','tipo_traslado','diagnostico','ubicacion'].forEach(id=>{
    const el = document.getElementById(id);
    if(el) el.value = '';
  });
  toggleEnCamino(false);

  localStorage.removeItem('salida_activa');
  localStorage.removeItem('paciente_activo');
  localStorage.removeItem('ubicacion_activa');

  // Avisar a clínica que se reinició
  localStorage.setItem('clinica_reset', Date.now());

  // Redirigir directo
  window.location.href = 'ambulancia.html';
}
