import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// 🔐 SUPABASE CLIENTES
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const supabaseAuth = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// __dirname para import
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SERVIR ARCHIVOS ESTÁTICOS
app.use(express.static(path.join(__dirname, 'public')));

// Ruta raíz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/login.html'));
});

/* ===============================
   PARAMÉDICOS
=============================== */
app.get('/paramedicos', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('paramedicos')
      .select('*')
      .eq('activo', true);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

/* ===============================
   REGISTRAR SALIDA + PACIENTE
=============================== */
app.post('/ambulancia/salida', async (req, res) => {
  try {
    const { ubicacion, paciente, personal, en_camino } = req.body;

    const { data: salida, error } = await supabase
      .from('salida')
      .insert({
        ubicacion,
        fecha: new Date().toISOString(),
        estado: 'en curso',
        en_camino: Boolean(en_camino),
        monitoreo_activo: false
      })
      .select()
      .single();

    if (error) throw error;

    await supabase.from('paciente').insert({
      id_salida: salida.id_salida,
      ...paciente
    });

    if (paciente.escala_glasgow) {
      await supabase.from('signos_vitales').insert({
        id_salida: salida.id_salida,
        escala_glasgow: paciente.escala_glasgow,
        fecha: new Date().toISOString()
      });
    }

    await supabase.from('salida_paramedicos').insert([
      {
        id_salida: salida.id_salida,
        id_paramedico: personal.chofer,
        rol_en_la_salida: 'chofer'
      },
      {
        id_salida: salida.id_salida,
        id_paramedico: personal.paramedico,
        rol_en_la_salida: 'paramedico'
      }
    ]);

    res.json({ ok: true, id_salida: salida.id_salida });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

/* ===============================
   ACTUALIZAR SIGNOS
=============================== */
app.put('/paciente/signos', async (req, res) => {
  try {
    const { id_salida, presion_diastolica, presion_sistolica, frecuencia_respiratoria } = req.body;

    await supabase
      .from('paciente')
      .update({ presion_diastolica, presion_sistolica, frecuencia_respiratoria })
      .eq('id_salida', id_salida);

    await supabase.from('signos_vitales').insert({
      id_salida,
      presion_diastolica,
      presion_sistolica,
      frecuencia_respiratoria,
      fecha: new Date().toISOString()
    });

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

/* ===============================
   ACTUALIZAR GLASGOW
=============================== */
app.put('/paciente/glasgow', async (req, res) => {
  try {
    const { id_salida, escala_glasgow } = req.body;

    await supabase
      .from('paciente')
      .update({ escala_glasgow })
      .eq('id_salida', id_salida);

    await supabase.from('signos_vitales').insert({
      id_salida,
      escala_glasgow,
      fecha: new Date().toISOString()
    });

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

/* ===============================
   ACTUALIZAR HEMORRAGIA
=============================== */
app.put('/paciente/hemorragia', async (req, res) => {
  try {
    const { id_salida, hemorragia } = req.body;

    await supabase
      .from('paciente')
      .update({ hemorragia })
      .eq('id_salida', id_salida);

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

/* ===============================
   ACTIVAR / DESACTIVAR MONITOREO
=============================== */
app.put('/salida/monitoreo', async (req, res) => {
  try {
    const { id_salida, monitoreo_activo } = req.body;

    await supabase
      .from('salida')
      .update({ monitoreo_activo: Boolean(monitoreo_activo) })
      .eq('id_salida', id_salida);

    res.json({ ok: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

/* ===============================
   SALIDA COMPLETA
=============================== */
app.get('/salidas/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const { data: salida } = await supabase
      .from('salida')
      .select('id_salida, fecha, ubicacion, en_camino, monitoreo_activo')
      .eq('id_salida', id)
      .single();

    const { data: paciente } = await supabase
      .from('paciente')
      .select('*')
      .eq('id_salida', id)
      .single();

    const { data: paramedicos } = await supabase
      .from('salida_paramedicos')
      .select(`rol_en_la_salida, paramedicos(nombre, apellido)`)
      .eq('id_salida', id);

    res.json({
      ...salida,
      paciente,
      salida_paramedicos: paramedicos || []
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({});
  }
});

/* ===============================
   HISTORIAL POR FECHA
=============================== */
app.get('/historial/fecha/:fecha', async (req, res) => {
  try {
    const fecha = req.params.fecha;
    const inicio = `${fecha}T00:00:00`;
    const fin = `${fecha}T23:59:59`;

    const { data } = await supabase
      .from('salida')
      .select('id_salida, fecha, ubicacion, en_camino')
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('fecha', { ascending: false });

    res.json(data || []);

  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

/* ===============================
   HISTORIAL DE SIGNOS
=============================== */
app.get('/historial/signos/:id', async (req, res) => {
  try {
    const { data } = await supabase
      .from('signos_vitales')
      .select('*')
      .eq('id_salida', req.params.id)
      .order('fecha', { ascending: false });

    res.json(data || []);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

/* ===============================
   ÚLTIMO SIGNO VITAL
=============================== */
app.get('/signos/ultimo/:id', async (req, res) => {
  try {
    const { data } = await supabase
      .from('signos_vitales')
      .select('*')
      .eq('id_salida', req.params.id)
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    res.json(data || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({});
  }
});

/* =====================================================
   🚑 ESTADO AMBULANCIAS COMPLETO – PACIENTES + SIGNOS
===================================================== */
app.get('/clinica/ambulancias', async (req, res) => {
  try {
    // Todas las ambulancias en curso
    const { data: salidas, error } = await supabase
      .from('salida')
      .select('*')
      .eq('estado', 'en curso')
      .order('fecha', { ascending: false });

    if (error) throw error;

    const resultado = await Promise.all(
      salidas.map(async (s) => {
        // Paciente
        const { data: paciente } = await supabase
          .from('paciente')
          .select('*')
          .eq('id_salida', s.id_salida)
          .single();

        // Últimos signos vitales (manual + ESP32)
        const { data: signos } = await supabase
          .from('signos_vitales')
          .select('*')
          .eq('id_salida', s.id_salida)
          .order('fecha', { ascending: false })
          .limit(1)
          .single();

        // Paramédicos
        const { data: paramedicos } = await supabase
          .from('salida_paramedicos')
          .select(`rol_en_la_salida, paramedicos(nombre, apellido)`)
          .eq('id_salida', s.id_salida);

        return {
          id_salida: s.id_salida,
          fecha: s.fecha,
          ubicacion: s.ubicacion,
          en_camino: s.en_camino,
          monitoreo_activo: s.monitoreo_activo,
          paciente: paciente || null,
          signos: signos || {},
          hemorragia: paciente?.hemorragia ?? false,
          glasgow: paciente?.escala_glasgow ?? null,
          paramedicos: paramedicos || []
        };
      })
    );

    res.json(resultado);

  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

/* ===============================
   ESP32 – DATOS
=============================== */
app.post('/esp32/datos', async (req, res) => {
  try {
    const { spo2, frecuencia_cardiaca, temperatura } = req.body;

    const { data: salida } = await supabase
      .from('salida')
      .select('id_salida')
      .eq('monitoreo_activo', true)
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    if (!salida) return res.json({ ok: true, guardado: false });

    await supabase.from('signos_vitales').insert({
      id_salida: salida.id_salida,
      spo2,
      frecuencia_cardiaca,
      temperatura,
      fecha: new Date().toISOString()
    });

    res.json({ ok: true, guardado: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

/* ===============================
   AUTH / ME
=============================== */
app.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ ok: false });

    const token = authHeader.replace('Bearer ', '');

    const { data: userData, error } = await supabaseAuth.auth.getUser(token);
    if (error || !userData?.user) return res.status(401).json({ ok: false });

    const email = userData.user.email;

    const { data: usuario } = await supabase
      .from('usuarios')
      .select('tipo_rol')
      .eq('email', email)
      .single();

    if (!usuario) return res.status(403).json({ ok: false });

    res.json({ ok: true, email, tipo_rol: usuario.tipo_rol });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
});

/* ===============================
   START SERVER
=============================== */
app.listen(5001, () => {
  console.log('✅ Servidor listo en https://ambulink.doc-ia.cloud');
});
