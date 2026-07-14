import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ type: String, required: true, trim: true })
  fullName: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  phone: string;

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true })
  password: string;

  @Prop({ type: String, default: 'admin', enum: ['admin', 'manager'] })
  role: string;

  @Prop({ type: String, default: '' })
  avatarUrl: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
