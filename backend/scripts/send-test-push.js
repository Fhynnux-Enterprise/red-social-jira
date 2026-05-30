const fs = require('fs');
const path = require('path');
const https = require('https');
const { Client } = require('pg');

// 1. Cargar variables de entorno del archivo .env del backend
function loadEnv() {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) {
        console.warn('⚠️ No se encontró el archivo .env en la raíz del backend. Se usarán valores predeterminados.');
        return {};
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] ? match[2].trim() : '';
            if (value.startsWith('"') && value.endsWith('"')) {
                value = value.substring(1, value.length - 1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
                value = value.substring(1, value.length - 1);
            }
            env[match[1]] = value;
        }
    });
    return env;
}

const env = loadEnv();

// Helper para convertir rutas relativas de imágenes de la BD a URLs completas
function resolveUrl(url, fallbackUrl = '') {
    if (!url) return fallbackUrl;
    if (url.startsWith('http') || url.startsWith('file://')) return url;
    // URL base de producción/desarrollo del backend
    const serverUrl = env.SERVER_URL || 'https://canton-enterprise-production.up.railway.app';
    return `${serverUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

// 2. Parsear argumentos de la línea de comandos
const args = process.argv.slice(2);
let title = null;
let body = null;
let image = null;
let avatar = null;
let token = null;
let postId = null;
let postType = 'POST_DETAIL';

// Ayuda / Help
if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Uso del script de prueba de notificaciones push:
  node send-test-push.js [opciones]

Opciones:
  --title "Texto"      Título de la notificación (por defecto: Título del Post real o default)
  --body "Texto"       Cuerpo de la notificación (por defecto: Contenido del Post real o default)
  --image "URL"        URL de la imagen grande a expandir (por defecto: Imagen del Post real o default)
  --avatar "URL"       URL del avatar pequeño de perfil (por defecto: Avatar del Autor real o default)
  --token "ExpoToken"  Especificar token manualmente (si no se pone, se lee el último de la BD)
  --postId "ID"        ID de la publicación para probar el redireccionamiento
  --postType "TIPO"    Tipo de publicación (POST_DETAIL, STORE_DETAIL, JOB_DETAIL, SERVICE_DETAIL)
    `);
    process.exit(0);
}

for (let i = 0; i < args.length; i++) {
    if (args[i] === '--title' && args[i+1]) {
        title = args[i+1];
        i++;
    } else if (args[i] === '--body' && args[i+1]) {
        body = args[i+1];
        i++;
    } else if (args[i] === '--image' && args[i+1]) {
        image = args[i+1];
        i++;
    } else if (args[i] === '--avatar' && args[i+1]) {
        avatar = args[i+1];
        i++;
    } else if (args[i] === '--token' && args[i+1]) {
        token = args[i+1];
        i++;
    } else if (args[i] === '--postId' && args[i+1]) {
        postId = args[i+1];
        i++;
    } else if (args[i] === '--postType' && args[i+1]) {
        postType = args[i+1];
        i++;
    }
}

async function main() {
    const dbConfig = {
        host: env.DB_HOST || 'localhost',
        port: parseInt(env.DB_PORT || '5432', 10),
        user: env.DB_USERNAME,
        password: env.DB_PASSWORD,
        database: env.DB_DATABASE,
    };

    const client = new Client(dbConfig);
    
    try {
        console.log('🔌 Conectando a la base de datos PostgreSQL...');
        await client.connect();

        // A. Obtener el token de dispositivo si no se especificó uno manual
        if (!token) {
            console.log('📱 Buscando el último token de celular registrado...');
            const resToken = await client.query('SELECT token FROM device_tokens ORDER BY "lastUsedAt" DESC LIMIT 1;');
            if (resToken.rows.length === 0) {
                console.error('❌ No se encontró ningún token en la tabla "device_tokens". Abre la app en tu celular primero.');
                process.exit(1);
            }
            token = resToken.rows[0].token;
            console.log(`📱 Token de destino: ${token}`);
        }

        // B. Si no se especificó postId, ni imagen, buscar una publicación real con imagen en la BD
        if (!postId && !image) {
            console.log('🔍 Buscando una publicación real con imágenes en la base de datos...');
            const postQuery = `
                SELECT 
                    p.id AS "postId", 
                    p.title AS "title", 
                    p.content AS "content", 
                    pm.url AS "imageUrl", 
                    u.photo_url AS "authorAvatarUrl",
                    u.first_name AS "authorFirstName",
                    u.last_name AS "authorLastName"
                FROM posts p
                INNER JOIN post_media pm ON pm.post_id = p.id
                INNER JOIN users u ON u.id = p.user_id
                WHERE pm.deleted_at IS NULL AND p.deleted_at IS NULL
                ORDER BY p.created_at DESC
                LIMIT 1;
            `;
            const resPost = await client.query(postQuery);

            if (resPost.rows.length > 0) {
                const realPost = resPost.rows[0];
                postId = realPost.postId;
                postType = 'POST_DETAIL';
                
                const authorName = `${realPost.authorFirstName} ${realPost.authorLastName || ''}`.trim();
                
                if (!title) {
                    title = realPost.title || `Nueva publicación de ${authorName} 📝`;
                }
                if (!body) {
                    body = realPost.content || 'Pulsa para ver los detalles de esta publicación.';
                    if (body.length > 100) {
                        body = body.substring(0, 97) + '...';
                    }
                }
                image = resolveUrl(realPost.imageUrl);
                avatar = resolveUrl(realPost.authorAvatarUrl, `https://ui-avatars.com/api/?name=${encodeURIComponent(authorName)}&background=FF6524&color=fff`);
                console.log(`✅ ¡Publicación real encontrada! ID: ${postId} de ${authorName}`);
            } else {
                console.log('⚠️ No se encontraron publicaciones con imágenes en "posts". Buscando en productos de la tienda...');
                // Fallback a productos de tienda
                const storeQuery = `
                    SELECT 
                        sp.id AS "productId", 
                        sp.title AS "title", 
                        sp.description AS "description", 
                        sm.url AS "imageUrl", 
                        u.photo_url AS "sellerAvatarUrl",
                        u.first_name AS "sellerFirstName"
                    FROM store_products sp
                    INNER JOIN store_media sm ON sm.store_product_id = sp.id
                    INNER JOIN users u ON u.id = sp.seller_id
                    WHERE sp.is_available = true
                    ORDER BY sp.created_at DESC
                    LIMIT 1;
                `;
                const resStore = await client.query(storeQuery);
                if (resStore.rows.length > 0) {
                    const realProduct = resStore.rows[0];
                    postId = realProduct.productId;
                    postType = 'STORE_DETAIL';
                    if (!title) title = `¡Producto en Venta!: ${realProduct.title} 🛍️`;
                    if (!body) {
                        body = realProduct.description || 'Mira este nuevo producto disponible.';
                        if (body.length > 100) body = body.substring(0, 97) + '...';
                    }
                    image = resolveUrl(realProduct.imageUrl);
                    avatar = resolveUrl(realProduct.sellerAvatarUrl, `https://ui-avatars.com/api/?name=${encodeURIComponent(realProduct.sellerFirstName)}&background=2490FF&color=fff`);
                    console.log(`✅ ¡Producto real encontrado! ID: ${postId}`);
                }
            }
        }

    } catch (err) {
        console.error('⚠️ Error consultando la base de datos:', err.message);
    } finally {
        await client.end();
    }

    // C. Configurar valores por defecto finales si no se encontró nada en la BD
    if (!postId) postId = 'test-post-id-123';
    if (!title) title = '¡Notificación de Prueba! 🚀';
    if (!body) body = 'Este mensaje fue enviado desde la PC con la app cerrada.';
    if (!image) image = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&auto=format&fit=crop&q=60';
    if (!avatar) avatar = 'https://ui-avatars.com/api/?name=Admin&background=FF6524&color=fff&size=150';

    // 4. Enviar notificación push a través de la API de Expo
    console.log('\n✉️ Payload definitivo de la notificación push:');
    console.log(`- Título: "${title}"`);
    console.log(`- Mensaje: "${body}"`);
    console.log(`- Avatar (Large Icon): ${avatar}`);
    console.log(`- Imagen (Big Picture): ${image}`);
    console.log(`- Post ID: ${postId} (${postType})`);

    const payload = JSON.stringify({
        to: token,
        title: title,
        body: body,
        sound: 'default',
        priority: 'high',
        channelId: 'default',
        data: {
            type: postType,
            postId: postId,
            image: image,
            authorAvatarUrl: avatar,
            detailed: 'false',
        },
        image: image, // Estándar Expo
        richContent: {
            image: image,
        },
        mutableContent: true,
    });

    const options = {
        hostname: 'exp.host',
        port: 443,
        path: '/--/api/v2/push/send',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
        }
    };

    console.log('\n📡 Enviando petición HTTPS a Expo...');
    const req = https.request(options, res => {
        let responseData = '';
        res.on('data', chunk => {
            responseData += chunk;
        });
        res.on('end', () => {
            try {
                const parsed = JSON.parse(responseData);
                if (parsed.data && parsed.data[0] && parsed.data[0].status === 'ok') {
                    console.log('🚀 ¡Notificación enviada con éxito! Revisa tu celular. 🎉');
                } else {
                    console.error('❌ Expo rechazó el envío:', JSON.stringify(parsed, null, 2));
                }
            } catch (e) {
                console.log('Respuesta recibida:', responseData);
            }
        });
    });

    req.on('error', error => {
        console.error('❌ Error de red al enviar la push notification:', error);
    });

    req.write(payload);
    req.end();
}

main().catch(err => console.error(err));
