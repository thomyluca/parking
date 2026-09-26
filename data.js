// Listas de patentes que entran GRATIS.
// Fuentes: "Mesas VIP - Día de la Primavera" (PDF), "Listado final de cumpleaños" (PDF),
// cortesías / amigos de Roberto (WhatsApp + audios de Bruno) y Mesa 9 Caro Medici (WhatsApp).

const SEED_GROUPS = [
  // ───────── MESAS VIP ─────────
  { tipo: 'mesa', nombre: 'Mesa 1 · Fernando Domene', nota: 'Sin cargo, todo enviado',
    patentes: ['AB161ZA', 'AF548TZ', 'MFF491'] },
  { tipo: 'mesa', nombre: 'Mesa 2 · Patricia Reynoso', nota: 'Mesa sin consumo: incluye SOLO 1 estacionamiento',
    patentes: ['PCE554'] },
  { tipo: 'mesa', nombre: 'Mesa 3 · Claudio Zampaglione', nota: 'Reserva común',
    patentes: ['OCJ283', 'AD271MX', 'AC486XU'] },
  { tipo: 'mesa', nombre: 'Mesa 5 · Mónica Gagliardi', nota: 'Cumples: Andrea Chávez y Paola Chaves. Total 5 estacionamientos',
    patentes: ['MXC057', 'OFU935', 'KOY527', 'AD500GW', 'MXB812'] },
  { tipo: 'mesa', nombre: 'Mesa 7 · Carla Carolina Fernández', nota: 'Cumples: Andrea Recupero, Norma González y Romina Martín',
    patentes: ['LKI021', 'OKY193', 'JEI467', 'AB875KQ', 'AF609CI'] },
  { tipo: 'mesa', nombre: 'Mesa 9 · Caro Medici', nota: 'Reserva común',
    patentes: ['AC668BD', 'AC167UN', 'AC334FP', 'FGJ423', 'OJB558', 'AH020EV', 'AD964AI'] },
  { tipo: 'mesa', nombre: 'Mesa 10 · Diego Marasia', nota: 'Cumples: Diego Marasia y Carla Vázquez. 6 estacionamientos',
    patentes: ['NTT306', 'AD929BH', 'AF775VZ', 'MOI265', 'AD472GR', 'AE815LL'] },
  { tipo: 'mesa', nombre: 'Mesa 11 · Sergio Cipoletti', nota: 'Incluye estacionamiento extra para camioneta Honda',
    patentes: ['IVG448', 'SEP1614', 'JTG676', 'AE210JG'] },
  { tipo: 'mesa', nombre: 'Mesa 12 · Romina Mayor', nota: 'Reserva común',
    patentes: ['AA788UI', 'HZO610', 'KER910'] },

  // ───────── CUMPLEAÑOS INDIVIDUALES ─────────
  { tipo: 'cumple', nombre: 'Abril Gómez', patentes: ['AD620OW'] },
  { tipo: 'cumple', nombre: 'Ana Fernández', nota: 'Patente actualizada', patentes: ['AH568XZ'] },
  { tipo: 'cumple', nombre: 'Carlos Castro', nota: 'Reservó Sabry Gisell', patentes: ['AE671UW'] },
  { tipo: 'cumple', nombre: 'Cintia Janowski', nota: 'Patente actualizada', patentes: ['AF651TX'] },
  { tipo: 'cumple', nombre: 'Claudia Correa', patentes: ['AE590KK'] },
  { tipo: 'cumple', nombre: 'Daiana Cabral', nota: 'PATENTE PENDIENTE: no la informó todavía', patentes: [] },
  { tipo: 'cumple', nombre: 'Diego Oscar González', nota: 'Reservó Vane Gargiu', patentes: ['KDO400'] },
  { tipo: 'cumple', nombre: 'Graciela Coria', nota: 'Reservó Gisela Herrera', patentes: ['AC097WI'] },
  { tipo: 'cumple', nombre: 'Javier De Salvo', patentes: ['JZN574'] },
  { tipo: 'cumple', nombre: 'Laura Abós', patentes: ['IHJ183'] },
  { tipo: 'cumple', nombre: 'Lucía Bonifacio', patentes: ['IUX592'] },
  { tipo: 'cumple', nombre: 'Marcela Merola', patentes: ['IZM133'] },
  { tipo: 'cumple', nombre: 'Mariana Espósito', patentes: ['HNY268'] },
  { tipo: 'cumple', nombre: 'Mónica Grossi', patentes: ['AA714KG'] },
  { tipo: 'cumple', nombre: 'Natalia Lobruto', patentes: ['JWJ659'] },
  { tipo: 'cumple', nombre: 'Nicolás Fiare', patentes: ['OYP137'] },
  { tipo: 'cumple', nombre: 'Raúl Cena', patentes: ['GWO678'] },
  { tipo: 'cumple', nombre: 'Rosana Mariela', patentes: ['MBM773'] },
  { tipo: 'cumple', nombre: 'Rubén Oviedo', patentes: ['AE617CP'] },
  { tipo: 'cumple', nombre: 'Sergio Zurita', patentes: ['EJP703'] },
  { tipo: 'cumple', nombre: 'Silvia Cortés', patentes: ['HVA791'] },
  { tipo: 'cumple', nombre: 'Stella Pombo', patentes: ['AH035BJ'] },
  { tipo: 'cumple', nombre: 'Vero Barbalia', patentes: ['LEC599'] },
  { tipo: 'cumple', nombre: 'Walter Medina', patentes: ['AF021BO'] },
  { tipo: 'cumple', nombre: 'Yamila Sosa', nota: 'Reservó Facundo Vera', patentes: ['GBY053'] },
  { tipo: 'cumple', nombre: 'Yanina Arcos', patentes: ['AC889DV'] },

  // ───────── CUMPLEAÑOS AGRUPADOS SIN MESA VIP (reserva Juan Marcarie) ─────────
  { tipo: 'cumple', nombre: 'Juan Marcarie', nota: 'Reserva Marcarie (3 cumples, NO es mesa VIP)', patentes: ['OFF850'] },
  { tipo: 'cumple', nombre: 'Alejandro Méndez', nota: 'Reserva Marcarie (3 cumples, NO es mesa VIP)', patentes: ['AB026UP'] },
  { tipo: 'cumple', nombre: 'Fernando Lobos', nota: 'Reserva Marcarie (3 cumples, NO es mesa VIP)', patentes: ['ONT555'] },

  // ───────── CORTESÍAS (invitados) ─────────
  { tipo: 'cortesia', nombre: 'Amigos de Roberto', nota: 'Amigos del tío de Bruno', patentes: ['HEE508', 'AC104AM', 'AB610GK', 'PBU880', 'AE637BG', 'AA275ZK', 'AB722GP', 'PEW948'] },
  { tipo: 'cortesia', nombre: 'Gabi del Kiosco MB', nota: 'Patente PROVISORIA (cartel de papel)', patentes: ['SEZ7977'] },
];
