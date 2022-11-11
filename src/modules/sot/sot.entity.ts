import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { Point } from 'geojson';

@Entity({
  name: 'sots',
})
export class Sot {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  grade: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  uniqueId: string;

  @Column({
    nullable: true,
    type: 'double precision',
  })
  longitude: number;

  @Column({
    nullable: true,
    type: 'double precision',
  })
  latitude: number;

  @Column({
    type: 'geography',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  location: Point;

  @Column({ nullable: true })
  owner: string;

  @Column()
  createdAt: number;
}
