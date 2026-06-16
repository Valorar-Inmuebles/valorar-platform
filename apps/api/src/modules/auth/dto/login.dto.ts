import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ type: String, example: 'admin@demo.valorar.dev' })
  @IsEmail()
  email: string;

  @ApiProperty({ type: String, minLength: 8, example: 'ValorarDev2026!' })
  @IsString()
  @MinLength(8)
  password: string;
}
