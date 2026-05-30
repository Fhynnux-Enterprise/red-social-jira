import { Resolver, Query } from '@nestjs/graphql';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { City } from './entities/city.entity';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';

@Resolver(() => City)
export class CitiesResolver {
    constructor(
        @InjectRepository(City)
        private readonly cityRepository: Repository<City>,
    ) {}

    @Query(() => [City], { name: 'getCities' })
    @UseGuards(GqlAuthGuard)
    async getCities(): Promise<City[]> {
        return this.cityRepository.find({
            where: { isActive: true },
            order: { name: 'ASC' },
        });
    }
}
