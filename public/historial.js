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

  const pageWidth = doc.internal.pageSize.getWidth();

  // Título principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(227, 6, 19); // color rojo Ambulink
  doc.text("AMBULINK", pageWidth / 2, 20, { align: "center" });

  // Fecha y caso
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0,0,0);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 32);
  doc.text(`Caso: ${id}`, pageWidth - 50, 32);

  // Sección Información del Paciente
  doc.setFont("helvetica", "bold");
  doc.setTextColor(46, 125, 50); // verde título
  doc.setFontSize(16);
  doc.text("INFORMACIÓN DEL PACIENTE", 15, 45);

  doc.setFontSize(12);
  doc.setTextColor(0,0,0);
  doc.setFont("helvetica", "bold");
  doc.text("Nombre:", 15, 55); doc.setFont("helvetica", "normal"); doc.text(p.nombre, 50, 55);
  doc.setFont("helvetica", "bold");
  doc.text("Edad:", 15, 62); doc.setFont("helvetica", "normal"); doc.text(`${p.edad} años`, 50, 62);
  doc.setFont("helvetica", "bold");
  doc.text("Sexo:", 15, 69); doc.setFont("helvetica", "normal"); doc.text(p.sexo, 50, 69);
  doc.setFont("helvetica", "bold");
  doc.text("Tipo de Sangre:", 15, 76); doc.setFont("helvetica", "normal"); doc.text(p.tipo_sangre, 50, 76);
  doc.setFont("helvetica", "bold");
  doc.text("Tipo de Traslado:", 15, 83); doc.setFont("helvetica", "normal"); doc.text(p.tipo_traslado, 50, 83);
  doc.setFont("helvetica", "bold");
  doc.text("Ubicación:", 15, 90); doc.setFont("helvetica", "normal"); doc.text(p.ubicacion, 50, 90);
  doc.setFont("helvetica", "bold");
  doc.text("Hemorragia:", 15, 97); doc.setFont("helvetica", "normal"); doc.text(p.hemorragia ? "SÍ" : "NO", 50, 97);

  // Tabla signos vitales
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
    head: [[
      { content: 'Hora', styles: { fontStyle: 'bold', textColor: [227,6,19] }},
      { content: 'Presión Dia (mmHg)', styles: { fontStyle: 'bold', textColor: [227,6,19] }},
      { content: 'Presión Sist (mmHg)', styles: { fontStyle: 'bold', textColor: [227,6,19] }},
      { content: 'Frec Resp (rpm)', styles: { fontStyle: 'bold', textColor: [227,6,19] }},
      { content: 'SpO₂ (%)', styles: { fontStyle: 'bold', textColor: [227,6,19] }},
      { content: 'Temp (°C)', styles: { fontStyle: 'bold', textColor: [227,6,19] }},
      { content: 'Frec Card (lpm)', styles: { fontStyle: 'bold', textColor: [227,6,19] }},
      { content: 'Glasgow', styles: { fontStyle: 'bold', textColor: [227,6,19] }},
    ]],
    body: rows,
    startY: 110,
    theme: 'grid',
    headStyles: { fillColor: [240,240,240], textColor: [227,6,19], fontStyle: 'bold' },
    styles: { fontSize: 10, cellPadding: 2 },
  });

  // Paramédicos
  doc.setFont("helvetica","bold");
  doc.setTextColor(0,0,0);
  let startY = doc.lastAutoTable.finalY + 10;
  doc.text("Paramédicos a Cargo:", pageWidth - 80, startY);

  pars.forEach((par, i) => {
    doc.text(`🚑 ${par.paramedicos.nombre} ${par.paramedicos.apellido}`, pageWidth - 80, startY + 7 + i*7);
  });

  // Guardar PDF
  doc.save(`Historial_Clinico_AMBULINK_Caso${id}.pdf`);
}
  