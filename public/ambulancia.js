let enCamino = localStorage.getItem('ambulancia1_color') === 'green' || false;

/* =========================
   CARGAR PARAMÉDICOS
========================= */
async function cargarParamedicos() {
  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/paramedicos');
    const data = await res.json();

    const choferSelect = document.getElementById('chofer');
    const paramedicoSelect = document.getElementById('paramedico');

    if (!choferSelect || !paramedicoSelect) return;

    choferSelect.innerHTML = '<option value="">Seleccionar</option>';
    paramedicoSelect.innerHTML = '<option value="">Seleccionar</option>';

    data.forEach(p => {
      const nombreCompleto = `${p.nombre} ${p.apellido}`;
      choferSelect.innerHTML += `<option value="${p.id_paramedico}">${nombreCompleto}</option>`;
      paramedicoSelect.innerHTML += `<option value="${p.id_paramedico}">${nombreCompleto}</option>`;
    });
  } catch (e) {
    console.error('Error al cargar paramédicos:', e);
  }
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

  const estadoAmbulancia = document.getElementById('estadoAmbulancia');
  const btnEnCamino = document.getElementById('btnEnCamino');

  if (!estadoAmbulancia || !btnEnCamino) return;

  estadoAmbulancia.innerText = enCamino ? 'EN CAMINO' : 'DETENIDA';
  estadoAmbulancia.style.background = enCamino ? '#1bb14c' : '#e10600';
  btnEnCamino.className = enCamino ? 'btn-green' : 'btn-stop';

  localStorage.setItem('ambulancia1_color', enCamino ? 'green' : 'red');
}

/* =========================
   GUARDAR PACIENTE
========================= */
async function guardar() {
  const payload = {
    ubicacion: document.getElementById('ubicacion').value,
    en_camino: enCamino,
    personal: {
      chofer: document.getElementById('chofer').value,
      paramedico: document.getElementById('paramedico').value
    },
    paciente: {
      nombre: document.getElementById('nombre').value,
      carnet: document.getElementById('carnet').value,
      edad: Number(document.getElementById('edad').value),
      sexo: document.getElementById('sexo').value,
      tipo_sangre: document.getElementById('tipo_sangre').value,
      tipo_traslado: document.getElementById('tipo_traslado').value,
      diagnostico: document.getElementById('diagnostico').value
    }
  };

  // Validación simple
  for (const key in payload.paciente) {
    if (!payload.paciente[key] && key !== 'edad') {
      alert('⚠️ Completa todos los campos del paciente');
      return;
    }
  }

  if (!payload.ubicacion || !payload.personal.chofer || !payload.personal.paramedico) {
    alert('⚠️ Completa ubicación y tripulación');
    return;
  }

  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/ambulancia/salida', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

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
  } catch (e) {
    console.error('Error al guardar paciente:', e);
    alert('❌ Error de conexión al guardar');
  }
}

/* =========================
   SISTEMA DE VOZ INTEGRADO
========================= */
let recognition;
let isListeningVoice = false;
let targetField = null;

function toggleVoz() {
  if (isListeningVoice) {
    isListeningVoice = false;
    recognition.stop();
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Tu navegador no soporta reconocimiento de voz. Usa Chrome.");
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListeningVoice = true;
    document.getElementById('btnVoz').classList.add('listening');
    document.getElementById('status-voz').innerText = "ESCUCHANDO COMANDOS...";
  };

  recognition.onresult = (event) => {
    let result = event.results[event.results.length - 1];
    let transcript = result[0].transcript.toLowerCase().trim();
    
    // Diccionario de comandos
    const keywords = {
      "nombre": "nombre",
      "edad": "edad",
      "ubicación": "ubicacion",
      "informe": "diagnostico",
      "sangre": "tipo_sangre",
      "sexo": "sexo",
      "carnet": "carnet"
    };

    // 1. Detectar si el usuario quiere activar un campo
    if (!targetField) {
      for (let key in keywords) {
        if (transcript.startsWith(key)) {
          targetField = keywords[key];
          // Limpiar clases previas y activar visualmente
          const el = document.getElementById(targetField);
          el.classList.remove('confirmed-field');
          el.classList.add('active-field');
          document.getElementById('status-voz').innerText = `DICTANDO: ${key.toUpperCase()}...`;
          return;
        }
      }
    }

    // 2. Si hay un campo activo, escribir o confirmar
    if (targetField) {
      let campo = document.getElementById(targetField);
      
      if (transcript.includes("confirmar") || transcript.includes("confirmado")) {
        // Limpiar la palabra de comando del texto final
        let regex = new RegExp("(nombre|edad|ubicación|informe|sangre|sexo|carnet|confirmado|confirmar)", "gi");
        let cleanText = transcript.replace(regex, "").trim();
        
        if (cleanText !== "") {
          campo.value = cleanText.charAt(0).toUpperCase() + cleanText.slice(1);
          campo.classList.remove('active-field');
          campo.classList.add('confirmed-field');
        }
        
        targetField = null; // Liberar campo
        document.getElementById('status-voz').innerText = "COMANDO CONFIRMADO. ESPERANDO SIGUIENTE...";
      } else {
        // Mostrar texto temporal mientras habla
        let regexPre = new RegExp("(nombre|edad|ubicación|informe|sangre|sexo|carnet)", "gi");
        let preview = transcript.replace(regexPre, "").trim();
        if (preview !== "") {
          campo.value = preview;
        }
      }
    }
  };

  recognition.onend = () => {
    if (isListeningVoice) {
      recognition.start(); // Reiniciar para que sea persistente
    } else {
      document.getElementById('btnVoz').classList.remove('listening');
      document.getElementById('status-voz').innerText = "SISTEMA DE VOZ: STANDBY";
      // Limpiar resaltados si se apaga
      if (targetField) document.getElementById(targetField).classList.remove('active-field');
      targetField = null;
    }
  };

  recognition.onerror = (event) => {
    console.error("Error de voz:", event.error);
    if (event.error === 'not-allowed') alert("Debes permitir el uso del micrófono.");
  };

  recognition.start();
}

/* =========================
   FUNCIONES DE NAVEGACIÓN
========================= */
function irMonitoreo() {
  if (!localStorage.getItem('salida_activa')) {
    alert('⚠️ Primero debes registrar un paciente');
    return;
  }
  window.location.href = 'monitoreo.html';
}

function logout() {
  localStorage.removeItem('salida_activa');
  localStorage.removeItem('paciente_activo');
  localStorage.removeItem('ubicacion_activa');
  localStorage.removeItem('ambulancia1_color');
  location.href = 'login.html';
}

function limpiarClinica() {
  const campos = [
    'nombre', 'carnet', 'edad', 'sexo', 
    'tipo_sangre', 'tipo_traslado', 
    'diagnostico', 'ubicacion'
  ];
  campos.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.value = '';
      el.classList.remove('active-field', 'confirmed-field');
    }
  });
}

/* =========================
   INICIO
========================= */
document.addEventListener('DOMContentLoaded', () => {
  limpiarClinica();   
  cargarParamedicos(); 
  toggleEnCamino(enCamino);
});