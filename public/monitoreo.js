/* ========================= SISTEMA DE VOZ GLOBAL ========================= */
let recognition;
let isListeningVoice = true; 
let targetField = null;

document.addEventListener('DOMContentLoaded', async () => {
  const idSalida = localStorage.getItem('salida_activa');
  if (!idSalida) {
    alert('⚠️ No hay paciente activo.');
    window.location.href = 'ambulancia.html';
    return;
  }

  iniciarVozMonitoreo();

  /* ========================= FECHA ========================= */
  fechaActual.innerText = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  /* ========================= ESTADO MONITOREO ========================= */
  let monitoreoActivo = false;
  const pintarMonitoreo = () => {
    if (monitoreoActivo) {
      btnIniciarMonitoreo.style.background = '#14b866';
      btnIniciarMonitoreo.innerText = '🟢 MONITOREO ACTIVO';
      btnPararMonitoreo.style.background = '#cccccc';
    } else {
      btnIniciarMonitoreo.style.background = '#009fe3';
      btnIniciarMonitoreo.innerText = 'MONITOREAR PACIENTE';
      btnPararMonitoreo.style.background = '#e10600';
    }
  };
  pintarMonitoreo();

  try {
    const res = await fetch(`https://ambulink.doc-ia.cloud/salidas/${idSalida}`);
    const data = await res.json();
    if (!data.paciente) return;
    const p = data.paciente;

    pac_nombre.innerText = p.nombre || '--';
    pac_edad.innerText = p.edad ? `${p.edad} años` : '--';
    pac_sexo.innerText = p.sexo || '--';
    pac_sangre.innerText = p.tipo_sangre || '--';
    pac_traslado.innerText = p.tipo_traslado || '--';
    pac_ubicacion.innerText = data.ubicacion || '--';
    pac_diagnostico.innerText = p.diagnostico || '--';

    v_pd.innerText = p.presion_diastolica ?? '--';
    v_ps.innerText = p.presion_sistolica ?? '--';
    v_fr.innerText = p.frecuencia_respiratoria ?? '--';
    glasgow_total.innerText = p.escala_glasgow ?? '--';

    const pars = data.salida_paramedicos || [];
    const chofer = pars.find(x => x.rol_en_la_salida === 'chofer');
    const param = pars.find(x => x.rol_en_la_salida === 'paramedico');
    par1.innerText = chofer ? `🚑 ${chofer.paramedicos.nombre} ${chofer.paramedicos.apellido}` : '🚑 ---';
    par2.innerText = param ? `🚑 ${param.paramedicos.nombre} ${param.paramedicos.apellido}` : '🚑 ---';

    let estadoHemorragia = p.hemorragia === true;
    const pintarHemorragia = () => { btnHemorragia.style.background = estadoHemorragia ? '#14b866' : '#e10600'; };
    pintarHemorragia();

    btnHemorragia.onclick = async () => {
      estadoHemorragia = !estadoHemorragia;
      pintarHemorragia();
      await fetch('https://ambulink.doc-ia.cloud/paciente/hemorragia', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_salida: idSalida, hemorragia: estadoHemorragia })
      });
    };

    btnIniciarMonitoreo.onclick = async () => { monitoreoActivo = true; pintarMonitoreo(); await actualizarMonitoreo(true); };
    btnPararMonitoreo.onclick = async () => { monitoreoActivo = false; pintarMonitoreo(); await actualizarMonitoreo(false); };

    setInterval(async () => {
      if (!monitoreoActivo) return;
      try {
        const r = await fetch(`https://ambulink.doc-ia.cloud/signos/ultimo/${idSalida}`);
        const s = await r.json();
        if (!s) return;
        if (s.spo2 !== undefined) v_spo2.innerHTML = s.spo2;
        if (s.frecuencia_cardiaca !== undefined) v_fc.innerHTML = s.frecuencia_cardiaca;
        if (s.temperatura !== undefined) v_temp.innerHTML = s.temperatura;
      } catch (e) { console.error('Error tiempo real:', e); }
    }, 5001);

  } catch (err) { console.error(err); alert('❌ Error de conexión'); }
});

/* ========================= LÓGICA DE VOZ CON RESALTADO AMARILLO ========================= */
function iniciarVozMonitoreo() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return;

  recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript.toLowerCase();
    }
    
    const keywords = {
      "diastólica": "in_pd", "sistólica": "in_ps", "respiración": "in_fr",
      "ocular": "g_o", "verbal": "g_v", "motora": "g_m"
    };

    // Detectar palabra clave y pintar de amarillo
    for (let key in keywords) {
      if (transcript.includes(key)) { 
        // Quitar amarillo del anterior si existe
        if (targetField) document.getElementById(targetField).classList.remove('campo-activo');
        
        targetField = keywords[key];
        document.getElementById(targetField).classList.add('campo-activo');
      }
    }

    if (targetField) {
      let campo = document.getElementById(targetField);
      let numeros = transcript.match(/\d+/g);
      let valorNumerico = numeros ? numeros[numeros.length - 1] : "";

      if (valorNumerico !== "") campo.value = valorNumerico;

      // Al decir confirmar, se quita el amarillo y se envía
      if (transcript.includes("confirmar") || transcript.includes("confirmado")) {
        campo.classList.remove('campo-activo');

        if (targetField.startsWith("in_")) {
          guardarSignos(); 
        } else if (targetField.startsWith("g_")) {
          if (g_o.value && g_v.value && g_m.value) {
            guardarGlasgow();
          }
        }
        targetField = null;
        recognition.stop(); 
      }
    }
  };

  recognition.onend = () => { if (isListeningVoice) recognition.start(); };
  recognition.start();
}

/* ========================= FUNCIONES DE ENVÍO ========================= */
async function actualizarMonitoreo(valor) {
  const idSalida = localStorage.getItem('salida_activa');
  await fetch('https://ambulink.doc-ia.cloud/salida/monitoreo', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_salida: idSalida, monitoreo_activo: valor })
  });
}

async function guardarSignos() {
  const idSalida = localStorage.getItem('salida_activa');
  const pd = document.getElementById('in_pd').value;
  const ps = document.getElementById('in_ps').value;
  const fr = document.getElementById('in_fr').value;

  await fetch('https://ambulink.doc-ia.cloud/paciente/signos', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_salida: idSalida, presion_diastolica: pd, presion_sistolica: ps, frecuencia_respiratoria: fr })
  });

  if(pd) v_pd.innerText = pd;
  if(ps) v_ps.innerText = ps;
  if(fr) v_fr.innerText = fr;
}

async function guardarGlasgow() {
  const idSalida = localStorage.getItem('salida_activa');
  if (!g_o.value || !g_v.value || !g_m.value) return;

  const total = Number(g_o.value) + Number(g_v.value) + Number(g_m.value);
  await fetch('https://ambulink.doc-ia.cloud/paciente/glasgow', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_salida: idSalida, escala_glasgow: total })
  });

  glasgow_total.innerText = total;
  g_o.value = ''; g_v.value = ''; g_m.value = '';
}

function nuevoPaciente() {
  localStorage.setItem('reset_clinica_ambulancia1', 'true');
  localStorage.setItem('ambulancia1_color', 'red');
  localStorage.removeItem('salida_activa');
  location.href = 'ambulancia.html';
}