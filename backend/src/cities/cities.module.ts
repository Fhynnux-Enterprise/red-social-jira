import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { CitiesSeeder } from './cities.seeder';

@Module({
    imports: [TypeOrmModule.forFeature([City])],
    providers: [CitiesSeeder],
    exports: [TypeOrmModule],
})
export class CitiesModule {}
