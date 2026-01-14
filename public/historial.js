document.addEventListener('DOMContentLoaded', () => {
  const fechaActual = document.getElementById('fechaActual');
  const filtroFecha = document.getElementById('filtroFecha');
  const selectCaso = document.getElementById('selectCaso');
  const caseBadge = document.getElementById('caseBadge');
  const tablaHistorial = document.getElementById('tablaHistorial');
  const btnPDF = document.getElementById('btnPDF');

  const pac_nombre = document.getElementById('pac_nombre');
  const pac_edad = document.getElementById('pac_edad');
  const pac_sexo = document.getElementById('pac_sexo');
  const pac_sangre = document.getElementById('pac_sangre');
  const pac_traslado = document.getElementById('pac_traslado');
  const pac_ubicacion = document.getElementById('pac_ubicacion');

  const par1 = document.getElementById('par1');
  const par2 = document.getElementById('par2');
  const bloqueHemorragia = document.getElementById('bloqueHemorragia');

  fechaActual.innerText = new Date().toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  filtroFecha.addEventListener('change', async () => {
    const fecha = filtroFecha.value;
    if (!fecha) return;

    selectCaso.innerHTML = '<option>Cargando...</option>';
    tablaHistorial.innerHTML = '';
    btnPDF.style.display = 'none';
    bloqueHemorragia.style.display = 'none';

    const res = await fetch(`https://ambulink.doc-ia.cloud/historial/fecha/${fecha}`);
    const casos = await res.json();

    selectCaso.innerHTML = '<option value="">Seleccionar caso</option>';
    casos.forEach(c => {
      selectCaso.innerHTML += `<option value="${c.id_salida}">Caso ${c.id_salida}</option>`;
    });
  });

  selectCaso.addEventListener('change', async () => {
    const id = selectCaso.value;
    if (!id) return;

    caseBadge.innerText = `CASO ${id}`;
    tablaHistorial.innerHTML = '';
    bloqueHemorragia.style.display = 'none';

    const resCaso = await fetch(`https://ambulink.doc-ia.cloud/salidas/${id}`);
    const data = await resCaso.json();
    const p = data.paciente;

    pac_nombre.innerText = p.nombre;
    pac_edad.innerText = `${p.edad} años`;
    pac_sexo.innerText = p.sexo;
    pac_sangre.innerText = p.tipo_sangre;
    pac_traslado.innerText = p.tipo_traslado;
    pac_ubicacion.innerText = data.ubicacion;

    if (p.hemorragia === true) {
      bloqueHemorragia.style.display = 'block';
    }

    const pars = data.salida_paramedicos || [];
    par1.innerText = pars[0] ? `🚑 ${pars[0].paramedicos.nombre} ${pars[0].paramedicos.apellido}` : '🚑 --';
    par2.innerText = pars[1] ? `🚑 ${pars[1].paramedicos.nombre} ${pars[1].paramedicos.apellido}` : '🚑 --';

    const resHist = await fetch(`https://ambulink.doc-ia.cloud/historial/signos/${id}`);
    const signos = await resHist.json();

    tablaHistorial.innerHTML = '';
    signos.forEach(s => {
      tablaHistorial.innerHTML += `
        <tr>
          <td>${new Date(s.fecha).toLocaleString()}</td>
          <td>${s.presion_diastolica ?? '--'}</td>
          <td>${s.presion_sistolica ?? '--'}</td>
          <td>${s.frecuencia_respiratoria ?? '--'}</td>
          <td>${s.spo2 ?? '--'}</td>
          <td>${s.temperatura ?? '--'}</td>
          <td>${s.frecuencia_cardiaca ?? '--'}</td>
          <td>${s.escala_glasgow ?? '--'}</td>
        </tr>`;
    });

    btnPDF.style.display = 'block';
  });
});


// =====================
// ✅ PDF FUNCIONAL REAL
// =====================
function descargarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');

  let y = 15;

  doc.setFontSize(18);
  doc.text('AMBULINK - HISTORIAL CLÍNICO', 105, y, { align: 'center' });
  y += 10;

  doc.setFontSize(11);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, y);
  y += 8;

  doc.text(`Paciente: ${pac_nombre.innerText}`, 15, y); y += 6;
  doc.text(`Edad: ${pac_edad.innerText}`, 15, y); y += 6;
  doc.text(`Sexo: ${pac_sexo.innerText}`, 15, y); y += 6;
  doc.text(`Tipo de sangre: ${pac_sangre.innerText}`, 15, y); y += 6;
  doc.text(`Traslado: ${pac_traslado.innerText}`, 15, y); y += 6;
  doc.text(`Ubicación: ${pac_ubicacion.innerText}`, 15, y); y += 10;

  doc.setFontSize(13);
  doc.text('Signos Vitales', 15, y);
  y += 6;

  doc.setFontSize(9);
  doc.text('Fecha | PA Dia | PA Sis | FR | SpO₂ | Temp | FC | Glasgow', 15, y);
  y += 5;

  const filas = document.querySelectorAll('#tablaHistorial tr');

  filas.forEach(fila => {
    const cols = fila.querySelectorAll('td');
    if (!cols.length) return;

    const linea = [
      cols[0].innerText,
      cols[1].innerText,
      cols[2].innerText,
      cols[3].innerText,
      cols[4].innerText,
      cols[5].innerText,
      cols[6].innerText,
      cols[7].innerText
    ].join(' | ');

    if (y > 280) {
      doc.addPage();
      y = 15;
    }

    doc.text(linea, 15, y);
    y += 5;
  });

  doc.save('Historial_Clinico_AMBULINK.pdf');
}
