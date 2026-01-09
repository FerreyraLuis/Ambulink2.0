document.addEventListener('DOMContentLoaded', () => {
  cargarClinica();
  setInterval(cargarClinica, 5000); // refresco automático cada 5s
  escucharResetNuevoPaciente(); // polling automático reset
});

async function cargarClinica(){
  try{
    const res = await fetch('https://ambulink.doc-ia.cloud/clinica/ambulancias');
    const data = await res.json();

    if(!data || !data.length){ resetAmbulancia1(); return; }

    const amb = data[0];
    const tag = document.getElementById('ambulancia1Tag');
    if(amb.en_camino){ tag.classList.replace('red','green'); }
    else { tag.classList.replace('green','red'); }

    const p = amb.paciente;
    if(!p){ resetAmbulancia1(); return; }

    p_nombre.innerText = p.nombre ?? '---';
    p_edad.innerText = p.edad ? `${p.edad} años` : '---';
    p_sexo.innerText = p.sexo ?? '---';
    p_sangre.innerText = p.tipo_sangre ?? '---';
    p_traslado.innerText = p.tipo_traslado ?? '---';
    p_ubicacion.innerText = amb.ubicacion ?? '---';
    p_diag.innerText = p.diagnostico ?? '---';

    pd.innerText = p.presion_diastolica ?? '--';
    ps.innerText = p.presion_sistolica ?? '--';
    fr.innerText = p.frecuencia_respiratoria ?? '--';
    c_spo2.innerText = p.spo2 ?? '--';
    c_temp.innerText = p.temperatura ?? '--';
    c_fc.innerText = p.frecuencia_cardiaca ?? '--';

    glasgowBadge.innerText = p.glasgow ?? '--';
    hemorragiaBadge.style.background = p.hemorragia ? 'red' : 'green';

    const hoy = new Date(); fechaHoy.innerText = hoy.toLocaleString();
  }catch(e){ console.error(e); resetAmbulancia1(); }
}

function resetAmbulancia1(){
  ['p_nombre','p_edad','p_sexo','p_sangre','p_traslado','p_ubicacion','p_diag'].forEach(id=>document.getElementById(id).innerText='---');
  ['pd','ps','fr','c_spo2','c_temp','c_fc'].forEach(id=>document.getElementById(id).innerText='--');
  glasgowBadge.innerText='--';
  hemorragiaBadge.style.background='red';
  ambulancia1Tag.classList.replace('green','red');
}

function escucharResetNuevoPaciente(){
  setInterval(async ()=>{
    const res = await fetch('https://ambulink.doc-ia.cloud/clinica/checkReset');
    const r = await res.json();
    if(r.reset){ resetAmbulancia1(); }
  }, 5000);
}

function salir(){ localStorage.clear(); location.href='index.html'; }
