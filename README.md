# TOQUIN APP v0.1

PWA para los toquijefes.

- Camila: horario quincenal por áreas, equipo editable, cena diaria, tarifas por turno, cálculo de nómina, ingresos, pagos adicionales, estado pagado, retiro e historial.
- Copia de mensaje con los turnos y cenas para generar imagen del horario.
- Luisda: pegar lista WhatsApp, convertir renglones, marcar comprados, borrar y crear nueva lista.
- Persistencia local por navegador. PWA instalable con shell offline.

Los datos NO se sincronizan entre dispositivos todavía. `config.js` contiene los campos `supabaseUrl` y `supabasePublishableKey` para la fase siguiente; además habrá que configurar auth, tablas y políticas RLS. No colocar service_role/secret key en el frontend.

GitHub Pages: en Settings > Pages seleccionar GitHub Actions como fuente. Workflow incluido en `.github/workflows/pages.yml`.
