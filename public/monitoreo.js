// }/* ========================= SISTEMA DE VOZ GLOBAL ========================= */
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

  /* ========================= ELEMENTOS DE INTERFAZ ========================= */
  const fechaActual = document.getElementById('fechaActual');
  const glasgow_total = document.getElementById('glasgow_total');
  const btnIniciarMonitoreo = document.getElementById('btnIniciarMonitoreo');
  const btnPararMonitoreo = document.getElementById('btnPararMonitoreo');
  const btnHemorragia = document.getElementById('btnHemorragia');

  /* ========================= FECHA ========================= */
  if (fechaActual) {
    fechaActual.innerText = new Date().toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
  }

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

    // Llenar datos del paciente
    document.getElementById('pac_nombre').innerText = p.nombre || '--';
    document.getElementById('pac_edad').innerText = p.edad ? `${p.edad} años` : '--';
    document.getElementById('pac_sexo').innerText = p.sexo || '--';
    document.getElementById('pac_sangre').innerText = p.tipo_sangre || '--';
    document.getElementById('pac_traslado').innerText = p.tipo_traslado || '--';
    document.getElementById('pac_ubicacion').innerText = data.ubicacion || '--';
    document.getElementById('pac_diagnostico').innerText = p.diagnostico || '--';

    // Signos iniciales
    document.getElementById('v_pd').innerText = p.presion_diastolica ?? '--';
    document.getElementById('v_ps').innerText = p.presion_sistolica ?? '--';
    document.getElementById('v_fr').innerText = p.frecuencia_respiratoria ?? '--';
    glasgow_total.innerText = p.escala_glasgow ?? '--';

    // Paratrabajadores
    const pars = data.salida_paramedicos || [];
    const chofer = pars.find(x => x.rol_en_la_salida === 'chofer');
    const param = pars.find(x => x.rol_en_la_salida === 'paramedico');
    document.getElementById('par1').innerText = chofer ? `🚑 ${chofer.paramedicos.nombre} ${chofer.paramedicos.apellido}` : '🚑 ---';
    document.getElementById('par2').innerText = param ? `🚑 ${param.paramedicos.nombre} ${param.paramedicos.apellido}` : '🚑 ---';

    // Hemorragia
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

    // Tiempo Real (ESP32)
    setInterval(async () => {
      if (!monitoreoActivo) return;
      try {
        const r = await fetch(`https://ambulink.doc-ia.cloud/signos/ultimo/${idSalida}`);
        const s = await r.json();
        if (!s) return;
        if (s.spo2 !== undefined) document.getElementById('v_spo2').innerHTML = s.spo2;
        if (s.frecuencia_cardiaca !== undefined) document.getElementById('v_fc').innerHTML = s.frecuencia_cardiaca;
        if (s.temperatura !== undefined) document.getElementById('v_temp').innerHTML = s.temperatura;
      } catch (e) { console.error('Error tiempo real:', e); }
    }, 5001);

  } catch (err) { console.error(err); alert('❌ Error de conexión'); }
});

/* ========================= LÓGICA DE VOZ ========================= */
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
      "diastólica": "in_pd", "sistólica": "in_ps", "respiratoria": "in_fr",
      "respiración": "in_fr", "frecuencia": "in_fr",
      "ocular": "g_o", "verbal": "g_v", "motora": "g_m"
    };

    for (let key in keywords) {
      if (transcript.includes(key)) { 
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

      if (transcript.includes("confirmar") || transcript.includes("confirmado")) {
        campo.classList.remove('campo-activo');
        if (targetField.startsWith("in_")) {
          guardarSignos(); 
        } else if (targetField.startsWith("g_")) {
          if (document.getElementById('g_o').value !== "" && 
              document.getElementById('g_v').value !== "" && 
              document.getElementById('g_m').value !== "") {
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
    body: JSON.stringify({ 
      id_salida: idSalida, 
      presion_diastolica: pd || null, 
      presion_sistolica: ps || null, 
      frecuencia_respiratoria: fr || null 
    })
  });

  if(pd) document.getElementById('v_pd').innerText = pd;
  if(ps) document.getElementById('v_ps').innerText = ps;
  if(fr) document.getElementById('v_fr').innerText = fr;
}

async function guardarGlasgow() {
  const idSalida = localStorage.getItem('salida_activa');
  const go = document.getElementById('g_o').value;
  const gv = document.getElementById('g_v').value;
  const gm = document.getElementById('g_m').value;

  const total = Number(go) + Number(gv) + Number(gm);
  await fetch('https://ambulink.doc-ia.cloud/paciente/glasgow', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_salida: idSalida, escala_glasgow: total })
  });

  document.getElementById('glasgow_total').innerText = total;
  document.getElementById('g_o').value = ''; 
  document.getElementById('g_v').value = ''; 
  document.getElementById('g_m').value = '';
}

function nuevoPaciente() {
  localStorage.setItem('reset_clinica_ambulancia1', 'true');
  localStorage.setItem('ambulancia1_color', 'red');
  localStorage.removeItem('salida_activa');
  location.href = 'ambulancia.html';
}