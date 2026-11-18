/* TOQUIN APP · Intro de carga: Luisda (Toquijefe) y Camila (Toquijefa). */
(()=>{
const splash=document.getElementById('splash');
if(!splash)return;
splash.style.animation='none';
splash.style.background='radial-gradient(85% 60% at 50% 38%,#ffa257,#f47721 55%,#b9480f)';
splash.removeAttribute('aria-hidden');
splash.setAttribute('role','img');splash.setAttribute('aria-label','Intro de Toquín');
if(!document.getElementById('toqFont')){const l=document.createElement('link');l.id='toqFont';l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&display=swap';document.head.appendChild(l);}
splash.innerHTML='<svg id="toqIntroSvg" viewBox="0 0 360 640" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;display:block"></svg>';

const GROUND=478,BASE=478;
const LUISDA=`
<ellipse cx="2" cy="2" rx="34" ry="7" fill="#5a1f00" opacity=".28"/>
<g transform="scale(1)">
 <!-- pierna de apoyo (izquierda de él) -->
 <path d="M1 -66 L23 -66 Q26 -38 24 -12 L4 -12 Q1 -38 1 -66Z" fill="url(#jeans)"/>
 <path d="M13 -62 Q14 -38 13 -16" stroke="#6f93b8" stroke-width="1.3" fill="none" opacity=".7"/>
 <path d="M4 -16 Q14 -13 24 -16" stroke="#9cbcdc" stroke-width="2" fill="none"/>
 <path d="M1 -13 Q-2 -2 3 0 L31 0 Q37 0 36 -6 Q34 -13 22 -14 L8 -15 Q3 -15 1 -13Z" fill="url(#shoeB)"/>
 <path d="M2 -1.5 L35 -1.5" stroke="#3d3d44" stroke-width="2.4" stroke-linecap="round"/>
 <path d="M12 -12 L20 -12 M13 -9 L21 -9" stroke="#2f2f35" stroke-width="1.2"/>
 <!-- pierna derecha: jean doblado bajo la rodilla -->
 <path d="M-23 -66 L-1 -66 L-2 -44 Q-12 -38 -22 -44Z" fill="url(#jeans)"/>
 <path d="M-22 -47 Q-12 -41 -2 -47 L-2 -40 Q-12 -33 -22 -40Z" fill="#a9c6e2"/>
 <path d="M-22 -40 Q-12 -33 -2 -40" stroke="#7c9fc3" stroke-width="1.2" fill="none"/>
 <!-- cuerpo -->
 <path d="M-28 -124 Q-33 -94 -26 -62 L26 -62 Q33 -94 28 -124 Q15 -133 0 -133 Q-15 -133 -28 -124Z" fill="url(#leather)"/>
 <path d="M-10 -128 L10 -128 L11 -64 L-11 -64Z" fill="url(#tee)"/>
 <path d="M-9 -128 Q0 -121 9 -128" stroke="#d8d1c6" stroke-width="2.2" fill="none"/>
 <path d="M-11 -125 L-12 -64 M11 -125 L12 -64" stroke="#a7acb1" stroke-width="1.6"/>
 <path d="M-11 -128 L-23 -127 L-13 -110Z M11 -128 L23 -127 L13 -110Z" fill="#2a1912"/>
 <path d="M-24 -116 Q-27 -92 -22 -72" stroke="#8a6650" stroke-width="3.5" opacity=".45" fill="none" stroke-linecap="round"/>
 <path d="M22 -116 Q25 -98 21 -80" stroke="#8a6650" stroke-width="2.5" opacity=".35" fill="none" stroke-linecap="round"/>
 <path d="M-26 -66 L26 -66" stroke="#20140e" stroke-width="5" stroke-linecap="round"/>
 <g id="lArmL"><path d="M-27 -124 Q-40 -118 -40 -100 L-38 -78 L-27 -78 L-25 -104Z" fill="url(#leather)"/><path d="M-39 -82 L-27 -82" stroke="#20140e" stroke-width="3"/><ellipse cx="-33" cy="-73" rx="6.5" ry="7.5" fill="url(#skinL)"/></g>
 <g id="lArmR"><path d="M27 -124 Q40 -118 40 -100 L38 -78 L27 -78 L25 -104Z" fill="url(#leather)"/><path d="M39 -82 L27 -82" stroke="#20140e" stroke-width="3"/><ellipse cx="33" cy="-73" rx="6.5" ry="7.5" fill="url(#skinL)"/></g>
 <!-- cabeza -->
 <g id="lHead"><g transform="translate(0 -128) scale(1.22) translate(0 128)">
  <rect x="-8" y="-142" width="16" height="16" rx="4" fill="#c88a62"/>
  <ellipse cx="-31" cy="-160" rx="6" ry="9" fill="#d89a70"/><ellipse cx="31" cy="-160" rx="6" ry="9" fill="#d89a70"/>
  <ellipse cx="-31" cy="-160" rx="2.5" ry="4.5" fill="#b97a52"/><ellipse cx="31" cy="-160" rx="2.5" ry="4.5" fill="#b97a52"/>
  <path d="M-31 -166 Q-32 -132 -17 -125 Q0 -118 17 -125 Q32 -132 31 -166 Q31 -198 0 -198 Q-31 -198 -31 -166Z" fill="url(#skinL)"/>
  <path d="M-31 -166 Q-32 -132 -17 -125 Q-27 -140 -27 -166Z" fill="#b97a52" opacity=".25"/>
  <path d="M-31 -164 Q-34 -201 0 -204 Q34 -201 31 -164 Q30 -178 25 -183 Q12 -190 0 -188 Q-13 -190 -25 -183 Q-30 -178 -31 -164Z" fill="url(#hairL)"/>
  <path d="M-31 -164 Q-31 -176 -27 -182 L-25 -168Z M31 -164 Q31 -176 27 -182 L25 -168Z" fill="#3a2a22" opacity=".55"/>
  <path d="M-14 -199 Q0 -205 14 -199" stroke="#5a4335" stroke-width="2" fill="none" opacity=".6"/>
  <path d="M-21 -173 Q-13 -179 -5 -175" stroke="#1d130e" stroke-width="4.5" fill="none" stroke-linecap="round" id="lBrowL"/>
  <path d="M5 -175 Q13 -179 21 -173" stroke="#1d130e" stroke-width="4.5" fill="none" stroke-linecap="round" id="lBrowR"/>
  <ellipse cx="-13" cy="-161" rx="8.5" ry="9.5" fill="#fff"/><ellipse cx="13" cy="-161" rx="8.5" ry="9.5" fill="#fff"/>
  <g id="lPupils"><circle cx="-13" cy="-160" r="5.6" fill="url(#iris)"/><circle cx="13" cy="-160" r="5.6" fill="url(#iris)"/><circle cx="-13" cy="-160" r="2.6" fill="#120a06"/><circle cx="13" cy="-160" r="2.6" fill="#120a06"/><circle cx="-15" cy="-162.5" r="1.8" fill="#fff"/><circle cx="11" cy="-162.5" r="1.8" fill="#fff"/></g>
  <path d="M-22 -164 Q-13 -172 -4 -164 M4 -164 Q13 -172 22 -164" stroke="#3a2418" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M-2 -155 Q-5 -146 -6 -142 Q0 -139 6 -142" stroke="#b46f47" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <ellipse cx="-19" cy="-142" rx="6" ry="3.5" fill="#e98a6e" opacity=".35"/><ellipse cx="19" cy="-142" rx="6" ry="3.5" fill="#e98a6e" opacity=".35"/>
  <g id="lSmile"><path d="M-14 -136 Q0 -122 14 -136 Q0 -131 -14 -136Z" fill="#6b241a"/>
  <path d="M-12 -135.3 Q0 -131.2 12 -135.3 L11 -132.6 Q0 -129.4 -11 -132.6Z" fill="#fff"/></g>
  <g id="lO" opacity="0"><ellipse cx="0" cy="-131" rx="7" ry="9" fill="#5a1d14"/><ellipse cx="0" cy="-126" rx="4.5" ry="3" fill="#c4544a"/><path d="M-6 -138 Q0 -140.5 6 -138" stroke="#fff" stroke-width="2" fill="none"/></g>
  <path d="M-16 -137 Q-15 -134 -13 -134 M16 -137 Q15 -134 13 -134" stroke="#a8643f" stroke-width="1.6" fill="none" stroke-linecap="round"/>
 </g></g>
</g>`;
const CAMILA=`
<ellipse cx="0" cy="2" rx="30" ry="6.5" fill="#5a1f00" opacity=".28"/>
<g transform="scale(.97)">
 <g id="cLegL"><path d="M-15 -74 L-1 -74 L-3 -18 L-12 -18 Q-17 -46 -15 -74Z" fill="url(#legg)"/>
  <rect x="-13" y="-20" width="11" height="9" rx="2" fill="#f7f4ee"/><path d="M-13 -17 L-2 -17 M-13 -14.5 L-2 -14.5" stroke="#2c2522" stroke-width="1.2"/>
  <path d="M-17 -11 Q-19 -1 -14 0 L6 0 Q10 0 9 -4 Q7 -10 -1 -11Z" fill="#1d1a19"/><path d="M-11 -9 L-5 -3 M-8 -10 L-2 -4" stroke="#fff" stroke-width="1.6"/><path d="M-18 -1 L9 -1" stroke="#b8865a" stroke-width="2.2" stroke-linecap="round"/></g>
 <g id="cLegR"><path d="M1 -74 L15 -74 Q17 -46 12 -18 L3 -18Z" fill="url(#legg)"/>
  <rect x="2" y="-20" width="11" height="9" rx="2" fill="#f7f4ee"/><path d="M2 -17 L13 -17 M2 -14.5 L13 -14.5" stroke="#2c2522" stroke-width="1.2"/>
  <path d="M0 -11 Q-2 -1 3 0 L23 0 Q27 0 26 -4 Q24 -10 16 -11Z" fill="#1d1a19"/><path d="M6 -9 L12 -3 M9 -10 L15 -4" stroke="#fff" stroke-width="1.6"/><path d="M-1 -1 L26 -1" stroke="#b8865a" stroke-width="2.2" stroke-linecap="round"/></g>
 <path d="M-16 -80 L16 -80 L15 -70 L-15 -70Z" fill="#4a2019"/>
 <!-- camisa amarilla oversize -->
 <path d="M-24 -118 Q-32 -96 -30 -70 Q-18 -64 -6 -72 L0 -80 L6 -72 Q18 -64 30 -70 Q32 -96 24 -118 Q12 -127 0 -127 Q-12 -127 -24 -118Z" fill="url(#shirt)"/>
 <path d="M0 -126 L0 -80" stroke="#d9cf86" stroke-width="1.5"/><circle cx="2" cy="-114" r="1.3" fill="#c9bd70"/><circle cx="2" cy="-102" r="1.3" fill="#c9bd70"/><circle cx="2" cy="-90" r="1.3" fill="#c9bd70"/>
 <path d="M-8 -127 L-17 -124 L-6 -112Z M8 -127 L17 -124 L6 -112Z" fill="#fbf6c9" stroke="#d9cf86" stroke-width="1"/>
 <path d="M-26 -104 Q-28 -88 -26 -74" stroke="#d6cb7f" stroke-width="2" fill="none" opacity=".7"/>
 <!-- bolso -->
 <path d="M16 -122 L-24 -84" stroke="#5a3a2a" stroke-width="3"/>
 <path d="M-34 -90 Q-36 -74 -24 -72 Q-14 -72 -14 -84 Q-16 -94 -26 -94 Q-33 -94 -34 -90Z" fill="url(#bag)"/>
 <g id="cArmL"><path d="M-24 -120 Q-35 -115 -36 -100 L-35 -94 L-24 -94 L-22 -108Z" fill="url(#shirt)"/><path d="M-35.5 -96 L-24 -96" stroke="#e3d88e" stroke-width="4"/><path d="M-34 -94 L-33 -78 L-26 -78 L-25 -94Z" fill="url(#skinC)"/><ellipse cx="-29.5" cy="-74" rx="5.5" ry="6.5" fill="url(#skinC)"/></g>
 <g id="cArmR"><path d="M24 -120 Q35 -115 36 -100 L35 -94 L24 -94 L22 -108Z" fill="url(#shirt)"/><path d="M35.5 -96 L24 -96" stroke="#e3d88e" stroke-width="4"/><path d="M34 -94 L33 -78 L26 -78 L25 -94Z" fill="url(#skinC)"/><path d="M25 -82 L34 -82 M25.5 -79.5 L33.5 -79.5" stroke="#e3b23c" stroke-width="1.6"/><ellipse cx="29.5" cy="-74" rx="5.5" ry="6.5" fill="url(#skinC)"/></g>
 <!-- cabeza -->
 <g id="cHead"><g transform="translate(0 -126) scale(1.22) translate(0 126)">
  <path d="M-31 -158 Q-40 -128 -30 -112 Q-22 -106 -16 -114 L16 -114 Q22 -106 30 -112 Q40 -128 31 -158Z" fill="url(#hairC)"/>
  <rect x="-6.5" y="-136" width="13" height="14" rx="4" fill="#e3ad8b"/>
  <path d="M-27 -164 Q-28 -134 -14 -127 Q0 -121 14 -127 Q28 -134 27 -164 Q27 -192 0 -192 Q-27 -192 -27 -164Z" fill="url(#skinC)"/>
  <circle cx="-27" cy="-150" r="2.2" fill="#e3b23c"/><circle cx="27" cy="-150" r="2.2" fill="#e3b23c"/>
  <path d="M-30 -160 Q-36 -196 0 -199 Q36 -196 30 -160 Q30 -146 34 -136 Q24 -144 24 -164 Q20 -180 4 -184 Q-6 -176 -18 -180 Q-26 -172 -26 -158 Q-28 -144 -36 -136 Q-30 -146 -30 -160Z" fill="url(#hairC)"/>
  <path d="M-30 -150 Q-37 -140 -33 -128 M30 -150 Q37 -140 33 -128 M-22 -186 Q-10 -194 4 -190" stroke="#5a3626" stroke-width="2" fill="none" opacity=".7" stroke-linecap="round"/>
  <path d="M-19 -173 Q-12 -177 -5 -174 M5 -174 Q12 -177 19 -173" stroke="#2a1810" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="-11" cy="-160" rx="7.5" ry="8.5" fill="#fff"/><ellipse cx="11" cy="-160" rx="7.5" ry="8.5" fill="#fff"/>
  <g id="cPupils"><circle cx="-11" cy="-159" r="5" fill="url(#iris)"/><circle cx="11" cy="-159" r="5" fill="url(#iris)"/><circle cx="-11" cy="-159" r="2.4" fill="#120a06"/><circle cx="11" cy="-159" r="2.4" fill="#120a06"/><circle cx="-13" cy="-161.5" r="1.7" fill="#fff"/><circle cx="9" cy="-161.5" r="1.7" fill="#fff"/></g>
  <path d="M-19 -163 Q-11 -171 -3 -163 L-1 -166 M3 -163 Q11 -171 19 -163 L21 -166" stroke="#1d120c" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  <path d="M-2 -153 Q-4 -146 -4 -144 Q0 -142 4 -144" stroke="#c98a6a" stroke-width="2" fill="none" stroke-linecap="round"/>
  <ellipse cx="-17" cy="-143" rx="5.5" ry="3.2" fill="#f08a7a" opacity=".45"/><ellipse cx="17" cy="-143" rx="5.5" ry="3.2" fill="#f08a7a" opacity=".45"/>
  <path d="M-13 -138 Q0 -124 13 -138 Q0 -133 -13 -138Z" fill="#8c2f2b"/>
  <path d="M-11 -137.3 Q0 -133.6 11 -137.3 L10 -135 Q0 -131.8 -10 -135Z" fill="#fff"/>
  <path d="M-13 -138 Q0 -124 13 -138" stroke="#b5504a" stroke-width="1.6" fill="none"/>
  <g id="cSun"><rect x="-21" y="-195" width="17" height="11" rx="5" fill="#1a1412"/><rect x="4" y="-195" width="17" height="11" rx="5" fill="#1a1412"/><path d="M-4 -191 Q0 -194 4 -191" stroke="#c9a14a" stroke-width="1.8" fill="none"/><rect x="-19" y="-193" width="6" height="2.5" rx="1.2" fill="#fff" opacity=".35"/><rect x="6" y="-193" width="6" height="2.5" rx="1.2" fill="#fff" opacity=".35"/><path d="M-21 -190 L-27 -188 M21 -190 L27 -188" stroke="#c9a14a" stroke-width="1.6"/></g>
 </g></g>
</g>`;
const PROST=`
 <path d="M-12 -12 Q-15 -2 -10 0 L20 0 Q26 0 25 -5 Q23 -12 12 -13 L-1 -15 Q-9 -15 -12 -12Z" fill="#f4f4f1" stroke="#d2d2cc" stroke-width="1"/>
 <path d="M-12 -2 L25 -2" stroke="#b9b9b2" stroke-width="2.6" stroke-linecap="round"/>
 <path d="M3 -12 L9 -9 M6 -13 L12 -10 M0 -11 L4 -6" stroke="#2b2b2b" stroke-width="1.2" opacity=".7"/>
 <rect x="-3.6" y="-40" width="7.2" height="27" rx="2" fill="url(#metal)"/>
 <rect x="-6.5" y="-46" width="13" height="7" rx="2" fill="#4a5056"/><circle cx="5" cy="-42" r="1.4" fill="#d9dde0"/>
 <path d="M-14 -96 Q-16 -72 -10 -50 Q-6 -45 0 -45 Q6 -45 10 -50 Q16 -72 14 -96 Q0 -100 -14 -96Z" fill="url(#carbon)"/>
 <path d="M-9 -92 Q-11 -72 -6 -54" stroke="#6d6d6d" stroke-width="2.6" fill="none" opacity=".55" stroke-linecap="round"/>
 <path d="M-14 -96 Q0 -100 14 -96" stroke="#3a3a3a" stroke-width="2.4" fill="none"/>`;

const sv=document.getElementById('toqIntroSvg');
sv.innerHTML=`<defs>
 <radialGradient id="bg" cx="50%" cy="38%" r="85%"><stop offset="0" stop-color="#ffa257"/><stop offset=".55" stop-color="#f47721"/><stop offset="1" stop-color="#b9480f"/></radialGradient>
 <radialGradient id="spot" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff2d9" stop-opacity=".55"/><stop offset="1" stop-color="#fff2d9" stop-opacity="0"/></radialGradient>
 <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2631b"/><stop offset="1" stop-color="#a53e0b"/></linearGradient>
 <linearGradient id="letter" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1e2d2"/></linearGradient>
 <linearGradient id="jeans" x1="0" x2="1"><stop offset="0" stop-color="#9fbfe0"/><stop offset=".5" stop-color="#b9d3ec"/><stop offset="1" stop-color="#86a8cc"/></linearGradient>
 <linearGradient id="leather" x1="0" x2="1"><stop offset="0" stop-color="#2a1a13"/><stop offset=".35" stop-color="#4b3226"/><stop offset=".6" stop-color="#3a261d"/><stop offset="1" stop-color="#1f130e"/></linearGradient>
 <linearGradient id="tee" x1="0" x2="1"><stop offset="0" stop-color="#e9e4dc"/><stop offset=".5" stop-color="#fbf9f5"/><stop offset="1" stop-color="#dfd8ce"/></linearGradient>
 <radialGradient id="skinL" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#f0c19e"/><stop offset=".7" stop-color="#dca079"/><stop offset="1" stop-color="#c4875f"/></radialGradient>
 <radialGradient id="skinC" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fbdcc5"/><stop offset=".7" stop-color="#efbf9e"/><stop offset="1" stop-color="#dba584"/></radialGradient>
 <linearGradient id="hairL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a2a21"/><stop offset="1" stop-color="#15100c"/></linearGradient>
 <linearGradient id="hairC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b241a"/><stop offset=".5" stop-color="#22140e"/><stop offset="1" stop-color="#160c08"/></linearGradient>
 <radialGradient id="iris" cx="45%" cy="40%" r="60%"><stop offset="0" stop-color="#9a6a3e"/><stop offset=".7" stop-color="#5a3518"/><stop offset="1" stop-color="#2e1a0b"/></radialGradient>
 <linearGradient id="shirt" x1="0" x2="1"><stop offset="0" stop-color="#ece08f"/><stop offset=".45" stop-color="#fbf4bf"/><stop offset="1" stop-color="#e2d47f"/></linearGradient>
 <linearGradient id="legg" x1="0" x2="1"><stop offset="0" stop-color="#3a1712"/><stop offset=".5" stop-color="#5c2a22"/><stop offset="1" stop-color="#341410"/></linearGradient>
 <linearGradient id="bag" x1="0" x2="1"><stop offset="0" stop-color="#4a2f22"/><stop offset=".5" stop-color="#6e4a37"/><stop offset="1" stop-color="#3c251a"/></linearGradient>
 <linearGradient id="shoeB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2c2c32"/><stop offset="1" stop-color="#121215"/></linearGradient>
 <linearGradient id="metal" x1="0" x2="1"><stop offset="0" stop-color="#7f878f"/><stop offset=".45" stop-color="#eef1f3"/><stop offset="1" stop-color="#6a7279"/></linearGradient>
 <linearGradient id="carbon" x1="0" x2="1"><stop offset="0" stop-color="#151515"/><stop offset=".35" stop-color="#3b3b3b"/><stop offset=".55" stop-color="#232323"/><stop offset="1" stop-color="#0e0e0e"/></linearGradient>
 <filter id="sh" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="5" stdDeviation="3.5" flood-color="#6b2400" flood-opacity=".4"/></filter>
 <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#5a1f00" flood-opacity=".3"/></filter>
</defs>
<rect width="360" height="640" fill="url(#bg)"/>
<path d="M0 ${GROUND-6} Q180 ${GROUND-22} 360 ${GROUND-6} L360 640 L0 640Z" fill="url(#floor)"/>
<ellipse cx="180" cy="${GROUND-70}" rx="190" ry="150" fill="url(#spot)"/>
<ellipse cx="180" cy="${GROUND+4}" rx="150" ry="16" fill="#7a2a00" opacity=".25"/>
<g id="word" filter="url(#sh)" font-family="'Baloo 2',system-ui,sans-serif" font-weight="800" font-size="104" fill="url(#letter)" text-anchor="middle">
 <text x="58" y="${BASE}">T</text><text x="118" y="${BASE}">o</text><text x="176" y="${BASE}">q</text><text x="234" y="${BASE}">u</text><text x="318" y="${BASE}">n</text>
 <g id="iStem"><rect x="-10" y="-68" width="20" height="68" rx="9" fill="url(#letter)"/></g>
 <g id="accent"><path d="M-9 0 L6 -20 Q10 -24 14 -20 L16 -17 Q18 -13 14 -10 L-2 4 Q-6 6 -9 3Z" fill="#fff"/></g>
</g>
<g id="tagline" opacity="0" font-family="'Baloo 2',system-ui,sans-serif" text-anchor="middle">
 <text x="180" y="${BASE+56}" font-size="27" font-weight="800" fill="#fff3df">Comida rápida</text>
 <text x="180" y="${BASE+84}" font-size="13" font-weight="700" fill="#ffd9b0" letter-spacing="2.5">HECHO POR LOS TOQUIJEFES</text>
</g>
<g id="prost" filter="url(#soft)"><g transform="scale(1)">${PROST}</g></g>
<g id="luisda" filter="url(#soft)">${LUISDA}</g>
<g id="camila" filter="url(#soft)">${CAMILA}</g>
<g id="siu" opacity="0"><text x="0" y="0" text-anchor="middle" font-family="'Baloo 2',system-ui,sans-serif" font-weight="800" font-size="62" fill="#fff" stroke="#7a2a00" stroke-width="7" paint-order="stroke" letter-spacing="1">¡SIUUU!</text></g>
<g id="sparkles" opacity="0">${Array.from({length:12},(_,i)=>{const a=i/12*Math.PI*2;return `<path d="M${Math.cos(a)*30} ${Math.sin(a)*30} l2 -6 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2z" fill="${i%2?'#fff3a0':'#fff'}"/>`}).join('')}</g>`;

const $=id=>document.getElementById(id);
const D={x:0,y:0,r:0,sx:1,sy:1,o:1};
const io=s=>s<.5?2*s*s:1-Math.pow(-2*s+2,2)/2;
const tracks={};
function track(id,frames){let cur={...D};tracks[id]=frames.map(([t,v,e])=>{cur={...cur,...v};return [t,{...cur},e||'io']});}
function hop(t0,t1,x0,y0,x1,y1,h,extra={}){const o=[];for(let i=0;i<=10;i++){const s=i/10;o.push([t0+(t1-t0)*s,{x:x0+(x1-x0)*s,y:y0+(y1-y0)*s-h*4*s*(1-s),...extra},'lin']);}return o;}
function at(id,t){const fs=tracks[id];if(t<=fs[0][0])return fs[0][1];for(let i=1;i<fs.length;i++){const [t1,v1,e]=fs[i],[t0,v0]=fs[i-1];if(t<=t1){let s=t1===t0?1:(t-t0)/(t1-t0);s=e==='lin'?s:e==='out'?1-Math.pow(1-s,3):io(s);const o={};for(const k in v1)o[k]=v0[k]+(v1[k]-v0[k])*s;return o;}}return fs[fs.length-1][1];}
const place=(id,v)=>{const el=$(id);el.setAttribute('transform',`translate(${v.x} ${v.y}) rotate(${v.r}) scale(${v.sx} ${v.sy})`);el.setAttribute('opacity',Math.max(0,Math.min(1,v.o)));};
const pivot=(id,v,px,py)=>$(id).setAttribute('transform',`translate(${v.x} ${v.y}) rotate(${v.r} ${px} ${py})`);

const IX=276,ITOP=BASE-68,T=11.3,G=GROUND,S=0.6,S2=S-.9;
const PH=96*.85; // altura de la prótesis colocada
// ---- la í ----
track('iStem',[[0,{x:IX,y:BASE}],[2.4,{}],[2.5,{sy:.62},'out'],[2.9,{}],[3.0,{sy:.25},'out'],[3.28,{}],[3.4,{sy:0,o:0},'out'],[T,{}]]);
track('accent',[[0,{x:IX+2,y:ITOP-10}],[2.4,{}],...hop(2.4,3.5,IX+2,ITOP-10,430,ITOP+60,100).map(([t,v])=>[t,{...v,r:(t-2.4)*620},'lin']),[3.51,{o:0}],[8.25+S2,{x:IX+1,y:BASE-PH-18,r:0,o:0,sx:0,sy:0}],[8.55+S2,{o:1,sx:1.5,sy:1.5},'out'],[8.7+S2,{sx:1,sy:1}],[T,{o:1}]]);
// ---- Luisda: saltos + SIUUU ----
const spin=[[3.42,{sx:1}],[3.55,{sx:.08}],[3.66,{sx:-1}],[3.78,{sx:.08}],[3.92,{sx:1}]];
const jump=hop(3.32,4.05,IX,BASE-68*.25,IX+6,G,150);
track('luisda',[[0,{x:440,y:G}],[.35,{}],
 ...hop(.35,.85,440,G,392,G,36),[.93,{sy:.86,sx:1.1}],[1.01,{sy:1,sx:1}],
 ...hop(1.01,1.5,392,G,346,G,36),[1.58,{sy:.86,sx:1.1}],[1.72,{sy:.76,sx:1.15}],
 ...hop(1.72,2.4,346,G,IX,ITOP,105,{sx:1,sy:1}),[2.5,{y:BASE-68*.62,sy:.84,sx:1.12},'out'],[2.6,{sy:1,sx:1}],
 ...hop(2.6,2.9,IX,BASE-68*.62,IX,BASE-68*.62,42),[3.0,{y:BASE-68*.25,sy:.84,sx:1.12},'out'],[3.12,{sy:1,sx:1}],
 [3.22,{sy:.74,sx:1.18}],[3.32,{sy:1.12,sx:.92},'out'],
 ...jump.map(([t,v])=>{let sx=1;for(let i=1;i<spin.length;i++){const [t0,a]=spin[i-1],[t1,b2]=spin[i];if(t>=t0&&t<=t1){sx=a.sx+(b2.sx-a.sx)*((t-t0)/(t1-t0));}}return [t,{...v,sx,sy:1}, 'lin'];}),
 [4.12,{y:G,sy:.72,sx:1.22},'out'],[4.3,{sy:1.04,sx:.98}],[4.42,{sy:1,sx:1}],
 [5.3,{}],[5.4,{sy:.86,sx:1.08}],
 ...hop(5.45,5.9,IX+6,G,334,G,42,{sx:1,sy:1}),...hop(5.95,6.35,334,G,392,G,42),...hop(6.4,6.8,392,G,460,G,42),[T,{x:460}]]);
track('lArmL',[[0,{r:0}],[1.65,{}],[1.85,{r:70}],[2.4,{r:20}],[3.12,{r:10}],[3.22,{r:-30}],[3.4,{r:140}],[3.95,{r:140}],[4.1,{r:58},'out'],[5.2,{r:58}],[5.4,{r:0}],[T,{}]]);
track('lArmR',[[0,{r:0}],[1.65,{}],[1.85,{r:-70}],[2.4,{r:-20}],[3.12,{r:-10}],[3.22,{r:30}],[3.4,{r:-140}],[3.95,{r:-140}],[4.1,{r:-58},'out'],[5.2,{r:-58}],[5.4,{r:0}],[T,{}]]);
track('lPupils',[[0,{x:-2.5,y:1}],[2.2,{x:-1,y:3}],[3.3,{}],[3.4,{x:0,y:-3}],[4.1,{x:0,y:0}],[5.2,{}],[5.35,{x:3}],[T,{}]]);
track('lHead',[[0,{}],[4.05,{r:0}],[4.15,{r:-6}],[5.2,{r:-6}],[5.35,{r:0}],[T,{}]]);
track('siu',[[0,{x:180,y:250,o:0,sx:.2,sy:.2,r:-10}],[4.08,{}],[4.22,{o:1,sx:1.25,sy:1.25,r:-6},'out'],[4.34,{sx:1,sy:1}],[4.5,{x:176}],[4.6,{x:184}],[4.7,{x:178}],[4.8,{x:180}],[5.15,{o:1}],[5.4,{o:0,y:230}],[T,{}]]);
// ---- Camila + prótesis ----
const CW0=6.2+S,CW1=CW0+.7,CX=IX-66;
track('camila',[[0,{x:-70,y:G}],[CW0,{r:8}],[CW1,{x:CX,r:8},'lin'],[CW1+.15,{r:0}],[8.9+S2,{}],[9.0+S2,{sy:.96}],[9.1+S2,{sy:1}],[9.75+S2,{}],[10.9+S2,{x:430},'lin'],[T,{}]]);
track('cArmR',[[0,{r:-75}],[CW1,{}],[8.0+S2,{r:-110}],[8.25+S2,{r:-95}],[8.45+S2,{r:-125}],[8.6+S2,{r:-60}],[8.8+S2,{r:-150}],[8.95+S2,{r:-140}],[9.15+S2,{r:-165}],[9.3+S2,{r:-150}],[9.45+S2,{r:-165}],[9.7+S2,{r:0}],[T,{}]]);
track('cArmL',[[0,{r:75}],[CW1,{}],[8.2+S2,{r:15}],[8.5+S2,{r:0}],[T,{}]]);
track('cHead',[[0,{}],[8.7+S2,{r:0}],[8.9+S2,{r:5}],[9.6+S2,{r:5}],[9.75+S2,{r:0}],[T,{}]]);
track('cPupils',[[0,{x:2.5}],[7.6+S2,{}],[7.8+S2,{x:3,y:1}],[8.6+S2,{}],[8.75+S2,{x:0,y:0}],[9.7+S2,{}],[9.85+S2,{x:2.5}],[T,{}]]);
track('cSun',[[0,{}],[8.8+S2,{y:0}],[9.0+S2,{y:33},'out'],[T-.6,{}],[T,{y:0}]]);
track('prost',[[0,{x:-70+34,y:G-86,r:-90,sx:.95,sy:.95}],[CW0,{}],[CW1,{x:CX+34},'lin'],[8.0+S2,{x:IX-6,y:G-110,r:-25,sx:1,sy:1}],[8.25+S2,{x:IX-3,y:BASE+4,r:0,sx:.85,sy:.85},'out'],[8.33+S2,{y:BASE,sy:.76,sx:.92}],[8.45+S2,{sy:.85,sx:.85}],[T,{o:1}]]);
track('sparkles',[[0,{x:IX,y:BASE-PH-24,o:0,sx:.3,sy:.3}],[8.3+S2,{}],[8.4+S2,{o:1,sx:.6,sy:.6}],[9.0+S2,{o:0,sx:1.8,sy:1.8},'out'],[T,{}]]);
track('tagline',[[0,{o:0,y:14}],[9.8+S2,{}],[10.3+S2,{o:1,y:0},'out'],[T,{o:1}]]);
track('word',[[0,{o:0,y:-40,sy:1.2,sx:.9}],[.3,{o:1,y:0,sy:.92,sx:1.05},'out'],[.42,{sy:1,sx:1}],[T,{o:1}]]);


const ids=['iStem','accent','luisda','camila','prost','sparkles','tagline','word','siu'];
let t0=null,done=false;
function finish(){if(done)return;done=true;splash.style.transition='opacity .45s';splash.style.opacity='0';setTimeout(()=>splash.remove(),480);}
function frame(now){
  if(done)return;
  if(t0==null)t0=now;
  const t=Math.min((now-t0)/1000*1.3,T);
  ids.forEach(id=>place(id,at(id,t)));
  ['lPupils','cPupils','cSun'].forEach(id=>{const v=at(id,t);$(id).setAttribute('transform',`translate(${v.x} ${v.y})`);});
  pivot('lArmL',at('lArmL',t),-27,-118);pivot('lArmR',at('lArmR',t),27,-118);
  pivot('cArmL',at('cArmL',t),-24,-114);pivot('cArmR',at('cArmR',t),24,-114);
  pivot('lHead',at('lHead',t),0,-130);pivot('cHead',at('cHead',t),0,-128);
  const siuOn=t>4.08&&t<5.25;$('lO').setAttribute('opacity',siuOn?1:0);$('lSmile').setAttribute('opacity',siuOn?0:1);
  const running=t>CW0&&t<CW1,walking=t>9.75+S2&&t<10.9+S2,sw=running?Math.sin(t*30)*40:walking?Math.sin(t*15)*22:0;
  $('cLegL').setAttribute('transform',`rotate(${sw} -8 -72)`);$('cLegR').setAttribute('transform',`rotate(${-sw} 8 -72)`);
  if(t>=T-.05)return finish();
  requestAnimationFrame(frame);
}

const go=()=>{if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches){ids.forEach(id=>place(id,at(id,T)));setTimeout(finish,1500);return;}requestAnimationFrame(frame);};
(document.fonts&&document.fonts.load?Promise.race([document.fonts.load("800 104px 'Baloo 2'"),new Promise(r=>setTimeout(r,900))]):Promise.resolve()).then(go,go);
})();
