document.addEventListener('DOMContentLoaded', () => {
  cargarEstadoAmbulancia();

  // 🔥 REFRESCO TIEMPO REAL CLÍNICA
  setInterval(() => {
    cargarEstadoAmbulancia();
    cargarAmbulancia1();
    cargarSignosTiempoReal();
  }, 5001); // ⏱️ cada 3 segundos
});

/* ===============================
   ESTADO AMBULANCIA (ORIGINAL)
=============================== */
async function cargarEstadoAmbulancia(){
  try{
    const res = await fetch('https://ambulink.doc-ia.cloud/clinica/ambulancias');
    const data = await res.json();

    const amb1 = data.find(a => a.id_ambulancia === 1);
    const tag = document.getElementById('ambulancia1Tag');

    if(!amb1 || amb1.en_camino === false){
      tag.classList.remove('green');
      tag.classList.add('red');
    }else{
      tag.classList.remove('red');
      tag.classList.add('green');
    }

  }catch(err){
    console.error('Error estado ambulancia:', err);
  }
}

/* ===============================
   SIGNOS EN TIEMPO REAL (CLÍNICA)
=============================== */
async function cargarSignosTiempoReal(){
  try{
    const idSalida = localStorage.getItem('salida_activa');
    if(!idSalida) return;

    const res = await fetch(`https://ambulink.doc-ia.cloud/signos/ultimo/${idSalida}`);
    const signos = await res.json();
    if(!signos) return;

    // 🔵 PINTAR SIGNOS AUTOMÁTICOS
    const spans = document.querySelectorAll('.signos-grid .signo span');

    // Orden según tu HTML:
    // 0 PD | 1 PS | 2 FR | 3 SpO2 | 4 Temp | 5 FC
    if(spans[3]) spans[3].innerText = signos.spo2 ?? '--';
    if(spans[4]) spans[4].innerText = signos.temperatura ?? '--';
    if(spans[5]) spans[5].innerText = signos.frecuencia_cardiaca ?? '--';

  }catch(err){
    console.error('Error signos clínica:', err);
  }
}

/* ===============================
   DATOS PACIENTE (ORIGINAL)
=============================== */
async function cargarAmbulancia1(){

  if(localStorage.getItem('reset_clinica_ambulancia1') === 'true'){
    resetAmbulancia1();
    localStorage.removeItem('reset_clinica_ambulancia1');
    return;
  }

  const id = localStorage.getItem('salida_activa');
  if(!id) return;

  const res = await fetch(`https://ambulink.doc-ia.cloud/salidas/${id}`);
  const data = await res.json();
  const p = data.paciente;
  if(!p) return;

  p_nombre.innerText = p.nombre;
  p_edad.innerText = `${p.edad} años`;
  p_sexo.innerText = p.sexo;
  p_sangre.innerText = p.tipo_sangre;
  p_traslado.innerText = p.tipo_traslado;
  p_ubicacion.innerText = data.ubicacion;
  p_diag.innerText = p.diagnostico;

  pd.innerText = p.presion_diastolica ?? '--';
  ps.innerText = p.presion_sistolica ?? '--';
  fr.innerText = p.frecuencia_respiratoria ?? '--';

  glasgowBadge.innerText = 'GLASGOW ' + (p.escala_glasgow ?? '--');
  hemorragiaBadge.className = 'badge ' + (p.hemorragia ? 'green' : 'red');
}

/* ===============================
   RESET (ORIGINAL)
=============================== */
function resetAmbulancia1(){
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
}

/* ===============================
   SALIR (ORIGINAL)
=============================== */
function salir(){
  localStorage.clear();
  location.href='login.html';
}
