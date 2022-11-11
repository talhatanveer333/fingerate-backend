import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({
  name: 'verified_emails',
})
export class VerifiedEmail {
  @PrimaryGeneratedColumn('uuid')
  uuid: string;

  @Column({ nullable: true })
  email: string;

  @Column({ default: false })
  verified: boolean;

  @Column({ nullable: true })
  otp: string;
}
