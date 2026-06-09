const path = require('path');
const vision = require('@google-cloud/vision');

// Ruta a las credenciales desde la carpeta 'backend/scripts' (ahora en la raíz de la carpeta backend)
const credentialsPath = path.join(__dirname, '..', 'chunchi-city-app-e88b94b3bbd4.json');

console.log('--- Probando Google Cloud Vision API ---');
console.log(`Cargando credenciales desde: ${credentialsPath}`);

// Inicializar el cliente de Google Cloud Vision
const client = new vision.ImageAnnotatorClient({
  keyFilename: credentialsPath,
});

// Imagen de prueba por defecto (un gato tierno) o la que pases por argumento
const defaultImageUrl = 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500';
const targetImage = process.argv[2] || defaultImageUrl;

async function runTest() {
  console.log(`\nAnalizando imagen: ${targetImage}\n`);

  try {
    console.log('1. Solicitando análisis a Google Cloud...');
    
    // Ejecutamos análisis de Safe Search y Detección de Etiquetas simultáneamente
    const [safeSearchResult] = await client.safeSearchDetection(targetImage);
    const [labelResult] = await client.labelDetection(targetImage);

    console.log('¡Respuesta recibida exitosamente!\n');

    // --- RESULTADOS DE SAFE SEARCH ---
    const safeSearch = safeSearchResult.safeSearchAnnotation;
    console.log('=============================================');
    console.log('🛡️ RESULTADOS DE MODERACIÓN (Safe Search)');
    console.log('=============================================');
    if (safeSearch) {
      console.log(`🔞 Contenido Adulto (Adult):      ${safeSearch.adult}`);
      console.log(`🩺 Contenido Médico (Medical):    ${safeSearch.medical}`);
      console.log(`🎭 Parodia/Alterado (Spoof):      ${safeSearch.spoof}`);
      console.log(`🔪 Contenido Violento (Violence):  ${safeSearch.violence}`);
      console.log(`👙 Contenido Sugerente (Racy):     ${safeSearch.racy}`);
      
      console.log('\nInterpretación de niveles:');
      console.log('- VERY_UNLIKELY / UNLIKELY: Seguro.');
      console.log('- POSSIBLE: Moderadamente sospechoso (evaluar según política).');
      console.log('- LIKELY / VERY_LIKELY: Altamente probable (se debe bloquear).');
      
      const isAdult = safeSearch.adult === 'LIKELY' || safeSearch.adult === 'VERY_LIKELY';
      const isViolence = safeSearch.violence === 'LIKELY' || safeSearch.violence === 'VERY_LIKELY';
      
      console.log('\n---------------------------------------------');
      if (isAdult || isViolence) {
        console.log('❌ VERDICTO: ESTA IMAGEN DEBE SER BLOQUEADA.');
      } else {
        console.log('✅ VERDICTO: La imagen es segura para subir.');
      }
      console.log('---------------------------------------------\n');
    } else {
      console.log('No se recibieron anotaciones de moderación.');
    }

    // --- RESULTADOS DE ETIQUETAS ---
    const labels = labelResult.labelAnnotations;
    console.log('=============================================');
    console.log('🏷️ ETIQUETAS DETECTADAS EN LA IMAGEN');
    console.log('=============================================');
    if (labels && labels.length > 0) {
      labels.forEach(label => {
        console.log(`- ${label.description} (Precisión: ${(label.score * 100).toFixed(1)}%)`);
      });
    } else {
      console.log('No se detectaron etiquetas.');
    }
    console.log('=============================================\n');

  } catch (error) {
    console.error('❌ Error ejecutando la prueba:');
    console.error(error);
  }
}

runTest();
