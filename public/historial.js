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

  // 🔹 Contenedor invisible para PDF
  let pdfContainer = document.getElementById('pdfDownload');
  if (!pdfContainer) {
    pdfContainer = document.createElement('div');
    pdfContainer.id = 'pdfDownload';
    pdfContainer.style.position = 'absolute';
    pdfContainer.style.left = '0';
    pdfContainer.style.top = '0';
    pdfContainer.style.opacity = '0';
    pdfContainer.style.pointerEvents = 'none';
    document.body.appendChild(pdfContainer);
  }

  fechaActual.innerText = new Date().toLocaleDateString('es-ES',{
    day:'numeric',month:'long',year:'numeric'
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
    casos.forEach(c=>{
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
    signos.forEach(s=>{
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
        </tr>
      `;
    });

    // 🔹 Contenido profesional para PDF
    pdfContainer.innerHTML = `
      <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;">
        <div style="background:white;width:800px;margin:0 auto;padding:40px;border-radius:15px;box-shadow:0 4px 15px rgba(0,0,0,0.2);">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #2e7d32;padding-bottom:10px;margin-bottom:20px;">
            <h1 style="color:#2e7d32;font-size:28px;font-weight:bold;margin:0;">AMBULINK</h1>
            <div style="text-align:right;font-size:14px;">
              <div><strong>FECHA:</strong> ${new Date().toLocaleDateString()}</div>
              <div><strong>CASO:</strong> ${id}</div>
            </div>
          </div>
          <div style="background-color:#2e7d32;color:white;padding:8px 12px;font-weight:bold;margin-bottom:12px;border-radius:8px;">INFORMACIÓN DEL PACIENTE</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
            <div><strong>NOMBRE:</strong> ${p.nombre}</div>
            <div><strong>EDAD:</strong> ${p.edad}</div>
            <div><strong>SEXO:</strong> ${p.sexo}</div>
            <div><strong>TIPO DE SANGRE:</strong> ${p.tipo_sangre}</div>
            <div><strong>TIPO DE TRASLADO:</strong> ${p.tipo_traslado}</div>
            <div><strong>UBICACIÓN INICIAL:</strong> ${data.ubicacion}</div>
            <div><strong>DIAGNÓSTICO:</strong> ${p.diagnostico ?? '--'}</div>
            <div><strong>HEMORRAGIA:</strong> ${p.hemorragia ? '<span style="color:red;font-weight:bold;">SI</span>' : 'NO'}</div>
          </div>
          <div style="background-color:#2e7d32;color:white;padding:8px 12px;font-weight:bold;margin-bottom:12px;border-radius:8px;">MONITOREO DE SIGNOS VITALES</div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#e8f5e9;color:#2e7d32;">
                <th style="border:1px solid #ccc;padding:8px;">HORA</th>
                <th style="border:1px solid #ccc;padding:8px;">PRESIÓN DIASTÓLICA</th>
                <th style="border:1px solid #ccc;padding:8px;">PRESIÓN SISTÓLICA</th>
                <th style="border:1px solid #ccc;padding:8px;">FREC. RESP.</th>
                <th style="border:1px solid #ccc;padding:8px;">SpO₂</th>
                <th style="border:1px solid #ccc;padding:8px;">FREC. CARDIACA</th>
                <th style="border:1px solid #ccc;padding:8px;">TEMP (°C)</th>
                <th style="border:1px solid #ccc;padding:8px;">GLASGOW</th>
              </tr>
            </thead>
            <tbody>
              ${signos.map(s=>`
                <tr>
                  <td>${new Date(s.fecha).toLocaleString()}</td>
                  <td>${s.presion_diastolica ?? '--'}</td>
                  <td>${s.presion_sistolica ?? '--'}</td>
                  <td>${s.frecuencia_respiratoria ?? '--'}</td>
                  <td>${s.spo2 ?? '--'}</td>
                  <td>${s.temperatura ?? '--'}</td>
                  <td>${s.frecuencia_cardiaca ?? '--'}</td>
                  <td>${s.escala_glasgow ?? '--'}</td>
                </tr>`).join('')}
            </tbody>
          </table>
          <div style="margin-top:25px;font-size:14px;">
            <strong>PARAMÉDICOS:</strong><br>
            ${pars.map(p=>`• ${p.paramedicos.nombre} ${p.paramedicos.apellido}`).join('<br>')}
          </div>
        </div>
      </div>
    `;

    btnPDF.style.display = 'block';
  });

});

function descargarPDF(){
  html2pdf().set({
    margin:0.5,
    filename:'Historial_Clinico_AMBULINK.pdf',
    html2canvas:{scale:3,letterRendering:true},
    jsPDF:{unit:'cm',format:'a4',orientation:'portrait'}
  }).from(document.getElementById('pdfDownload')).save();
}
