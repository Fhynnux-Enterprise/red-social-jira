import { Module } from '@nestjs/common';
// Force restart to sync schema changes for bulk deletion
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GraphQLError } from 'graphql';
import { ScheduleModule } from '@nestjs/schedule';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { join } from 'path';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { PostsModule } from './posts/posts.module';
import { UsersModule } from './users/users.module';
import { CommentsModule } from './comments/comments.module';
import { ChatModule } from './chat/chat.module';
import { FollowsModule } from './follows/follows.module';
import { StorageModule } from './storage/storage.module';
import { StoriesModule } from './stories/stories.module';
import { JobsModule } from './jobs/jobs.module';
import { FeedModule } from './feed/feed.module';
import { StoreModule } from './store/store.module';
import { ReportsModule } from './reports/reports.module';
import { GqlAuthGuard } from './auth/guards/gql-auth.guard';
import { NotificationsModule } from './notifications/notifications.module';
import { AppealsModule } from './appeals/appeals.module';
import { UserBlocksModule } from './user-blocks/user-blocks.module';
import { AdsModule } from './ads/ads.module';
import { AdvertisersModule } from './advertisers/advertisers.module';
import { CitiesModule } from './cities/cities.module';

@Module({
  imports: [
    // 1. Configuración de Variables de Entorno
    ConfigModule.forRoot({
      isGlobal: true, // Esto permite leer las variables en cualquier parte sin importar ConfigModule nuevamente
      envFilePath: '.env', // Ruta al archivo .env (dentro de /backend)
    }),
    ScheduleModule.forRoot(),

    // 2. Configuración de la Base de Datos con TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST', 'localhost'),
        port: configService.get<number>('DB_PORT', 5432),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: false, // Controlado manualmente en dataSourceFactory
      }),
      /**
       * dataSourceFactory nos permite controlar el orden exacto de operaciones:
       * 1. Conectar a la BD
       * 2. Insertar ciudades seed (ANTES del synchronize)
       * 3. Ejecutar synchronize (los FK constraints ya encontrarán 'chunchi')
       *
       * Esto resuelve la race condition de synchronize vs OnApplicationBootstrap.
       */
      dataSourceFactory: async (options) => {
        const dataSource = new DataSource(options as any);
        await dataSource.initialize();

        // ── Paso 1: Crear tabla cities si no existe (idempotente) ──────────
        await dataSource.query(`
          CREATE TABLE IF NOT EXISTS "cities" (
            "id"        VARCHAR PRIMARY KEY,
            "name"      VARCHAR NOT NULL,
            "is_active" BOOLEAN NOT NULL DEFAULT true
          )
        `);

        // ── Paso 2: Insertar ciudades seed (idempotente) ───────────────────
        await dataSource.query(`
          INSERT INTO "cities" ("id", "name", "is_active")
          VALUES 
            ('chunchi', 'Chunchi', true),
            ('alausi', 'Alausí', true)
          ON CONFLICT ("id") DO NOTHING
        `);

        // ── Paso 3: Crear tabla user_tiers si no existe (idempotente) ──────
        await dataSource.query(`
          CREATE TABLE IF NOT EXISTS "user_tiers" (
            "id" VARCHAR(50) PRIMARY KEY,
            "name" VARCHAR(100) NOT NULL,
            "max_carousel_items" INT NOT NULL DEFAULT 10,
            "max_videos" INT NOT NULL DEFAULT 3,
            "max_video_duration" INT NOT NULL DEFAULT 60,
            "max_video_quality" VARCHAR(50) NOT NULL DEFAULT '720p',
            "max_video_bitrate_kbps" INT NOT NULL DEFAULT 3000,
            "max_upload_size_mb" DOUBLE PRECISION NOT NULL DEFAULT 50.0,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        // Garantizar que la columna exista si la tabla ya existía antes de la sincronización
        await dataSource.query(`
          ALTER TABLE "user_tiers" ADD COLUMN IF NOT EXISTS "max_video_bitrate_kbps" INT NOT NULL DEFAULT 3000;
        `);

        // ── Paso 4: Insertar rangos/niveles de usuario por defecto (idempotente) ──
        await dataSource.query(`
          INSERT INTO "user_tiers" ("id", "name", "max_carousel_items", "max_videos", "max_video_duration", "max_video_quality", "max_video_bitrate_kbps", "max_upload_size_mb", "created_at", "updated_at")
          VALUES 
            ('STANDARD', 'Estándar', 10, 3, 60, '720p', 3000, 50.0, NOW(), NOW()),
            ('INTERMEDIATE', 'Creador', 15, 5, 180, '1080p', 5000, 100.0, NOW(), NOW()),
            ('SUPERIOR', 'Premium', 25, 10, 600, '1080p_high', 8000, 500.0, NOW(), NOW())
          ON CONFLICT ("id") DO NOTHING
        `);

        // ── Paso 5: Crear tabla verification_types si no existe (idempotente) ──
        await dataSource.query(`
          CREATE TABLE IF NOT EXISTS "verification_types" (
            "id" VARCHAR(50) PRIMARY KEY,
            "name" VARCHAR(100) NOT NULL,
            "icon_url" VARCHAR(255),
            "description" TEXT,
            "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
          )
        `);

        // ── Paso 6: Insertar tipos de verificación seed (idempotente) ──────
        await dataSource.query(`
          INSERT INTO "verification_types" ("id", "name", "description", "created_at", "updated_at")
          VALUES 
            ('STANDARD', 'Verificado Oficial', 'Cuenta verificada estándar para creadores y usuarios notables', NOW(), NOW())
          ON CONFLICT ("id") DO NOTHING
        `);

        // ── Paso 7: Eliminar tabla legada saved_posts si existe (reemplazada por saved_items) ──
        await dataSource.query(`DROP TABLE IF EXISTS "saved_posts";`);

        // ── Paso 8: Ahora sí ejecutar synchronize con FK garantizados ─────
        await dataSource.synchronize();

        return dataSource;
      },
    }),

    // 3. Configuración de GraphQL (Code-First)
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'), // Autogenera el archivo del schema
      playground: false, // Desactivamos el playground antiguo
      plugins: [ApolloServerPluginLandingPageLocalDefault()], // Activamos Apollo Studio Sandbox
      subscriptions: {
        'graphql-ws': {
          onConnect: (context: any) => {
            const { connectionParams, extra } = context;
            const authToken = connectionParams?.Authorization || connectionParams?.authorization;
            const xCityId = connectionParams?.['x-city-id'];

            extra.request = { headers: {} };

            if (authToken) {
              extra.request.headers.authorization = authToken;
            }
            if (xCityId) {
              extra.request.headers['x-city-id'] = xCityId;
            }
          },
        },
      },
      // Expone el mensaje real de las HTTP exceptions (ConflictException, etc.) al cliente
      formatError: (error: GraphQLError) => {
        const originalError = error.extensions?.originalError as any;
        return {
          message: originalError?.message ?? error.message,
          extensions: {
            code: error.extensions?.code,
            statusCode: originalError?.statusCode,
          },
        };
      },
    }),

    // 4. Módulos de nuestra aplicación
    HealthModule,
    AuthModule,
    PostsModule,
    UsersModule,
    CommentsModule,
    ChatModule,
    FollowsModule,
    StorageModule,
    StoriesModule,
    JobsModule,
    FeedModule,
    StoreModule,
    ReportsModule,
    NotificationsModule,
    AppealsModule,
    UserBlocksModule,
    AdsModule,
    AdvertisersModule,
    CitiesModule,
  ],
  controllers: [],
  providers: [GqlAuthGuard],
})
export class AppModule { }
