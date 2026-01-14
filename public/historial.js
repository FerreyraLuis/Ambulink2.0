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
    par1.innerText = pars[0] ? `${pars[0].paramedicos.nombre} ${pars[0].paramedicos.apellido}` : '';
    par2.innerText = pars[1] ? `${pars[1].paramedicos.nombre} ${pars[1].paramedicos.apellido}` : '';

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

    btnPDF.style.display = 'block';
    btnPDF.onclick = () => generarPDF(p, signos, pars, id);
  });
});

// --- Función para generar PDF ---
function generarPDF(p, signos, pars, id) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // --- Título ---
  doc.setFontSize(26);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(200, 0, 0);
  doc.text("AMBULINK", 15, 20);

  // --- Fecha y caso debajo ---
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(33, 33, 33);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 15, 28);
  doc.text(`Caso: ${id}`, 15, 36);

  // --- Paramédicos alineados a la derecha con subrayado ---
  doc.setFont('helvetica', 'bold');
  doc.text("Paramédicos:", 150, 28, { align: 'right' });
  doc.setLineWidth(0.5);
  doc.line(150, 30, 190, 30); // subrayado del título
  doc.setFont('helvetica', 'normal');
  pars.forEach((par, i) => {
    doc.text(`${par.paramedicos.nombre} ${par.paramedicos.apellido}`, 150, 36 + i * 8, { align: 'right' });
  });

  // --- Título centrado y subrayado: Información del paciente ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const infoTitle = "INFORMACIÓN DEL PACIENTE";
  const infoWidth = doc.getTextWidth(infoTitle);
  doc.text(infoTitle, 105 - infoWidth / 2, 55);
  doc.setLineWidth(0.5);
  doc.line(105 - infoWidth / 2, 57, 105 + infoWidth / 2, 57);

  // Datos del paciente en negrilla
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Nombre: ${p.nombre}`, 16, 63);
  doc.text(`Edad: ${p.edad}`, 16, 70);
  doc.text(`Sexo: ${p.sexo}`, 16, 77);
  doc.text(`Tipo de Sangre: ${p.tipo_sangre}`, 100, 63);
  doc.text(`Tipo de Traslado: ${p.tipo_traslado}`, 100, 70);
  doc.text(`Ubicación: ${p.ubicacion}`, 100, 77);
  doc.text(`Hemorragia: ${p.hemorragia ? 'SI' : 'NO'}`, 100, 84);

  // --- Título de la tabla centrado y subrayado ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const tablaTitle = "TABLA DE SIGNOS VITALES";
  const tablaWidth = doc.getTextWidth(tablaTitle);
  doc.text(tablaTitle, 105 - tablaWidth / 2, 95);
  doc.setLineWidth(0.5);
  doc.line(105 - tablaWidth / 2, 97, 105 + tablaWidth / 2, 97);

  // --- Tabla de signos vitales ---
  const rows = signos.map(s => [
    new Date(s.fecha).toLocaleString(),
    s.presion_diastolica ? `${s.presion_diastolica} mmHg` : '--',
    s.presion_sistolica ? `${s.presion_sistolica} mmHg` : '--',
    s.frecuencia_respiratoria ? `${s.frecuencia_respiratoria} rpm` : '--',
    s.spo2 ? `${s.spo2} %` : '--',
    s.temperatura ? `${s.temperatura} °C` : '--',
    s.frecuencia_cardiaca ? `${s.frecuencia_cardiaca} lpm` : '--',
    s.escala_glasgow ?? '--'
  ]);

  doc.autoTable({
    head: [['Hora','Presión Diastólica (mmHg)','Presión Sistólica (mmHg)','Frecuencia Respiratoria (rpm)','Saturación de Oxígeno (%)','Temperatura (°C)','Frecuencia Cardiaca (lpm)','Glasgow']],
    body: rows,
    startY: 100,
    theme: 'striped',
    headStyles: { fillColor: [200, 0, 0], textColor: 255, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: [255, 245, 245] },
    margin: { left: 15, right: 15 },
    styles: { fontSize: 10 }
  });

  // --- Guardar PDF ---
  doc.save(`Historial_Clinico_AMBULINK_Caso${id}.pdf`);
}
