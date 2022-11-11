import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
@Entity({
  name: 'sot_block',
})
export class SotBlock {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column()
  keyName: string;

  @Column({
    type: 'bigint',
  })
  blockNumber: number;
}
