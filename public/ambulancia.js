let enCamino = localStorage.getItem('ambulancia1_color') === 'green' || false;

/* =========================
   MAPEO INTELIGENTE (Corregido para tu HTML)
========================= */
const smartMaps = {
  "tipo_sangre": {
    "o positivo": "O+", "o negativo": "O-", "a positivo": "A+", "a negativo": "A-",
    "b positivo": "B+", "b negativo": "B-", "ab positivo": "AB+", "ab negativo": "AB-"
  },
  "sexo": {
    "masculino": "Masculino", "hombre": "Masculino", "varón": "Masculino",
    "femenino": "Femenino", "mujer": "Femenino"
  },
  "tipo_traslado": {
    "emergencia": "Emergencia", "urgencia": "Emergencia",
    "alta": "Alta", "traslado": "Traslado"
  }
};

/* =========================
   CARGAR PARAMÉDICOS
========================= */
async function cargarParamedicos() {
  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/paramedicos');
    const data = await res.json();
    const chofer = document.getElementById('chofer');
    const paramedico = document.getElementById('paramedico');
    if (!chofer || !paramedico) return;

    chofer.innerHTML = '<option value="">Seleccionar</option>';
    paramedico.innerHTML = '<option value="">Seleccionar</option>';

    data.forEach(p => {
      const nombre = `${p.nombre} ${p.apellido}`;
      chofer.innerHTML += `<option value="${p.id_paramedico}">${nombre}</option>`;
      paramedico.innerHTML += `<option value="${p.id_paramedico}">${nombre}</option>`;
    });
  } catch (e) { console.error('Error cargando paramédicos:', e); }
}

/* =========================
   SISTEMA DE VOZ
========================= */
let recognition;
let isListeningVoice = false;
let targetField = null;

function toggleVoz() {
  if (isListeningVoice) { isListeningVoice = false; recognition.stop(); return; }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return alert("Usa Chrome.");

  recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListeningVoice = true;
    document.getElementById('btnVoz').classList.add('listening');
    document.getElementById('status-voz').innerText = "ESCUCHANDO COMANDO...";
  };

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript.toLowerCase();
    }
    transcript = transcript.trim();

    const keywords = {
      "nombre": "nombre", "edad": "edad", "ubicación": "ubicacion",
      "informe": "diagnostico", "sangre": "tipo_sangre", "sexo": "sexo", 
      "carnet": "carnet", "traslado": "tipo_traslado"
    };

    // Detectar cambio de campo
    for (let key in keywords) {
      if (transcript.startsWith(key)) {
        if (targetField) document.getElementById(targetField).classList.remove('active-field');
        targetField = keywords[key];
        document.getElementById(targetField).classList.add('active-field');
        document.getElementById('status-voz').innerText = `EDITANDO: ${key.toUpperCase()}`;
      }
    }

    if (targetField) {
      let campo = document.getElementById(targetField);
      let cleanRegex = new RegExp("(nombre|edad|ubicación|informe|sangre|sexo|carnet|traslado)", "gi");
      let currentText = transcript.replace(cleanRegex, "").trim();

      if (transcript.includes("confirmado") || transcript.includes("confirmar")) {
        let finalValue = currentText.replace(/confirmado|confirmar/gi, "").trim();
        
        // Aplicar Mapeo
        if (smartMaps[targetField]) {
          for (let keyMap in smartMaps[targetField]) {
            if (finalValue.includes(keyMap)) { finalValue = smartMaps[targetField][keyMap]; break; }
          }
        }

        // --- LÓGICA PARA SELECTS (TU CASO) ---
        if (campo.tagName === "SELECT") {
          let found = false;
          for (let i = 0; i < campo.options.length; i++) {
            // Comparamos contra el TEXTO (ej: "O+") o el VALOR (ej: "O+")
            if (campo.options[i].text === finalValue || campo.options[i].value === finalValue) {
              campo.selectedIndex = i;
              found = true;
              break;
            }
          }
          if (!found) console.log("No se encontró la opción para: " + finalValue);
        } else {
          // Lógica para Inputs
          if (finalValue !== "") {
            if (targetField === "edad") campo.value = finalValue.replace(/\D/g, "");
            else campo.value = finalValue.charAt(0).toUpperCase() + finalValue.slice(1);
          }
        }
        
        campo.classList.remove('active-field');
        campo.classList.add('confirmed-field');
        targetField = null; 
        document.getElementById('status-voz').innerText = "CONFIRMADO.";
        recognition.stop(); 
      } else {
        if (currentText !== "" && campo.tagName !== "SELECT") campo.value = currentText;
      }
    }
  };

  recognition.onend = () => { if (isListeningVoice) recognition.start(); else {
    document.getElementById('btnVoz').classList.remove('listening');
    document.getElementById('status-voz').innerText = "SISTEMA DE VOZ: STANDBY";
  }};
  recognition.start();
}

/* =========================
   BOTONES Y GUARDADO
========================= */
function toggleEnCamino() {
  enCamino = !enCamino;
  const estado = document.getElementById('estadoAmbulancia');
  const btn = document.getElementById('btnEnCamino');
  estado.innerText = enCamino ? 'EN CAMINO' : 'DETENIDA';
  estado.style.background = enCamino ? '#1bb14c' : '#e10600';
  btn.className = enCamino ? 'btn-green' : 'btn-stop';
  localStorage.setItem('ambulancia1_color', enCamino ? 'green' : 'red');
}

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

  try {
    const res = await fetch('https://ambulink.doc-ia.cloud/ambulancia/salida', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const r = await res.json();
    if (r.ok) {
      localStorage.setItem('salida_activa', r.id_salida);
      alert('✅ Guardado correctamente');
      window.location.href = 'monitoreo.html';
    }
  } catch (e) { alert('Error al guardar'); }
}

function logout() { localStorage.clear(); location.href = 'login.html'; }
function irMonitoreo() { location.href = 'monitoreo.html'; }