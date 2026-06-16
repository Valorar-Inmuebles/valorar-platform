import crypto from 'crypto';
const algorithm = 'aes-256-gcm';

if (process.env.ANSES_ENCRYPTION_KEY?.length !== 64)  {
  throw new Error("La clave de encriptación debe tener 64 caracteres hexadecimales.");
}

const key = Buffer.from(process.env.ANSES_ENCRYPTION_KEY ?? '', 'hex');

export function encrypt(text: string) : { encrypted: string; iv: string; authTag: string } {

  const iv =
    crypto.randomBytes(16);

  const cipher =
    crypto.createCipheriv(
      algorithm,
      key,
      iv
    );

  let encrypted =
    cipher.update(text, 'utf8', 'hex');

  encrypted +=
    cipher.final('hex');

  const authTag =
    cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

export function decrypt(encryptedData: { encrypted: string; iv: string; authTag: string }) : string {

    const decipher =
      crypto.createDecipheriv(
        algorithm,
        key,
        Buffer.from(encryptedData.iv, 'hex')
      );
  
    decipher.setAuthTag(
      Buffer.from(
        encryptedData.authTag,
        'hex'
      )
    );
  
    let decrypted =
      decipher.update(
        encryptedData.encrypted,
        'hex',
        'utf8'
      );
  
    decrypted +=
      decipher.final('utf8');
  
    return decrypted;
  }