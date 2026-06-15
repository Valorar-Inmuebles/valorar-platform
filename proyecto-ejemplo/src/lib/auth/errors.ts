export const AUTH_LOGIN_ERROR_NOT_ENABLED = "no-habilitado";

export class UsuarioNoHabilitadoError extends Error {
  constructor() {
    super("Usuario no registrado en sistema");
    this.name = "UsuarioNoHabilitadoError";
  }
}
