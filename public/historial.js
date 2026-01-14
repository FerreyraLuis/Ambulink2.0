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

  // ✅ CONTENEDOR PDF (VISIBLE PARA html2canvas PERO INVISIBLE AL USUARIO)
  let pdfContainer = document.getElementById('pdfDownload');
  if (!pdfContainer) {
    pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdfDownload';
    pdfContainer.style.position = 'fixed';
    pdfContainer.style.top = '0';
    pdfContainer.style.left = '0';
    pdfContainer.style.width = '210mm';
    pdfContainer.style.background = 'white';
    pdfContainer.style.visibility = 'hidden';
    pdfContainer.style.opacity = '0';
    document.body.appendChild(pdfContainer);
  }

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

    // ✅ CONTENIDO PDF
    pdfContainer.innerHTML = `
      <div style="padding:30px;font-family:Arial">
        <h2>AMBULINK - HISTORIAL CLÍNICO</h2>
        <hr>
        <p><strong>Paciente:</strong> ${p.nombre}</p>
        <p><strong>Edad:</strong> ${p.edad}</p>
        <p><strong>Sexo:</strong> ${p.sexo}</p>
        <p><strong>Ubicación:</strong> ${data.ubicacion}</p>
        <br>
        <table border="1" width="100%" cellspacing="0" cellpadding="6">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>PA Dia</th>
              <th>PA Sis</th>
              <th>FR</th>
              <th>SpO₂</th>
              <th>Temp</th>
              <th>FC</th>
              <th>Glasgow</th>
            </tr>
          </thead>
          <tbody>
            ${signos.map(s => `
              <tr>
                <td>${new Date(s.fecha).toLocaleString()}</td>
                <td>${s.presion_diastolica ?? '--'}</td>
                <td>${s.presion_sistolica ?? '--'}</td>
                <td>${s.frecuencia_respiratoria ?? '--'}</td>
                <td>${s.spo2 ?? '--'}</td>
                <td>${s.temperatura ?? '--'}</td>
                <td>${s.frecuencia_cardiaca ?? '--'}</td>
                <td>${s.escala_glasgow ?? '--'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;

    btnPDF.style.display = 'block';
  });
});

async function descargarPDF() {
  const element = document.getElementById('pdfDownload');

  element.style.visibility = 'visible';
  element.style.opacity = '1';

  await html2pdf().set({
    margin: 1,
    filename: 'Historial_Clinico_AMBULINK.pdf',
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'cm', format: 'a4', orientation: 'portrait' }
  }).from(element).save();

  element.style.visibility = 'hidden';
  element.style.opacity = '0';
}
