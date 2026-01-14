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

  // Contenedor oculto para PDF
  let pdfContainer = document.getElementById('pdfDownload');
  if (!pdfContainer) {
    pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdfDownload';
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '-9999px';
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
    par1.innerText = pars[0] ? `👨‍✈️ ${pars[0].paramedicos.nombre} ${pars[0].paramedicos.apellido}` : '🚑 --';
    par2.innerText = pars[1] ? `🧰 ${pars[1].paramedicos.nombre} ${pars[1].paramedicos.apellido}` : '🚑 --';

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
    btnPDF.onclick = () => descargarPDFMediaKit(p, signos, pars, id);
  });
});

// PDF Media Kit usando html2canvas + jsPDF
async function descargarPDFMediaKit(p, signos, pars, id) {
  const { jsPDF } = window.jspdf;

  // Construir HTML para PDF
  const html = `
    <div style="
      font-family: 'Open Sans', sans-serif;
      width:850px;
      padding:50px;
      background:white;
      border-top:8px solid #E30613;
    ">
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:40px;border-bottom:2px solid #000;padding-bottom:10px;">
        <div style="color:#E30613;font-size:38px;font-weight:800;">AMBULINK</div>
        <div style="text-align:right;font-size:14px;font-weight:700;line-height:1.6;">
          FECHA: ${new Date().toLocaleDateString()}<br>
          CASO: ${id}
        </div>
      </div>

      <div style="font-weight:800;font-size:16px;margin-top:30px;margin-bottom:15px;text-transform:uppercase;">Información del Paciente</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px 40px;margin-bottom:30px;">
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e0e0;padding:5px 0;font-size:14px;"><span style="font-weight:700">NOMBRE:</span>${p.nombre}</div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e0e0;padding:5px 0;font-size:14px;"><span style="font-weight:700">EDAD:</span>${p.edad}</div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e0e0;padding:5px 0;font-size:14px;"><span style="font-weight:700">SEXO:</span>${p.sexo}</div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e0e0;padding:5px 0;font-size:14px;"><span style="font-weight:700">TIPO DE SANGRE:</span>${p.tipo_sangre}</div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e0e0;padding:5px 0;font-size:14px;"><span style="font-weight:700">UBICACIÓN INICIAL:</span>${p.ubicacion}</div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e0e0;padding:5px 0;font-size:14px;"><span style="font-weight:700">TIPO DE TRASLADO:</span style="color:#E30613;font-weight:800">${p.tipo_traslado}</div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e0e0;padding:5px 0;font-size:14px;"><span style="font-weight:700">DIAGNÓSTICO:</span>${p.diagnostico ?? '--'}</div>
        <div style="display:flex;justify-content:space-between;border-bottom:1px solid #e0e0e0;padding:5px 0;font-size:14px;"><span style="font-weight:700">HEMORRAGIA:</span>${p.hemorragia ? 'SÍ' : 'NO'}</div>
      </div>

      <div style="font-weight:800;font-size:16px;margin-top:30px;margin-bottom:15px;text-transform:uppercase;">Monitoreo de Signos Vitales</div>
      <table style="width:100%;border-collapse:collapse;margin-top:10px;">
        <thead>
          <tr>
            <th style="border:1px solid #000;padding:6px;font-size:10px;font-weight:800;background:#f9f9f9;">HORA</th>
            <th style="border:1px solid #000;padding:6px;font-size:10px;font-weight:800;background:#f9f9f9;">PRESIÓN DIASTÓLICA</th>
            <th style="border:1px solid #000;padding:6px;font-size:10px;font-weight:800;background:#f9f9f9;">PRESIÓN SISTÓLICA</th>
            <th style="border:1px solid #000;padding:6px;font-size:10px;font-weight:800;background:#f9f9f9;">FREC. RESP.</th>
            <th style="border:1px solid #000;padding:6px;font-size:10px;font-weight:800;background:#f9f9f9;">SpO₂</th>
            <th style="border:1px solid #000;padding:6px;font-size:10px;font-weight:800;background:#f9f9f9;">FREC. CARDIACA</th>
            <th style="border:1px solid #000;padding:6px;font-size:10px;font-weight:800;background:#f9f9f9;">TEMP. (°C)</th>
            <th style="border:1px solid #000;padding:6px;font-size:10px;font-weight:800;background:#f9f9f9;">GLASGOW</th>
          </tr>
        </thead>
        <tbody>
          ${signos.map(s => `
            <tr>
              <td style="border:1px solid #ccc;height:28px;text-align:center;">${new Date(s.fecha).toLocaleString()}</td>
              <td style="border:1px solid #ccc;text-align:center;">${s.presion_diastolica ?? '--'}</td>
              <td style="border:1px solid #ccc;text-align:center;">${s.presion_sistolica ?? '--'}</td>
              <td style="border:1px solid #ccc;text-align:center;">${s.frecuencia_respiratoria ?? '--'}</td>
              <td style="border:1px solid #ccc;text-align:center;">${s.spo2 ?? '--'}</td>
              <td style="border:1px solid #ccc;text-align:center;">${s.temperatura ?? '--'}</td>
              <td style="border:1px solid #ccc;text-align:center;">${s.frecuencia_cardiaca ?? '--'}</td>
              <td style="border:1px solid #ccc;text-align:center;">${s.escala_glasgow ?? '--'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div style="font-weight:800;font-size:16px;margin-top:30px;margin-bottom:15px;text-transform:uppercase;">Personal a Cargo (Paramédicos)</div>
      <div style="display:flex;gap:30px;margin-top:15px;">
        ${pars.map(par => `
          <div style="flex:1;padding:15px;border:1px solid #e0e0e0;border-radius:4px;display:flex;align-items:center;gap:12px;font-weight:700;font-size:15px;">
            <span style="font-size:24px;">👨‍✈️</span>
            <span>${par.paramedicos.nombre} ${par.paramedicos.apellido}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;

  // Crear PDF
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  document.body.appendChild(container);

  await html2pdf().set({
    margin: 10,
    filename: `Historial_Caso_${id}.pdf`,
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }
  }).from(container).save();

  document.body.removeChild(container);
}
