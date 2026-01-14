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

// Función para generar PDF
function generarPDF(p, signos, pars, id) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.text("AMBULINK", 15, 20);

  doc.setFontSize(14);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 150, 20);
  doc.text(`Caso: ${id}`, 150, 28);

  doc.text(`Nombre: ${p.nombre}`, 15, 40);
  doc.text(`Edad: ${p.edad}`, 15, 48);
  doc.text(`Sexo: ${p.sexo}`, 15, 56);
  doc.text(`Tipo de Sangre: ${p.tipo_sangre}`, 15, 64);
  doc.text(`Tipo de Traslado: ${p.tipo_traslado}`, 15, 72);
  doc.text(`Ubicación: ${p.ubicacion}`, 15, 80);
  doc.text(`Hemorragia: ${p.hemorragia ? 'SI' : 'NO'}`, 15, 88);

  // Tabla de signos vitales
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
    head: [['Hora','Presión Dia','Presión Sist','Frec Resp','SpO₂','Temp','Frec Card','Glasgow']],
    body: rows,
    startY: 100,
    theme: 'grid',
    headStyles: { fillColor: [46,125,50], textColor: 255 },
  });

  // Paramédicos
  doc.text(`Paramédicos:`, 15, doc.lastAutoTable.finalY + 10);
  pars.forEach((par, i) => {
    doc.text(`• ${par.paramedicos.nombre} ${par.paramedicos.apellido}`, 20, doc.lastAutoTable.finalY + 20 + i*8);
  });

  doc.save('Historial_Clinico_AMBULINK.pdf');
}
