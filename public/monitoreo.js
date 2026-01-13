document.addEventListener('DOMContentLoaded', async () => {

  let idSalida = localStorage.getItem('salida_activa');
  if (!idSalida) {
    alert('⚠️ No hay paciente activo.');
    window.location.href = 'ambulancia.html';
    return;
  }

  fechaActual.innerText = new Date().toLocaleDateString('es-ES',{
    day:'numeric',month:'long',year:'numeric'
  });

  let monitoreoActivo = false;
  const pintarMonitoreo = () => {
    if (monitoreoActivo) {
      btnIniciarMonitoreo.style.background = '#14b866';
      btnIniciarMonitoreo.innerText = '🟢 MONITOREO ACTIVO';
      btnPararMonitoreo.style.background = '#cccccc';
      btnPararMonitoreo.innerText = 'PARAR MONITOREO';
    } else {
      btnIniciarMonitoreo.style.background = '#009fe3';
      btnIniciarMonitoreo.innerText = 'MONITOREAR PACIENTE';
      btnPararMonitoreo.style.background = '#e10600';
      btnPararMonitoreo.innerText = '🔴 MONITOREO DETENIDO';
    }
  };
  pintarMonitoreo();

  const limpiarClinica = () => {
    ['pac_nombre','pac_edad','pac_sexo','pac_sangre','pac_traslado','pac_ubicacion','pac_diagnostico'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.innerText = id.includes('edad') ? '--' : '---';
    });
    ['v_pd','v_ps','v_fr','glasgow_total'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.innerText = '--';
    });
    ['in_pd','in_ps','in_fr','g_o','g_v','g_m'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.value = '';
    });
    ['par1','par2'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.innerText = '🚑 ---';
    });
    monitoreoActivo = false;
    pintarMonitoreo();
  };

  window.nuevoPaciente = function(){
    limpiarClinica();
    localStorage.removeItem('salida_activa');
    window.location.href = 'ambulancia.html';
  };

  // Observa cambios de ambulancia para actualizar sin recargar
  window.addEventListener('storage', (e)=>{
    if(e.key === 'clinica_update'){
      const paciente = JSON.parse(localStorage.getItem('paciente_activo')) || {};
      pac_nombre.innerText = paciente.nombre || '--';
      pac_edad.innerText = paciente.edad ? `${paciente.edad} años` : '--';
      pac_sexo.innerText = paciente.sexo || '--';
      pac_sangre.innerText = paciente.tipo_sangre || '--';
      pac_traslado.innerText = paciente.tipo_traslado || '--';
      pac_ubicacion.innerText = paciente.ubicacion || '--';
      pac_diagnostico.innerText = paciente.diagnostico || '--';
      glasgow_total.innerText = paciente.escala_glascow ?? '--';
      btnHemorragia.style.background = paciente.hemorragia ? '#14b866' : '#e10600';
    }
    if(e.key === 'ambulancia1_color'){
      // Puedes actualizar indicadores de "en camino" si los tienes
    }
  });

  // Carga inicial
  const r = await fetch(`https://ambulink.doc-ia.cloud/salidas/${idSalida}`);
  const data = await r.json();
  if(!data.paciente) return;

  const p = data.paciente;
  pac_nombre.innerText      = p.nombre || '--';
  pac_edad.innerText        = p.edad ? `${p.edad} años` : '--';
  pac_sexo.innerText        = p.sexo || '--';
  pac_sangre.innerText      = p.tipo_sangre || '--';
  pac_traslado.innerText    = p.tipo_traslado || '--';
  pac_ubicacion.innerText   = data.ubicacion || '--';
  pac_diagnostico.innerText = p.diagnostico || '--';

  v_pd.innerText = p.presion_diastolica ?? '--';
  v_ps.innerText = p.presion_sistolica ?? '--';
  v_fr.innerText = p.frecuencia_respiratoria ?? '--';
  glasgow_total.innerText = p.escala_glascow ?? '--';

  const pars = data.salida_paramedicos || [];
  const chofer = pars.find(x => x.rol_en_la_salida === 'chofer');
  const param  = pars.find(x => x.rol_en_la_salida === 'paramedico');
  par1.innerText = chofer ? `🚑 ${chofer.paramedicos.nombre} ${chofer.paramedicos.apellido}` : '🚑 ---';
  par2.innerText = param  ? `🚑 ${param.paramedicos.nombre} ${param.paramedicos.apellido}` : '🚑 ---';

  let estadoHemorragia = p.hemorragia === true;
  const pintarHemorragia = ()=> btnHemorragia.style.background = estadoHemorragia ? '#14b866' : '#e10600';
  pintarHemorragia();
  btnHemorragia.onclick = async ()=>{
    estadoHemorragia = !estadoHemorragia;
    pintarHemorragia();
    await fetch('https://ambulink.doc-ia.cloud/paciente/hemorragia',{
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ id_salida, hemorragia: estadoHemorragia })
    });
    // Avisar a clínica
    localStorage.setItem('clinica_update', Date.now());
  };

  btnIniciarMonitoreo.onclick = async ()=>{
    monitoreoActivo = true;
    pintarMonitoreo();
    await actualizarMonitoreo(true);
  };
  btnPararMonitoreo.onclick = async ()=>{
    monitoreoActivo = false;
    pintarMonitoreo();
    await actualizarMonitoreo(false);
  };

  setInterval(async ()=>{
    if(!monitoreoActivo || !idSalida) return;
    try{
      const r = await fetch(`https://ambulink.doc-ia.cloud/signos/ultimo/${idSalida}`);
      const s = await r.json();
      if(!s) return;
      if(s.spo2!==undefined) document.querySelector('.signo:nth-child(4) .valor').innerHTML = `${s.spo2}<span class="unidad">%</span>`;
      if(s.frecuencia_cardiaca!==undefined) document.querySelector('.signo:nth-child(6) .valor').innerHTML = `${s.frecuencia_cardiaca}<span class="unidad">lat/min</span>`;
      if(s.temperatura!==undefined) document.querySelector('.signo:nth-child(5) .valor').innerHTML = `${s.temperatura}<span class="unidad">°C</span>`;
    }catch(e){ console.error('Error tiempo real:', e); }
  },5000);
});

async function actualizarMonitoreo(valor){
  const idSalida = localStorage.getItem('salida_activa');
  if(!idSalida) return;
  await fetch('https://ambulink.doc-ia.cloud/salida/monitoreo',{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({ id_salida: idSalida, monitoreo_activo: valor })
  });
}
