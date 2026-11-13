/* =====================================================================
   Configuración de cada mini app de personal municipal.
   Para cambiar opciones de un formulario, editar solo este archivo.
   Tipos de campo: texto, numero, textarea, select, patente
   ===================================================================== */
const svg = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;

export const AREAS_APP = {
  transito: {
    nombre: "Tránsito", personal: "Agentes de Tránsito",
    color: "#ea580c", oscuro: "#b84306", claro: "#fff1e8",
    icono: svg('<rect x="7" y="2" width="10" height="20" rx="3"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="17" r="1.6"/>'),
    resolver: { boton: "📝 Labrar infracción", titulo: "Labrar infracción", guardar: "Guardar infracción",
                estado: "Infracción labrada", ok: "Infracción guardada" },
    sinAccion: { boton: "✔ Verificado: sin infracción", estado: "Verificado sin infracción",
                 motivos: ["El vehículo ya no estaba", "No constituye infracción", "No se encontró la dirección", "Denuncia duplicada", "Otro"] },
    campos: [
      { id: "patente", label: "Patente", tipo: "patente", requerido: true },
      { id: "vehiculo", label: "Vehículo", tipo: "select", opciones: ["Auto", "Camioneta", "Moto", "Camión", "Utilitario", "Otro"], medio: true },
      { id: "color", label: "Color", tipo: "texto", placeholder: "Ej: Gris", medio: true },
      { id: "marca", label: "Marca y modelo", tipo: "texto", placeholder: "Ej: Fiat Cronos" },
      { id: "infraccion", label: "Infracción", tipo: "select", requerido: true, opciones: [
        "Estacionamiento en lugar prohibido", "Estacionamiento en doble fila", "Estacionamiento sobre la vereda",
        "Estacionamiento en rampa para personas con discapacidad", "Obstrucción de garage / entrada de vehículos",
        "Estacionamiento en parada de colectivo", "Vehículo abandonado en la vía pública",
        "Estacionamiento medido sin abonar", "Circular en contramano", "Ruidos molestos / escape libre", "Otra"] },
      { id: "acta", label: "N° de acta (si corresponde)", tipo: "numero" },
      { id: "observaciones", label: "Observaciones", tipo: "textarea", placeholder: "Detalle de lo constatado" },
    ],
    fotoLabel: "Foto del vehículo / constatación",
    resumen: c => c.patente,
  },

  policial: {
    nombre: "Policial", personal: "Personal Policial",
    color: "#1d4ed8", oscuro: "#1e3a8a", claro: "#e8efff",
    icono: svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M12 7.5l1.3 2.7 3 .4-2.2 2 .6 3-2.7-1.5-2.7 1.5.6-3-2.2-2 3-.4z"/>'),
    resolver: { boton: "📝 Registrar intervención", titulo: "Registrar intervención", guardar: "Guardar intervención",
                estado: "Intervención registrada", ok: "Intervención guardada" },
    sinAccion: { boton: "✔ Verificado: sin novedad", estado: "Verificado sin novedad",
                 motivos: ["No se constató el hecho", "Las personas ya no estaban", "Falsa alarma", "No se encontró la dirección", "Denuncia duplicada", "Otro"] },
    campos: [
      { id: "hecho", label: "Hecho constatado", tipo: "select", requerido: true, opciones: [
        "Robo / hurto", "Daño a la propiedad", "Riña / disturbios", "Violencia de género o familiar",
        "Persona sospechosa", "Ruidos molestos", "Consumo en la vía pública", "Otro"] },
      { id: "resultado", label: "Resultado", tipo: "select", requerido: true, opciones: [
        "Se labró acta", "Aprehensión / detención", "Derivado a fiscalía", "Intervención de otro organismo",
        "Se brindó asistencia", "Otro"] },
      { id: "personas", label: "Personas involucradas (nombre / DNI)", tipo: "textarea" },
      { id: "acta", label: "N° de acta / sumario", tipo: "texto" },
      { id: "observaciones", label: "Observaciones", tipo: "textarea" },
    ],
    fotoLabel: "Foto (opcional)",
    resumen: c => c.hecho,
  },

  residuos: {
    nombre: "Residuos", personal: "Personal de Residuos",
    color: "#d91c90", oscuro: "#a8136f", claro: "#fbe6f2",
    icono: svg('<path d="M3 6h18"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>'),
    resolver: { boton: "🧹 Registrar trabajo realizado", titulo: "Trabajo realizado", guardar: "Guardar trabajo",
                estado: "Trabajo realizado", ok: "Trabajo registrado" },
    sinAccion: { boton: "✔ Verificado: no requiere trabajo", estado: "Sin trabajo necesario",
                 motivos: ["Ya estaba limpio", "Corresponde al día de recolección", "No se encontró la dirección", "Denuncia duplicada", "Otro"] },
    campos: [
      { id: "problema", label: "Problema encontrado", tipo: "select", requerido: true, opciones: [
        "Basural / microbasural", "Residuos no recolectados", "Contenedor desbordado o roto",
        "Carpido / ramas sin retirar", "Animal muerto", "Escombros", "Otro"] },
      { id: "accion", label: "Qué se hizo", tipo: "select", requerido: true, opciones: [
        "Se retiraron los residuos", "Se limpió el lugar", "Se programó camión / retiro",
        "Se notificó al frentista", "Se labró infracción al frentista", "Otro"] },
      { id: "volumen", label: "Volumen retirado", tipo: "select", opciones: ["—", "Menos de 1 m³", "1 a 3 m³", "Más de 3 m³"] },
      { id: "acta", label: "N° de acta (si se labró infracción)", tipo: "numero" },
      { id: "observaciones", label: "Observaciones", tipo: "textarea" },
    ],
    fotoLabel: "Foto de cómo quedó",
    resumen: c => c.accion,
  },

  "espacio-verde": {
    nombre: "Espacio verde", personal: "Personal de Espacios Verdes",
    color: "#15803d", oscuro: "#14532d", claro: "#e3f5ea",
    icono: svg('<path d="M12 22v-6"/><path d="M12 16c-4 0-7-2.5-7-6 0-3 2.5-5 4-5.5C9.5 2.5 11 2 12 2s2.5.5 3 2.5c1.5.5 4 2.5 4 5.5 0 3.5-3 6-7 6z"/>'),
    resolver: { boton: "🌳 Registrar trabajo realizado", titulo: "Trabajo realizado", guardar: "Guardar trabajo",
                estado: "Trabajo realizado", ok: "Trabajo registrado" },
    sinAccion: { boton: "✔ Verificado: no requiere trabajo", estado: "Sin trabajo necesario",
                 motivos: ["No se constató el problema", "Corresponde a un frentista / privado", "No se encontró la dirección", "Denuncia duplicada", "Otro"] },
    campos: [
      { id: "problema", label: "Problema encontrado", tipo: "select", requerido: true, opciones: [
        "Árbol caído o con riesgo de caída", "Poda / ramas que obstruyen", "Pasto alto",
        "Juegos o bancos dañados", "Riego / pérdida de agua", "Iluminación de plaza", "Otro"] },
      { id: "lugar", label: "Plaza o espacio verde", tipo: "texto", placeholder: "Ej: Plaza Belgrano" },
      { id: "accion", label: "Qué se hizo", tipo: "select", requerido: true, opciones: [
        "Se realizó la poda", "Se retiró el árbol / ramas", "Se cortó el pasto", "Se reparó",
        "Se programó el trabajo", "Se derivó a otra área", "Otro"] },
      { id: "observaciones", label: "Observaciones", tipo: "textarea" },
    ],
    fotoLabel: "Foto de cómo quedó",
    resumen: c => c.problema,
  },

  otros: {
    nombre: "Otros", personal: "Atención al Vecino",
    color: "#6b7280", oscuro: "#374151", claro: "#f1f2f4",
    icono: svg('<circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/>'),
    resolver: { boton: "📋 Registrar gestión", titulo: "Registrar gestión", guardar: "Guardar gestión",
                estado: "Gestionada", ok: "Gestión registrada" },
    sinAccion: { boton: "✔ Cerrar sin gestión", estado: "Cerrada sin gestión",
                 motivos: ["No corresponde al municipio", "No se pudo constatar", "Denuncia duplicada", "Otro"] },
    campos: [
      { id: "categoria", label: "Tema", tipo: "select", requerido: true, opciones: [
        "Alumbrado público", "Calles / baches", "Agua / cloacas", "Animales sueltos", "Ruidos molestos",
        "Obras particulares", "Otro"] },
      { id: "derivada", label: "Derivada a", tipo: "select", opciones: [
        "No se derivó", "Obras Públicas", "Servicios Públicos", "Zoonosis", "Inspección General", "Desarrollo Social", "Otra área"] },
      { id: "gestion", label: "Qué se hizo", tipo: "textarea", requerido: true },
    ],
    fotoLabel: "Foto (opcional)",
    resumen: c => c.categoria,
  },
};
