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

        // ── Paso 3: Eliminar tabla legada saved_posts si existe (reemplazada por saved_items) ──
        await dataSource.query(`DROP TABLE IF EXISTS "saved_posts";`);

        // ── Paso 4: Ahora sí ejecutar synchronize con FK garantizados ─────
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
