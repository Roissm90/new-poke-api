# PokéAtlas

Web de Pokemon con HTML, SCSS y JavaScript/jQuery. Consulta la API publica de
PokeAPI directamente desde el navegador. No requiere base de datos ni claves.

## Arranque

Requisitos: Node.js 20.18.1 o superior, npm y conexion a Internet.

```sh
npm install
npm run dev
```

Abre http://localhost:3000. Si el puerto esta ocupado:

```sh
PORT=3001 npm run dev
```

Si ya estan instaladas las dependencias y no ha cambiado el archivo de bloqueo,
no es necesario repetir `npm install`. Para instalaciones reproducibles usa
`npm ci`. No abras el HTML mediante `file://`: los modulos necesitan un servidor.

## Compartir

El servidor incluye metadatos Open Graph y Twitter en el HTML de Inicio y de
las paginas, sin depender de JavaScript. La tarjeta muestra `PokéAtlas`, una
descripcion del atlas y la ilustracion oficial de un Pokemon aleatorio del
catalogo actual (1.025 especies). La misma imagen se utiliza en ambos formatos.

Al publicar, indica el origen HTTPS real para las URLs canonicas y sociales:

```sh
PUBLIC_URL=https://pokeatlas.example npm start
```

Sustituye ese dominio de ejemplo por el de tu web. `localhost` no es accesible
para WhatsApp, Telegram o las redes sociales. Estos metadatos requieren servir
la web con `server.cjs`; un hosting solo estatico no ejecuta esta generacion.
El servidor elige una imagen por respuesta, pero las plataformas guardan sus
propias previews en cache: volver a compartir el mismo enlace no garantiza que
cambie la imagen. Las ilustraciones se sirven desde el repositorio de sprites
de PokeAPI en GitHub; la web debe permitir acceso publico a las paginas.

## Desarrollo

```sh
npm run scss
npm run build
npm test
```

`scss` observa ambos SCSS; `build` regenera el CSS base y el tema Atlas; `test` ejecuta
las pruebas con el runner integrado de Node.js.
El tema visual compartido se edita en `styles/atlas.scss`, con selectores anidados
y propiedades en lineas separadas. `styles/atlas.css` es generado por Sass y no
debe editarse directamente. Se carga despues de `styles/styles.css` para mantener
la cascada existente. Tras editar SCSS ejecuta `npm run build`, o manten
`npm run scss` activo para compilar al guardar. El CSS generado permite navegar
sin ejecutar una compilacion en cada arranque.

## Interfaz y movimiento

Las entradas comparten un desplazamiento vertical de 24 px, opacidad de 0 a 1 y
duracion de 900 ms con aceleracion gradual y frenado suave, sin retardos por tarjeta.
Cabeceras, filtros, grupos de resultados, paginacion, fichas, paneles de combate
y pie de pagina se animan como bloques: sus textos, controles e imagenes entran juntos.
Los catalogos se revelan al terminar de cargar, tambien al cambiar pagina o filtros;
si estan fuera de pantalla, esperan hasta entrar en el viewport. Las animaciones
pendientes del mismo bloque se reemplazan para evitar acumulaciones.
`scripts/motion.js` centraliza AOS y las apariciones dinamicas;
`styles/atlas.scss` contiene las variables comunes. Modales, paneles de pistas
y cambios de actividad usan ese mismo patron. No hay entradas independientes
de tarjetas, botones, mensajes o ilustraciones.
Se respeta `prefers-reduced-motion`; las animaciones funcionales de carrera,
danio y barras de vida no se sustituyen por animaciones de entrada.

Habilidades y movimientos usan celdas iguales y pasan de cuatro columnas a tres,
dos o una segun el espacio disponible. Las habilidades se ordenan alfabeticamente
en espanol. Movimientos muestra paginas de 20 desde un indice local, sin descargar
las 937 fichas de la API antes de mostrar resultados. El indice conserva nombres
espanoles, tipos y numeros reales de MT de Escarlata/Purpura; los movimientos sin
MT van despues, por identificador. La busqueda por nombre o MT recorre todo el
catalogo de inmediato. Solo se descarga el detalle al abrir un modal, con cache,
reintento y proteccion contra respuestas antiguas. Los modales gestionan el foco
y lo restauran al cerrar.
El menu compacto se activa hasta 1024 px.

El indice versionado `data/moves-index.json` se genera desde los CSV publicos de
PokeAPI mediante `npm run update:moves-index`. Esta actualizacion es manual y
requiere Internet; no forma parte del arranque de la web. El script usa un parser
CSV y deriva las MT del identificador del objeto, no del ID de la maquina.

La portada usa la marca PokéAtlas, sin punto final. La navegacion muestra solo
una Poke Ball SVG, con nombre accesible, tambien presente en el reverso de Parejas.
La mitad superior usa el mismo rojo del borde y el centro es negro.
Los contadores de portada usan Odometer y los totales `count` publicados por
PokeAPI para `pokemon-species` y `generation`, con `limit=1`. Pokemon cuenta
especies sin duplicar formas alternativas. Tipos cuenta los registros de la
lista `type` (paginas de 100), excluyendo `stellar`, `unknown` y `shadow` para
mostrar los tipos habituales. Si la API pagina la lista, se recorren sus paginas.
No dependen del limite de 1.025 del catalogo ni de cifras escritas en el HTML.
Muestran `--` mientras cargan; un error ofrece reintentar sin inventar valores.
Los digitos se deslizan durante dos segundos al entrar en pantalla, con ancho
reservado y etiquetas accesibles. Con movimiento reducido muestran los totales
recibidos directamente, sin animacion. Sin JavaScript conservan los marcadores.
Los iconos generales son SVG Lucide, con trazo y dimensiones compartidos en
`scripts/icons.js`. Se importan solo los iconos necesarios desde la dependencia
local. Menu, cierre, audio, paginacion, carrusel, controles de juego y favicon
usan SVG. Las ilustraciones y sprites Pokemon siguen siendo imagenes raster.

La preferencia de musica se guarda en `localStorage` (`pokeatlas:music`) y se
restaura al navegar, tanto activada como desactivada. Cada pagina inicia su MIDI
si estaba activada; combate usa `battle.mid` y las demas `intro.mid`. La posicion
de cada pista se conserva en `sessionStorage` al salir o apagarla y se retoma
al entrar, sin volver al principio. Se recupera la duracion restante de las notas
que estaban sonando. La recarga entre documentos todavia puede producir una breve
pausa: el contexto de audio no permanece vivo entre paginas HTML independientes.
Si el navegador bloquea la reproduccion automatica, se reintenta en la primera
interaccion de puntero o teclado, sin volver a activar el boton. Apagar cancela
los sintetizadores, el bucle y cualquier inicio pendiente.
El boton refleja el estado real, no solo la preferencia: apagado, cargando,
pendiente de permiso, reproduciendo o error. Solo muestra ondas y estado pulsado
cuando el contexto esta ejecutandose y las notas han sido programadas. Si esta
pendiente ofrece reanudar; si falla, reintentar; durante la carga permite cancelar.
Las peticiones tienen tiempo limite, se cancelan al apagar y no se reutilizan
descargas abortadas. La suspension del contexto detiene el bucle y su reanudacion
recupera las notas restantes. Los cambios de preferencia entre pestanas tambien
se sincronizan.

Los tipos usan los 18 SVG de Espada/Escudo publicados por WikiDex, almacenados en
`assets/types` sin modificar. `scripts/type-badges.mjs` normaliza nombres ingleses
y espanoles y genera simbolos circulares de 32 px, con nombre accesible y tooltip.
Se usan en filtros, fichas, galeria, movimientos, combate y pistas de Adivina;
las pistas siguen ocultas hasta revelarse. Procedencia y derechos se detallan en
[assets/types/README.md](assets/types/README.md).

La galeria llega a ambos bordes del viewport: cinco tarjetas visibles en escritorio
y tres por debajo de 991 px, con la primera y la ultima cortadas a la mitad.
Los nombres usan mayuscula inicial y los controles caben en una sola fila en
movil estrecho. Las imagenes conservan su proporcion y la tarjeta central no
amplifica ni recorta su ilustracion.

## Carga de la Pokedex

- Un indice ligero conserva los 1.025 nombres e identificadores del catalogo.
- Cada pagina muestra 20 Pokemon, con un maximo de 6 peticiones simultaneas.
- La siguiente pagina se precarga en segundo plano, incluidos sus dibujos.
- Las respuestas y peticiones pendientes se reutilizan durante la visita.
- Busqueda y filtros operan sobre todo el catalogo, no solo la pagina visible.
- Las traducciones de habilidades se consultan al abrir una ficha.
- Errores de red tienen reintento y respuestas antiguas no reemplazan nuevos filtros.

La precarga reduce la espera, pero no garantiza latencia cero si se avanza antes
de completarla. El catalogo conserva el limite original de la generacion IX.
La portada presenta una seleccion de diez legendarios, no un ranking exhaustivo.
El constructor de equipos ya estaba desactivado en el proyecto original y
conserva su redireccion al inicio. No se ofrece como funcion disponible.

## Carga de combate

La seleccion usa el mismo indice, cola de seis peticiones, cache y paginas de
20 Pokemon que la Pokedex. La siguiente pagina se precarga y la busqueda por
nombre o numero recorre todo el catalogo. Abrir una ficha no descarga movimientos.

Al pulsar Entrenar se busca un rival distinto con una diferencia maxima de cinco
puntos en la suma de estadisticas. Se comprueban candidatos en bloques de 20,
sin descargar sus especies, habilidades ni movimientos. Si no existe una pareja
se usa otro Pokemon disponible, como antes. Para especies con pocos rivales la
busqueda puede requerir mas consultas de estadisticas; su progreso es visible.

Solo entonces se cargan especies, habilidades y movimientos por nivel del jugador
y del rival, conservando los datos que necesita la preparacion del combate.
Cerrar la ficha cancela la seleccion; los errores permiten reintentar y solo se
navega a la preparacion cuando ambos Pokemon estan listos.

La preparacion descarta ataques sin potencia y permite seleccionar hasta cuatro,
o todos los disponibles si hay menos. La confirmacion puede volver a abrirse sin
perder la seleccion. La CPU utiliza exclusivamente los ataques preparados y
consume sus PP. Los controles quedan bloqueados durante el turno completo y al
finalizar la batalla. Los ataques muestran nombre, tipo y PP; el estado anuncia
el turno y su resultado. La bonificacion por tipo usa los tipos del atacante.
Entrar sin seleccion o sin ataques utilizables ofrece volver a elegir Pokemon.
El combate conserva un modelo simplificado, no un simulador oficial completo.

## Modales y actividades

Los modales comparten cierre por boton, fondo y Escape, foco contenido y
restauracion del foco. El contenido largo tiene desplazamiento interno. Las
imagenes Pokemon conservan su proporcion y los tipos usan etiquetas compactas.
La preparacion distribuye ataques en dos columnas, o una en movil; el resultado
del combate muestra la ilustracion oficial del ganador.

Las cuatro actividades se inicializan al abrir su pestaña, no todas a la vez.
Adivina gestiona carga, errores, generaciones y reinicio; las pistas admiten
teclado. Parejas cancela el temporizador de una partida anterior al reiniciar.
Evoluciones ofrece seleccion por clic o teclado ademas de arrastrar y limita
la busqueda de candidatos. Carrera reutiliza la cola de seis peticiones, cancela
la partida anterior y mantiene los sprites dentro de la pista al llegar.
Las apariciones dejan una opacidad final visible, incluso con movimiento reducido.

## Verificacion

`npm test` cubre carga, orden de catalogos, datos y etiquetas de combate y la
regresion de visibilidad. Se revisaron los cinco modales activos en escritorio
y movil: seleccion Pokemon, preparacion, resultado, habilidad y movimiento.
Los de actividad y equipo se previsualizaron como plantillas; no tienen un flujo
activo y el constructor de equipos sigue deshabilitado.

Se recorrieron busqueda/ficha, filtros/paginacion, un combate completo y estados
de acierto, derrota y reinicio de las actividades. El navegador compartido
bloqueaba la estabilidad de clics y fotogramas; algunas comprobaciones usaron
eventos DOM y la carrera uso fotogramas controlados. Esto verifica las transiciones
de estado, no la fluidez en tiempo real ni todos los posibles enfrentamientos.

## Dependencias externas

jQuery, AOS, Slick, Tone.js y fuentes se sirven desde CDN; datos e ilustraciones
dependen de PokeAPI y su repositorio de sprites. Es necesaria conexion a Internet.
El servidor incluido esta pensado para desarrollo local, no para produccion.
El repositorio original versiona `node_modules`; una instalacion o actualizacion
puede generar cambios en esos archivos. Lo recomendable en una futura limpieza
del repositorio es versionar el archivo de bloqueo, no las dependencias instaladas.
Pokemon pertenece a sus respectivos titulares; este es un proyecto no oficial.