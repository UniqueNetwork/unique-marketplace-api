import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('settings', { schema: 'public' })
export class SettingsEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { name: 'name', length: 128, primary: true })
  name: string;

  @Column('varchar', { name: 'property' })
  property: string;
}
