document.addEventListener('DOMContentLoaded', () => {

  const btnGuardar = document.getElementById('btnGuardar');
  btnGuardar.addEventListener('click', guardarSalida);

});

/* =========================
   GUARDAR SALIDA
========================= */
async function guardarSalida() {

  const glasgow =
    Number(glasgow_o.value || 0) +
    Number(glasgow_v.value || 0) +
    Number(glasgow_m.value || 0);

  const payload = {
    ubicacion: ubicacion.value,
    personal: {
      chofer: chofer.value,
      paramedico: paramedico.value
    },
    paciente: {
      nombre: nombre.value,
      edad: Number(edad.value),
      sexo: sexo.value,
      tipo_sangre: tipo_sangre.value,
      tipo_traslado: tipo_traslado.value,
      escala_glasgow: glasgow,
      diagnostico: diagnostico.value
    }
  };

  // VALIDACIÓN
  for (const k in payload) {
    if (typeof payload[k] === 'object') {
      for (const j in payload[k]) {
        if (!payload[k][j]) {
          alert('⚠️ Completa todos los campos');
          return;
        }
      }
    }
  }

  try {
    const res = await fetch('http://localhost:3000/ambulancia/salida', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const r = await res.json();

    if (!r.ok) {
      alert('❌ Error al guardar');
      return;
    }

    // 🔥 CLAVE ABSOLUTA
    localStorage.setItem('salida_activa', r.id_salida);

    alert('✅ Paciente registrado correctamente');

    // ✅ REDIRECCIÓN CORRECTA (SIN iframe)
    window.location.href = 'monitoreo.html';

  } catch (e) {
    console.error(e);
    alert('❌ Error de conexión con el servidor');
  }
}
