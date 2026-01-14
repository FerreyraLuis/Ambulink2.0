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

    if (p.hemorragia) bloqueHemorragia.style.display = 'block';

    const pars = data.salida_paramedicos || [];
    par1.innerText = pars[0] ? `🚑 ${pars[0].paramedicos.nombre} ${pars[0].paramedicos.apellido}` : '🚑 --';
    par2.innerText = pars[1] ? `🚑 ${pars[1].paramedicos.nombre} ${pars[1].paramedicos.apellido}` : '🚑 --';

    const resHist = await fetch(`https://ambulink.doc-ia.cloud/historial/signos/${id}`);
    const signos = await resHist.json();

    tablaHistorial.innerHTML = '';
    signos.forEach(s => {
      tablaHistorial.innerHTML += `
        <tr>
          <td class="date">${new Date(s.fecha).toLocaleString()}</td>
          <td>${s.presion_diastolica ?? '--'}</td>
          <td>${s.presion_sistolica ?? '--'}</td>
          <td>${s.frecuencia_respiratoria ?? '--'}</td>
          <td>${s.spo2 ?? '--'}</td>
          <td>${s.temperatura ?? '--'}</td>
          <td>${s.frecuencia_cardiaca ?? '--'}</td>
          <td>${s.escala_glasgow ?? '--'}</td>
        </tr>`;
    });

    // Mostrar botón PDF
    btnPDF.style.display = 'block';

    // Asignar acción del PDF
    btnPDF.onclick = () => generarPDF(p, signos, pars, id);
  });
});

// Función para generar PDF con estilo profesional
function generarPDF(p, signos, pars, id) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- Encabezado ---
  doc.setFontSize(26);
  doc.setTextColor(33, 33, 33); // Gris oscuro
  doc.setFont('helvetica', 'bold');
  doc.text("AMBULINK", 15, 20);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 150, 20, { align: 'right' });
  doc.text(`Caso: ${id}`, 150, 28, { align: 'right' });

  // --- Información del paciente en cuadro ---
  doc.setFillColor(245, 245, 245); // Gris claro
  doc.rect(14, 35, 180, 55, 'F'); // x, y, width, height, fill

  doc.setTextColor(33,33,33);
  doc.setFont('helvetica', 'bold');
  doc.text(`Nombre:`, 16, 45);
  doc.text(`Edad:`, 16, 53);
  doc.text(`Sexo:`, 16, 61);
  doc.text(`Tipo de Sangre:`, 100, 45);
  doc.text(`Tipo de Traslado:`, 100, 53);
  doc.text(`Ubicación:`, 100, 61);
  doc.text(`Hemorragia:`, 100, 69);

  doc.setFont('helvetica', 'normal');
  doc.text(`${p.nombre}`, 45, 45);
  doc.text(`${p.edad}`, 35, 53);
  doc.text(`${p.sexo}`, 35, 61);
  doc.text(`${p.tipo_sangre}`, 150, 45);
  doc.text(`${p.tipo_traslado}`, 150, 53);
  doc.text(`${p.ubicacion}`, 150, 61);
  doc.text(`${p.hemorragia ? 'SI' : 'NO'}`, 150, 69);

  // --- Tabla de signos vitales ---
  const rows = signos.map(s => [
    new Date(s.fecha).toLocaleString(),
    s.presion_diastolica ?? '--',
    s.presion_sistolica ?? '--',
    s.frecuencia_respiratoria ?? '--',
    s.spo2 ?? '--',
    s.temperatura ?? '--',
    s.frecuencia_cardiaca ?? '--',
    s.escala_glasgow ?? '--'
  ]);

  doc.autoTable({
    head: [['Hora','Presión Diastólica','Presión Sistólica','Frec Resp','Saturación','Temp (°C)','Frec Card','Glasgow']],
    body: rows,
    startY: 95,
    theme: 'striped',
    headStyles: { fillColor: [33, 150, 243], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [240, 248, 255] },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 10 }
  });

  // --- Paramédicos ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Paramédicos:`, 15, doc.lastAutoTable.finalY + 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  pars.forEach((par, i) => {
    doc.text(`• ${par.paramedicos.nombre} ${par.paramedicos.apellido}`, 20, doc.lastAutoTable.finalY + 22 + i*8);
  });

  // --- Guardar PDF ---
  doc.save(`Historial_Clinico_AMBULINK_Caso${id}.pdf`);
}
