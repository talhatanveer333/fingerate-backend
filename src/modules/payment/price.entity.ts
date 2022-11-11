import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({
  name: 'prices',
})
export class Price {
  @PrimaryColumn({ type: 'varchar' })
  key: string;

  @Column({
    type: 'double precision',
  })
  price: number;
}