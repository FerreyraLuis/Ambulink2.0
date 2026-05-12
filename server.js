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
    console.error("ERROR PARAMÉDICOS:", err);
    res.status(500).json([]);
  }
});

/* ===============================
   REGISTRAR SALIDA + PACIENTE
=============================== */
app.post('/ambulancia/salida', async (req, res) => {
  try {
    const { ubicacion, paciente, personal, en_camino } = req.body;

    console.log("BODY RECIBIDO /ambulancia/salida:", req.body);

    if (!paciente) {
      return res.status(400).json({
        ok: false,
        mensaje: "No se recibió paciente"
      });
    }

    const { data: salida, error: errorSalida } = await supabase
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

    if (errorSalida) {
      console.error("ERROR INSERT SALIDA:", errorSalida);
      throw errorSalida;
    }

    console.log("SALIDA INSERTADA:", salida);

    const { data: pacienteInsertado, error: errorPaciente } = await supabase
      .from('paciente')
      .insert({
        id_salida: salida.id_salida,
        ...paciente
      })
      .select();

    if (errorPaciente) {
      console.error("ERROR INSERT PACIENTE:", errorPaciente);
      throw errorPaciente;
    }

    console.log("PACIENTE INSERTADO:", pacienteInsertado);

    if (paciente.escala_glasgow) {
      const { error: errorGlasgow } = await supabase
        .from('signos_vitales')
        .insert({
          id_salida: salida.id_salida,
          escala_glasgow: paciente.escala_glasgow,
          fecha: new Date().toISOString()
        });

      if (errorGlasgow) {
        console.error("ERROR INSERT GLASGOW:", errorGlasgow);
        throw errorGlasgow;
      }
    }

    if (personal?.chofer && personal?.paramedico) {
      const { data: paramedicosInsertados, error: errorParamedicos } = await supabase
        .from('salida_paramedicos')
        .insert([
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
        ])
        .select();

      if (errorParamedicos) {
        console.error("ERROR INSERT PARAMÉDICOS:", errorParamedicos);
        throw errorParamedicos;
      }

      console.log("PARAMÉDICOS INSERTADOS:", paramedicosInsertados);
    } else {
      console.warn("PARAMÉDICOS NO INSERTADOS: chofer o paramédico vacío");
    }

    res.json({
      ok: true,
      id_salida: salida.id_salida
    });

  } catch (err) {
    console.error("ERROR GENERAL /ambulancia/salida:", err);

    res.status(500).json({
      ok: false,
      mensaje: err.message || "Error al registrar salida"
    });
  }
});

/* ===============================
   ACTUALIZAR SIGNOS MANUALES
=============================== */
app.put('/paciente/signos', async (req, res) => {
  try {
    const {
      id_salida,
      presion_diastolica,
      presion_sistolica,
      frecuencia_respiratoria
    } = req.body;

    const { error: errorPaciente } = await supabase
      .from('paciente')
      .update({
        presion_diastolica,
        presion_sistolica,
        frecuencia_respiratoria
      })
      .eq('id_salida', id_salida);

    if (errorPaciente) throw errorPaciente;

    const { error: errorSignos } = await supabase
      .from('signos_vitales')
      .insert({
        id_salida,
        presion_diastolica,
        presion_sistolica,
        frecuencia_respiratoria,
        fecha: new Date().toISOString()
      });

    if (errorSignos) throw errorSignos;

    res.json({ ok: true });

  } catch (err) {
    console.error("ERROR SIGNOS MANUALES:", err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

/* ===============================
   ACTUALIZAR GLASGOW
=============================== */
app.put('/paciente/glasgow', async (req, res) => {
  try {
    const { id_salida, escala_glasgow } = req.body;

    const { error: errorPaciente } = await supabase
      .from('paciente')
      .update({ escala_glasgow })
      .eq('id_salida', id_salida);

    if (errorPaciente) throw errorPaciente;

    const { error: errorSignos } = await supabase
      .from('signos_vitales')
      .insert({
        id_salida,
        escala_glasgow,
        fecha: new Date().toISOString()
      });

    if (errorSignos) throw errorSignos;

    res.json({ ok: true });

  } catch (err) {
    console.error("ERROR GLASGOW:", err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

/* ===============================
   ACTUALIZAR HEMORRAGIA
=============================== */
app.put('/paciente/hemorragia', async (req, res) => {
  try {
    const { id_salida, hemorragia } = req.body;

    const { error } = await supabase
      .from('paciente')
      .update({ hemorragia })
      .eq('id_salida', id_salida);

    if (error) throw error;

    res.json({ ok: true });

  } catch (err) {
    console.error("ERROR HEMORRAGIA:", err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

/* ===============================
   ACTIVAR / DESACTIVAR MONITOREO
=============================== */
app.put('/salida/monitoreo', async (req, res) => {
  try {
    const { id_salida, monitoreo_activo } = req.body;

    const { error } = await supabase
      .from('salida')
      .update({ monitoreo_activo: Boolean(monitoreo_activo) })
      .eq('id_salida', id_salida);

    if (error) throw error;

    res.json({ ok: true });

  } catch (err) {
    console.error("ERROR MONITOREO:", err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

/* ===============================
   ESP32 – DATOS INDEPENDIENTES
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

    if (!salida) {
      return res.json({
        ok: true,
        guardado: false,
        mensaje: "Monitoreo inactivo"
      });
    }

    const id_salida = salida.id_salida;

    const { data: ultimo } = await supabase
      .from('signos_vitales')
      .select('*')
      .eq('id_salida', id_salida)
      .order('fecha', { ascending: false })
      .limit(1)
      .single();

    const datosInsertar = {
      id_salida,
      fecha: new Date().toISOString(),
      spo2: spo2 ?? ultimo?.spo2 ?? null,
      frecuencia_cardiaca: frecuencia_cardiaca ?? ultimo?.frecuencia_cardiaca ?? null,
      temperatura: temperatura ?? ultimo?.temperatura ?? null
    };

    const { error } = await supabase
      .from('signos_vitales')
      .insert(datosInsertar);

    if (error) {
      console.error("ERROR INSERT ESP32:", error);
      return res.status(500).json({ ok: false, mensaje: error.message });
    }

    res.json({
      ok: true,
      guardado: true,
      datos: datosInsertar
    });

  } catch (err) {
    console.error("ERROR ESP32:", err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

/* ===============================
   SALIDA COMPLETA
=============================== */
app.get('/salidas/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const { data: salida, error: errorSalida } = await supabase
      .from('salida')
      .select('id_salida, fecha, ubicacion, en_camino, monitoreo_activo')
      .eq('id_salida', id)
      .single();

    if (errorSalida) {
      console.error("ERROR GET SALIDA:", errorSalida);
      throw errorSalida;
    }

    const { data: paciente, error: errorPaciente } = await supabase
      .from('paciente')
      .select('*')
      .eq('id_salida', id)
      .maybeSingle();

    if (errorPaciente) {
      console.error("ERROR GET PACIENTE:", errorPaciente);
      throw errorPaciente;
    }

    const { data: paramedicos, error: errorParamedicos } = await supabase
      .from('salida_paramedicos')
      .select(`rol_en_la_salida, paramedicos(nombre, apellido)`)
      .eq('id_salida', id);

    if (errorParamedicos) {
      console.error("ERROR GET PARAMÉDICOS:", errorParamedicos);
      throw errorParamedicos;
    }

    res.json({
      ...salida,
      paciente: paciente || null,
      salida_paramedicos: paramedicos || []
    });

  } catch (err) {
    console.error("ERROR /salidas/:id:", err);
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

    const { data, error } = await supabase
      .from('salida')
      .select('id_salida, fecha, ubicacion, en_camino')
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('fecha', { ascending: false });

    if (error) throw error;

    res.json(data || []);

  } catch (err) {
    console.error("ERROR HISTORIAL FECHA:", err);
    res.status(500).json([]);
  }
});

/* ===============================
   HISTORIAL DE SIGNOS
=============================== */
app.get('/historial/signos/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('signos_vitales')
      .select('*')
      .eq('id_salida', req.params.id)
      .order('fecha', { ascending: false });

    if (error) throw error;

    res.json(data || []);

  } catch (err) {
    console.error("ERROR HISTORIAL SIGNOS:", err);
    res.status(500).json([]);
  }
});

/* ===============================
   ÚLTIMO SIGNO VITAL
=============================== */
app.get('/signos/ultimo/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('signos_vitales')
      .select('*')
      .eq('id_salida', req.params.id)
      .order('fecha', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    res.json(data || {});

  } catch (err) {
    console.error("ERROR ÚLTIMO SIGNO:", err);
    res.status(500).json({});
  }
});

/* =====================================================
   🚑 ESTADO AMBULANCIAS COMPLETO – PACIENTES + SIGNOS
===================================================== */
app.get('/clinica/ambulancias', async (req, res) => {
  try {
    const { data: salidas, error } = await supabase
      .from('salida')
      .select('*')
      .eq('estado', 'en curso')
      .order('fecha', { ascending: false });

    if (error) throw error;

    const resultado = await Promise.all(
      (salidas || []).map(async (s) => {
        const { data: paciente } = await supabase
          .from('paciente')
          .select('*')
          .eq('id_salida', s.id_salida)
          .maybeSingle();

        const { data: signos } = await supabase
          .from('signos_vitales')
          .select('*')
          .eq('id_salida', s.id_salida)
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle();

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
    console.error("ERROR CLÍNICA AMBULANCIAS:", err);
    res.status(500).json([]);
  }
});

/* ===============================
   AUTH / ME
=============================== */
/* ===============================
   AUTH / ME
=============================== */
app.get('/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        ok: false,
        mensaje: 'No se recibió token'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    const { data: userData, error } = await supabaseAuth.auth.getUser(token);

    if (error || !userData?.user) {
      return res.status(401).json({
        ok: false,
        mensaje: 'Token inválido o sesión expirada'
      });
    }

    const auth_uid = userData.user.id;

    const { data: usuario, error: usuarioError } = await supabase
      .from('usuarios')
      .select('id_usuario, email, tipo_rol, auth_uid')
      .eq('auth_uid', auth_uid)
      .single();

    if (usuarioError || !usuario) {
      return res.status(403).json({
        ok: false,
        mensaje: 'Usuario autenticado, pero no registrado en la tabla usuarios'
      });
    }

    res.json({
      ok: true,
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      tipo_rol: usuario.tipo_rol,
      auth_uid: usuario.auth_uid
    });

  } catch (err) {
    console.error("ERROR AUTH ME:", err);
    res.status(500).json({
      ok: false,
      mensaje: 'Error interno en autenticación'
    });
  }
});

/* ===============================
   MANTENIMIENTO - VALIDAR TÉCNICO
=============================== */
async function validarMantenimiento(req, res) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ ok: false, mensaje: 'No se recibió token' });
    return null;
  }

  const token = authHeader.replace('Bearer ', '');

  const { data: userData, error } = await supabaseAuth.auth.getUser(token);

  if (error || !userData?.user) {
    res.status(401).json({ ok: false, mensaje: 'Token inválido o sesión expirada' });
    return null;
  }

  const { data: usuario, error: usuarioError } = await supabase
    .from('usuarios')
    .select('id_usuario, email, tipo_rol')
    .eq('auth_uid', userData.user.id)
    .single();

  if (usuarioError || !usuario || usuario.tipo_rol !== 'mantenimiento') {
    res.status(403).json({ ok: false, mensaje: 'Usuario no autorizado para mantenimiento' });
    return null;
  }

  return usuario;
}

/* ===============================
   MANTENIMIENTO - ESTADO DISPOSITIVOS
=============================== */
app.get('/mantenimiento/estado', async (req, res) => {
  try {
    const usuario = await validarMantenimiento(req, res);
    if (!usuario) return;

    const { data, error } = await supabase
      .from('estado_dispositivos')
      .select('*')
      .order('dispositivo', { ascending: true });

    if (error) throw error;

    res.json({ ok: true, estados: data || [] });

  } catch (err) {
    console.error('ERROR /mantenimiento/estado:', err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

/* ===============================
   MANTENIMIENTO - GUARDAR ESTADO DESDE ESP32
=============================== */
app.post('/mantenimiento/estado', async (req, res) => {
  try {
    const {
      dispositivo,
      wifi_conectado,
      servidor_conectado,
      led_wifi,
      led_envio,
      uart_ok,
      i2c_ok,
      oled_ok,
      sensor_ok,
      rssi,
      ultimo_spo2,
      ultima_fc,
      ultima_temperatura,
      monitoreo_activo
    } = req.body;

    if (!['oximetria', 'temperatura'].includes(dispositivo)) {
      return res.status(400).json({ ok: false, mensaje: 'Dispositivo inválido' });
    }

    const { data, error } = await supabase
      .from('estado_dispositivos')
      .upsert({
        dispositivo,
        wifi_conectado,
        servidor_conectado,
        led_wifi,
        led_envio,
        uart_ok,
        i2c_ok,
        oled_ok,
        sensor_ok,
        rssi,
        ultimo_spo2,
        ultima_fc,
        ultima_temperatura,
        monitoreo_activo,
        ultima_actualizacion: new Date().toISOString()
      }, {
        onConflict: 'dispositivo'
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ ok: true, estado: data });

  } catch (err) {
    console.error('ERROR POST /mantenimiento/estado:', err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

/* ===============================
   MANTENIMIENTO - GUARDAR LOG
=============================== */
app.post('/mantenimiento/log', async (req, res) => {
  try {
    const usuario = await validarMantenimiento(req, res);
    if (!usuario) return;

    const {
      dispositivo,
      modulo,
      prueba,
      resultado,
      detalle
    } = req.body;

    const { data, error } = await supabase
      .from('mantenimiento_logs')
      .insert({
        id_usuario: usuario.id_usuario,
        dispositivo,
        modulo,
        prueba,
        resultado,
        detalle
      })
      .select()
      .single();

    if (error) throw error;

    res.json({ ok: true, log: data });

  } catch (err) {
    console.error('ERROR /mantenimiento/log:', err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

/* ===============================
   MANTENIMIENTO - HISTORIAL LOGS
=============================== */
app.get('/mantenimiento/logs', async (req, res) => {
  try {
    const usuario = await validarMantenimiento(req, res);
    if (!usuario) return;

    const { data, error } = await supabase
      .from('mantenimiento_logs')
      .select(`
        id_mantenimiento,
        dispositivo,
        modulo,
        prueba,
        resultado,
        detalle,
        creado_en,
        usuarios(email)
      `)
      .order('creado_en', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({ ok: true, logs: data || [] });

  } catch (err) {
    console.error('ERROR /mantenimiento/logs:', err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});

/* ===============================
   MANTENIMIENTO - GUÍA DE FALLAS
=============================== */
app.get('/mantenimiento/fallas', async (req, res) => {
  try {
    const usuario = await validarMantenimiento(req, res);
    if (!usuario) return;

    const { data, error } = await supabase
      .from('mantenimiento_fallas')
      .select('*')
      .order('dispositivo', { ascending: true });

    if (error) throw error;

    res.json({ ok: true, fallas: data || [] });

  } catch (err) {
    console.error('ERROR /mantenimiento/fallas:', err);
    res.status(500).json({ ok: false, mensaje: err.message });
  }
});
/* ===============================
   START SERVER
=============================== */
app.listen(5001, () => {
  console.log('✅ Servidor listo en https://ambulink.doc-ia.cloud');
});