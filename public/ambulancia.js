let enCamino = localStorage.getItem('ambulancia1_color') === 'green' || false;

/* =========================
   MAPEO INTELIGENTE (Coincide con tu HTML)
========================= */
const smartMaps = {
  "tipo_sangre": {
    "o positivo": "O+", "o +": "O+", "o negativo": "O-", "o -": "O-",
    "a positivo": "A+", "a +": "A+", "a negativo": "A-", "a -": "A-",
    "b positivo": "B+", "b +": "B+", "b negativo": "B-", "b -": "B-",
    "ab positivo": "AB+", "ab +": "AB+", "ab negativo": "AB-", "ab -": "AB-"
  },
  "sexo": {
    "masculino": "Masculino", "hombre": "Masculino", "varón": "Masculino",
    "femenino": "Femenino", "mujer": "Femenino"
  },
  "tipo_traslado": {
    "emergencia": "Emergencia", "urgencia": "Emergencia",
    "alta": "Alta", "traslado": "Traslado", "remisión": "Traslado"
  }
};

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
  } catch (e) { console.error('Error al cargar paramédicos:', e); }
}

/* =========================
   ESTADO EN CAMINO
========================= */
function toggleEnCamino(valor) {
  if (valor !== undefined) enCamino = valor;
  else enCamino = !enCamino;

  const estadoAmbulancia = document.getElementById('estadoAmbulancia');
  const btnEnCamino = document.getElementById('btnEnCamino');
  if (!estadoAmbulancia || !btnEnCamino) return;

  estadoAmbulancia.innerText = enCamino ? 'EN CAMINO' : 'DETENIDA';
  estadoAmbulancia.style.background = enCamino ? '#1bb14c' : '#e10600';
  btnEnCamino.className = enCamino ? 'btn-green' : 'btn-stop';
  localStorage.setItem('ambulancia1_color', enCamino ? 'green' : 'red');
}

/* =========================
   SISTEMA DE VOZ (RE-EDITABLE Y SOPORTE SELECT)
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
  if (!SpeechRecognition) return alert("Usa Chrome para el dictado por voz.");

  recognition = new SpeechRecognition();
  recognition.lang = 'es-ES';
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onstart = () => {
    isListeningVoice = true;
    document.getElementById('btnVoz').classList.add('listening');
    document.getElementById('status-voz').innerText = "ESCUCHANDO... DIGA UN CAMPO";
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

    for (let key in keywords) {
      if (transcript.startsWith(key)) {
        if (targetField) document.getElementById(targetField).classList.remove('active-field');
        targetField = keywords[key];
        const el = document.getElementById(targetField);
        el.classList.remove('confirmed-field');
        el.classList.add('active-field');
        document.getElementById('status-voz').innerText = `DICTANDO EN: ${key.toUpperCase()}`;
      }
    }

    if (targetField) {
      let campo = document.getElementById(targetField);
      let cleanRegex = new RegExp("(nombre|edad|ubicación|informe|sangre|sexo|carnet|traslado)", "gi");
      let currentText = transcript.replace(cleanRegex, "").trim();

      if (transcript.includes("confirmado") || transcript.includes("confirmar")) {
        let finalValue = currentText.replace(/confirmado|confirmar/gi, "").trim();
        
        if (smartMaps[targetField]) {
          for (let keyMap in smartMaps[targetField]) {
            if (finalValue.includes(keyMap)) {
              finalValue = smartMaps[targetField][keyMap];
              break;
            }
          }
        }

        if (campo.tagName === "SELECT") {
          campo.value = finalValue; 
          campo.dispatchEvent(new Event('change'));
          campo.blur(); 
        } else {
          if (finalValue !== "") {
            if (targetField === "edad") campo.value = finalValue.replace(/\D/g, "");
            else campo.value = finalValue.charAt(0).toUpperCase() + finalValue.slice(1);
          }
        }
        
        campo.classList.remove('active-field');
        campo.classList.add('confirmed-field');
        targetField = null; 
        document.getElementById('status-voz').innerText = "CONFIRMADO. DIGA EL SIGUIENTE...";
        recognition.stop(); 
      } else {
        if (currentText !== "" && campo.tagName !== "SELECT") {
          campo.value = currentText;
        }
      }
    }
  };

  recognition.onend = () => {
    if (isListeningVoice) recognition.start(); 
    else {
      document.getElementById('btnVoz').classList.remove('listening');
      document.getElementById('status-voz').innerText = "SISTEMA DE VOZ: STANDBY";
    }
  };

  recognition.start();
}

/* =========================
   GUARDAR (CON AUTOCOMPLETADO N/N)
========================= */
async function guardar() {
  // Capturamos valores
  let nombre = document.getElementById('nombre').value.trim();
  let carnet = document.getElementById('carnet').value.trim();
  let edadVal = document.getElementById('edad').value.trim();
  let sexo = document.getElementById('sexo').value;
  let sangre = document.getElementById('tipo_sangre').value;
  let traslado = document.getElementById('tipo_traslado').value;
  let diagnostico = document.getElementById('diagnostico').value.trim();
  let ubicacion = document.getElementById('ubicacion').value.trim();

  // Aplicamos N/N y 0 si están vacíos
  if (nombre === "") nombre = "N/N";
  if (carnet === "") carnet = "0";
  let edad = (edadVal === "" || isNaN(edadVal)) ? 0 : Number(edadVal);
  if (sexo === "") sexo = "N/N";
  if (sangre === "") sangre = "N/N";
  if (traslado === "") traslado = "Traslado";
  if (diagnostico === "") diagnostico = "N/N";
  if (ubicacion === "") ubicacion = "Sin dirección";

  const payload = {
    ubicacion: ubicacion,
    en_camino: enCamino,
    personal: {
      chofer: document.getElementById('chofer').value,
      paramedico: document.getElementById('paramedico').value
    },
    paciente: {
      nombre: nombre,
      carnet: carnet,
      edad: edad,
      sexo: sexo,
      tipo_sangre: sangre,
      tipo_traslado: traslado,
      diagnostico: diagnostico
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
      alert('✅ Registro guardado con éxito.');
      window.location.href = 'monitoreo.html';
    }
  } catch (e) { 
    console.error(e);
    alert('❌ Error al conectar con el servidor');
  }
}

function irMonitoreo() { 
  if (!localStorage.getItem('salida_activa')) return alert('⚠️ Registra al paciente primero');
  location.href = 'monitoreo.html'; 
}

function logout() { 
  localStorage.clear(); 
  location.href = 'login.html'; 
}

function limpiarAlEntrar() {
  ['nombre','carnet','edad','sexo','tipo_sangre','tipo_traslado','diagnostico','ubicacion'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('active-field', 'confirmed-field'); }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  limpiarAlEntrar(); 
  cargarParamedicos(); 
  toggleEnCamino(enCamino);
});