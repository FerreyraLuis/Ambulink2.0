let enCamino = false;

/* =========================
   CARGAR PARAMÉDICOS
========================= */
async function cargarParamedicos() {
  const res = await fetch('https://ambulink.doc-ia.cloud/paramedicos');
  const data = await res.json();

  chofer.innerHTML = '<option value="">Seleccionar</option>';
  paramedico.innerHTML = '<option value="">Seleccionar</option>';

  data.forEach(p => {
    const nombre = `${p.nombre} ${p.apellido}`;

    chofer.innerHTML += `<option value="${p.id_paramedico}">${nombre}</option>`;
    paramedico.innerHTML += `<option value="${p.id_paramedico}">${nombre}</option>`;
  });
}

/* =========================
   ESTADO EN CAMINO
========================= */
function toggleEnCamino(valor) {
  if (valor !== undefined) {
    enCamino = valor;
  } else {
    enCamino = !enCamino;
  }

  estadoAmbulancia.innerText = enCamino ? 'EN CAMINO' : 'DETENIDA';
  estadoAmbulancia.style.background = enCamino ? '#1bb14c' : '#e10600';
  btnEnCamino.className = enCamino ? 'btn-green' : 'btn-stop';

  localStorage.setItem(
    'ambulancia1_color',
    enCamino ? 'green' : 'red'
  );
}

/* =========================
   GUARDAR PACIENTE
========================= */
async function guardar() {
  const payload = {
    ubicacion: ubicacion.value,
    en_camino: enCamino,
    personal: {
      chofer: chofer.value,
      paramedico: paramedico.value
    },
    paciente: {
      nombre: nombre.value,
      carnet: carnet.value,
      edad: Number(edad.value),
      sexo: sexo.value,
      tipo_sangre: tipo_sangre.value,
      tipo_traslado: tipo_traslado.value,
      diagnostico: diagnostico.value
    }
  };

  if (
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
  ) {
    alert('⚠️ Completa todos los campos');
    return;
  }

  const res = await fetch(
    'https://ambulink.doc-ia.cloud/ambulancia/salida',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }
  );

  const r = await res.json();

  if (r.ok) {
    localStorage.setItem('salida_activa', r.id_salida);
    localStorage.setItem('paciente_activo', JSON.stringify(payload.paciente));
    localStorage.setItem('ubicacion_activa', payload.ubicacion);

    alert('✅ Paciente registrado correctamente');
    window.location.href = 'monitoreo.html';
  } else {
    alert('❌ Error al guardar');
  }
}

/* =========================
   IR A MONITOREO
========================= */
function irMonitoreo() {
  if (!localStorage.getItem('salida_activa')) {
    alert('⚠️ Primero debes registrar un paciente');
    return;
  }

  window.location.href = 'monitoreo.html';
}

/* =========================
   LOGOUT
========================= */
function logout() {
  localStorage.clear();
  location.href = 'index.html';
}

/* =========================
   LIMPIAR CLÍNICA AL ENTRAR
========================= */
document.addEventListener('DOMContentLoaded', () => {
  limpiarClinica();   // ✅ Todos los campos vacíos
  cargarParamedicos(); // cargar lista de paramédicos como siempre
});

function limpiarClinica() {
  [
    'nombre',
    'carnet',
    'edad',
    'sexo',
    'tipo_sangre',
    'tipo_traslado',
    'diagnostico',
    'ubicacion',
    'chofer',
    'paramedico'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
}
