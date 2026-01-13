document.addEventListener('DOMContentLoaded', async () => {

  const idSalida = localStorage.getItem('salida_activa');

  if (!idSalida) {
    alert('⚠️ No hay paciente activo.');
    window.location.href = 'ambulancia.html';
    return;
  }

  /* ========================= FECHA ========================= */
  fechaActual.innerText = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  /* ========================= ESTADO MONITOREO (LOCAL) ========================= */
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

  /* ========================= CARGA DATOS ========================= */
  try {
    const res = await fetch(`https://ambulink.doc-ia.cloud/salidas/${idSalida}`);
    const data = await res.json();

    if (!data.paciente) return;

    const p = data.paciente;

    /* ========================= PACIENTE ========================= */
    pac_nombre.innerText = p.nombre || '--';
    pac_edad.innerText = p.edad ? `${p.edad} años` : '--';
    pac_sexo.innerText = p.sexo || '--';
    pac_sangre.innerText = p.tipo_sangre || '--';
    pac_traslado.innerText = p.tipo_traslado || '--';
    pac_ubicacion.innerText = data.ubicacion || '--';
    pac_diagnostico.innerText = p.diagnostico || '--';

    /* ========================= SIGNOS (INICIAL) ========================= */
    v_pd.innerText = p.presion_diastolica ?? '--';
    v_ps.innerText = p.presion_sistolica ?? '--';
    v_fr.innerText = p.frecuencia_respiratoria ?? '--';
    glasgow_total.innerText = p.escala_glasgow ?? '--';

    /* ========================= PARAMÉDICOS ========================= */
    const pars = data.salida_paramedicos || [];
    const chofer = pars.find(x => x.rol_en_la_salida === 'chofer');
    const param = pars.find(x => x.rol_en_la_salida === 'paramedico');

    par1.innerText = chofer
      ? `🚑 ${chofer.paramedicos.nombre} ${chofer.paramedicos.apellido}`
      : '🚑 ---';

    par2.innerText = param
      ? `🚑 ${param.paramedicos.nombre} ${param.paramedicos.apellido}`
      : '🚑 ---';

    /* ========================= HEMORRAGIA ========================= */
    let estadoHemorragia = p.hemorragia === true;

    const pintarHemorragia = () => {
      btnHemorragia.style.background = estadoHemorragia ? '#14b866' : '#e10600';
    };

    pintarHemorragia();

    btnHemorragia.onclick = async () => {
      estadoHemorragia = !estadoHemorragia;
      pintarHemorragia();

      await fetch('https://ambulink.doc-ia.cloud/paciente/hemorragia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_salida: idSalida,
          hemorragia: estadoHemorragia
        })
      });
    };

    /* ========================= BOTONES MONITOREO ========================= */
    btnIniciarMonitoreo.onclick = async () => {
      monitoreoActivo = true;
      pintarMonitoreo();
      await actualizarMonitoreo(true);
    };

    btnPararMonitoreo.onclick = async () => {
      monitoreoActivo = false;
      pintarMonitoreo();
      await actualizarMonitoreo(false);
    };

    /* ========================= TIEMPO REAL (ESP32) ========================= */
    setInterval(async () => {
      if (!monitoreoActivo) return;

      try {
        const r = await fetch(`https://ambulink.doc-ia.cloud/signos/ultimo/${idSalida}`);
        const s = await r.json();
        if (!s) return;

        if (s.spo2 !== undefined) {
          document.querySelector('.signo:nth-child(4) .valor').innerHTML =
            `${s.spo2}<span class="unidad">%</span>`;
        }

        if (s.temperatura !== undefined) {
          document.querySelector('.signo:nth-child(5) .valor').innerHTML =
            `${s.temperatura}<span class="unidad">°C</span>`;
        }

        if (s.frecuencia_cardiaca !== undefined) {
          document.querySelector('.signo:nth-child(6) .valor').innerHTML =
            `${s.frecuencia_cardiaca}<span class="unidad">lat/min</span>`;
        }

      } catch (e) {
        console.error('Error tiempo real:', e);
      }
    }, 5000);

  } catch (err) {
    console.error(err);
    alert('❌ Error de conexión');
  }
});

/* ========================= MONITOREO ACTIVO (BACKEND) ========================= */
async function actualizarMonitoreo(valor) {
  const idSalida = localStorage.getItem('salida_activa');

  await fetch('https://ambulink.doc-ia.cloud/salida/monitoreo', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_salida: idSalida,
      monitoreo_activo: valor
    })
  });
}

/* ========================= GUARDAR SIGNOS MANUALES ========================= */
async function guardarSignos() {
  const idSalida = localStorage.getItem('salida_activa');

  const pd = in_pd.value;
  const ps = in_ps.value;
  const fr = in_fr.value;

  await fetch('https://ambulink.doc-ia.cloud/paciente/signos', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_salida: idSalida,
      presion_diastolica: pd,
      presion_sistolica: ps,
      frecuencia_respiratoria: fr
    })
  });

  v_pd.innerText = pd || '--';
  v_ps.innerText = ps || '--';
  v_fr.innerText = fr || '--';

  in_pd.value = '';
  in_ps.value = '';
  in_fr.value = '';
}

/* ========================= GUARDAR GLASGOW ========================= */
async function guardarGlasgow() {
  const idSalida = localStorage.getItem('salida_activa');

  if (!g_o.value || !g_v.value || !g_m.value) {
    alert('⚠️ Selecciona los 3 valores de Glasgow');
    return;
  }

  const total = Number(g_o.value) + Number(g_v.value) + Number(g_m.value);

  await fetch('https://ambulink.doc-ia.cloud/paciente/glasgow', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id_salida: idSalida,
      escala_glasgow: total
    })
  });

  glasgow_total.innerText = total;
  g_o.value = '';
  g_v.value = '';
  g_m.value = '';
}

/* ========================= NUEVO PACIENTE ========================= */
function nuevoPaciente() {
  localStorage.setItem('reset_clinica_ambulancia1', 'true');
  localStorage.setItem('ambulancia1_color', 'red');
  localStorage.removeItem('salida_activa');
  window.location.href = 'ambulancia.html';
}
