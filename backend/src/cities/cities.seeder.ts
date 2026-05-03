import { Injectable, Logger } from '@nestjs/common';

/**
 * La semilla de ciudades ahora se maneja en el dataSourceFactory de app.module.ts
 * para garantizar que los registros existan ANTES de que TypeORM cree los FK constraints.
 * Este seeder se conserva como punto de extensión para futuras ciudades dinámicas.
 */
@Injectable()
export class CitiesSeeder {
    private readonly logger = new Logger(CitiesSeeder.name);
}
